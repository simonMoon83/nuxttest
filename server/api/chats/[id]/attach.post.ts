import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import sql from 'mssql'
import formidable from 'formidable'
import { getDbConnection } from '../../../utils/db'
import { getCurrentUserId } from '../../../utils/auth'
import { ensureUploadsDir } from '../../../utils/uploads'
import { emitToUsers } from '../../../utils/chatBus'

export default defineEventHandler(async (event) => {
  // 업로드 제한 설정 (서버 측 검증) - nuxt runtimeConfig에서 단일 소스로 로드
  const cfg = useRuntimeConfig()
  const maxMb = Number(cfg.chatUpload?.maxFileMb || cfg.public?.chatUpload?.maxFileMb || 150)
  const allowedExts = (cfg.chatUpload?.allowedExts || cfg.public?.chatUpload?.allowedExts || []) as string[]
  const MAX_FILE_SIZE_BYTES = maxMb * 1024 * 1024 // 개별 파일 MB 제한
  const senderId = getCurrentUserId(event)
  const chatId = Number(getRouterParam(event, 'id') || 0)
  if (!chatId) throw createError({ statusCode: 400, message: '잘못된 chat id' })

  // formidable을 사용한 대용량 파일 파싱
  const form = formidable({
    maxFileSize: MAX_FILE_SIZE_BYTES,
    maxTotalFileSize: MAX_FILE_SIZE_BYTES * 10, // 전체 요청 크기 제한
    allowEmptyFiles: false,
    keepExtensions: true,
  })

  let fields: formidable.Fields
  let files: formidable.Files
  
  try {
    [fields, files] = await form.parse(event.node.req)
  } catch (error: any) {
    if (error.code === 'LIMIT_FILE_SIZE' || error.message?.includes('maxFileSize')) {
      throw createError({ statusCode: 413, message: `파일이 너무 큽니다. 최대 ${maxMb}MB 까지 허용됩니다.` })
    }
    throw createError({ statusCode: 400, message: '파일 업로드 오류: ' + error.message })
  }

  const connection = await getDbConnection()

  // 권한 체크
  const mem = await connection.request()
    .input('chat_id', sql.Int, chatId)
    .input('user_id', sql.Int, senderId)
    .query(`SELECT COUNT(1) as cnt FROM chat_members WHERE chat_id=@chat_id AND user_id=@user_id`)
  if (!mem.recordset[0].cnt) throw createError({ statusCode: 403, message: '권한 없음' })

  const uploadDir = await ensureUploadsDir()

  // text content(optional) + files
  const content = fields.content?.[0]?.toString()?.slice(0, 2000) || null
  const fileList: Array<{ filename: string, data: Buffer, mimetype?: string, size: number }> = []

  // formidable files 처리
  for (const [fieldName, fileArray] of Object.entries(files)) {
    if (!Array.isArray(fileArray)) continue
    
    for (const file of fileArray) {
      if (!file.filepath || !file.originalFilename) continue
      
      // 파일 크기 재검증
      if (file.size > MAX_FILE_SIZE_BYTES) {
        throw createError({ statusCode: 413, message: `파일이 너무 큽니다. 최대 ${maxMb}MB 까지 허용됩니다.` })
      }

      // 확장자 검증
      const fname = file.originalFilename
      const lower = fname.toLowerCase()
      const ext = lower.includes('.') ? lower.slice(lower.lastIndexOf('.')) : ''
      if (allowedExts.length && ext && !allowedExts.includes(ext)) {
        throw createError({ statusCode: 415, message: `허용되지 않는 파일 형식입니다. (${ext})` })
      }

      // 임시 파일에서 데이터 읽기
      const data = await fs.readFile(file.filepath)
      fileList.push({ 
        filename: fname, 
        data, 
        mimetype: file.mimetype || undefined,
        size: file.size 
      })
    }
  }

  if (!fileList.length) {
    throw createError({ statusCode: 400, message: '업로드할 파일이 없습니다.' })
  }

  const tx = new sql.Transaction(connection)
  await tx.begin()
  try {
    const msgRes = await new sql.Request(tx)
      .input('chat_id', sql.Int, chatId)
      .input('sender_id', sql.Int, senderId)
      .input('content', sql.NVarChar(2000), content)
      .query(`
        INSERT INTO chat_messages(chat_id, sender_id, content)
        OUTPUT INSERTED.*
        VALUES(@chat_id, @sender_id, @content)
      `)
    const message = msgRes.recordset[0]
    
    // Resolve sender_name
    const nameRes = await new sql.Request(tx)
      .input('uid', sql.Int, senderId)
      .query(`SELECT COALESCE(NULLIF(LTRIM(RTRIM(full_name)), ''), username) AS name FROM app_users WHERE id=@uid`)
    const sender_name = nameRes.recordset?.[0]?.name || null

    const atts: any[] = []
    for (const f of fileList) {
      const ext = (f.filename.includes('.') ? f.filename.substring(f.filename.lastIndexOf('.')) : '')
      const unique = `chat-${randomUUID()}${ext}`
      const absPath = join(uploadDir, unique)
      await fs.writeFile(absPath, f.data)
      const webPath = `/uploads/${unique}`

      const attRes = await new sql.Request(tx)
        .input('message_id', sql.Int, message.id)
        .input('file_name', sql.NVarChar(255), f.filename)
        .input('file_path', sql.NVarChar(400), webPath)
        .input('mime_type', sql.NVarChar(200), f.mimetype || null)
        .input('size', sql.Int, f.size)
        .query(`
          INSERT INTO chat_attachments(message_id, file_name, file_path, mime_type, size)
          OUTPUT INSERTED.*
          VALUES(@message_id, @file_name, @file_path, @mime_type, @size)
        `)
      atts.push(attRes.recordset[0])
    }

    await new sql.Request(tx)
      .input('chat_id', sql.Int, chatId)
      .query(`UPDATE chats SET updated_at = GETDATE() WHERE id=@chat_id`)

    await new sql.Request(tx)
      .input('chat_id', sql.Int, chatId)
      .input('user_id', sql.Int, senderId)
      .input('mid', sql.Int, message.id)
      .query(`
        UPDATE chat_members
        SET last_read_message_id = @mid, last_read_at = GETDATE()
        WHERE chat_id=@chat_id AND user_id=@user_id
      `)

    await tx.commit()

    const members = await connection.request()
      .input('chat_id', sql.Int, chatId)
      .query(`SELECT user_id FROM chat_members WHERE chat_id=@chat_id`)
    const userIds = members.recordset.map((r: any) => r.user_id as number)

    emitToUsers(userIds, { type: 'message', data: { chat_id: chatId, message: { ...message, sender_name, attachments: atts } } })

    return { success: true, data: { message: { ...message, sender_name, attachments: atts } } }
  } catch (e) {
    await tx.rollback()
    throw e
  }
})