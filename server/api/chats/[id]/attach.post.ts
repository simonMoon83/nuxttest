import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import sql from 'mssql'
import { getDbConnection } from '../../../utils/db'
import { getCurrentUserId } from '../../../utils/auth'
import { ensureUploadsDir } from '../../../utils/uploads'
import { emitToUsers } from '../../../utils/chatBus'

export default defineEventHandler(async (event) => {
  const senderId = getCurrentUserId(event)
  const chatId = Number(getRouterParam(event, 'id') || 0)
  if (!chatId) throw createError({ statusCode: 400, statusMessage: '잘못된 chat id' })

  const form = await readMultipartFormData(event)
  if (!form || !form.length) {
    throw createError({ statusCode: 400, statusMessage: '첨부 파일이 필요합니다.' })
  }

  const connection = await getDbConnection()

  // 권한 체크
  const mem = await connection.request()
    .input('chat_id', sql.Int, chatId)
    .input('user_id', sql.Int, senderId)
    .query(`SELECT COUNT(1) as cnt FROM chat_members WHERE chat_id=@chat_id AND user_id=@user_id`)
  if (!mem.recordset[0].cnt) throw createError({ statusCode: 403, statusMessage: '권한 없음' })

  const uploadDir = await ensureUploadsDir()

  // text content(optional) + files
  let content: string | null = null
  const files: Array<{ filename: string, data: Buffer, mimetype?: string, name?: string }> = []
  for (const p of form) {
    // In h3, "type" is the MIME type (e.g., image/png) and files have a "filename"
    if (p.filename) {
      files.push({ filename: p.filename || 'file', data: p.data as Buffer, mimetype: (p as any).type, name: p.name })
    } else if (!p.filename && p.name === 'content') {
      // Field part: content text
      content = (p.data?.toString('utf8') || '').slice(0, 2000)
    }
  }
  if (!files.length) {
    throw createError({ statusCode: 400, statusMessage: '업로드할 파일이 없습니다.' })
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

    const atts: any[] = []
    for (const f of files) {
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
        .input('size', sql.Int, f.data.length)
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

    emitToUsers(userIds, { type: 'message', data: { chat_id: chatId, message: { ...message, attachments: atts } } })

    return { success: true, data: { message: { ...message, attachments: atts } } }
  } catch (e) {
    await tx.rollback()
    throw e
  }
})
