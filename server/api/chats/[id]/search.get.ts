import sql from 'mssql'
import { getDbConnection } from '../../../utils/db'
import { getCurrentUserId } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const userId = getCurrentUserId(event)
  const chatIdRaw = getRouterParam(event, 'id') || ''
  const chatId = Number(chatIdRaw)
  if (!chatId || !Number.isFinite(chatId)) {
    throw createError({ statusCode: 400, message: '잘못된 chat id' })
  }

  const q = getQuery(event)
  const term = String(q.q || '').trim()
  if (!term) {
    throw createError({ statusCode: 400, message: 'q 파라미터가 필요합니다' })
  }
  const limit = Math.min(Math.max(Number(q.limit || 50), 1), 200)
  const offset = Math.max(Number(q.offset || 0), 0)

  const connection = await getDbConnection()

  // 권한: 멤버인지 확인
  const mem = await connection.request()
    .input('chat_id', sql.Int, chatId)
    .input('user_id', sql.Int, userId)
    .query(`SELECT COUNT(1) as cnt FROM chat_members WHERE chat_id=@chat_id AND user_id=@user_id`)
  if (!mem.recordset[0].cnt) throw createError({ statusCode: 403, message: '권한 없음' })

  const like = `%${term}%`

  // 메시지 검색 (내용 또는 첨부파일 이름)
  const messages = await connection.request()
    .input('chat_id', sql.Int, chatId)
    .input('like', sql.NVarChar, like)
    .query(`
      SELECT m.id, m.chat_id, m.sender_id,
             COALESCE(NULLIF(LTRIM(RTRIM(u.full_name)), ''), u.username) AS sender_name,
             m.content, m.created_at,
             CONVERT(varchar(19), m.created_at, 120) AS created_at_text,
             (
               SELECT COUNT(1)
               FROM chat_members cmr
               WHERE cmr.chat_id = m.chat_id
                 AND cmr.user_id <> m.sender_id
                 AND (cmr.last_read_message_id IS NULL OR cmr.last_read_message_id < m.id)
             ) AS unread_count
      FROM chat_messages m
      JOIN app_users u ON u.id = m.sender_id
      WHERE m.chat_id = @chat_id
        AND (
          (m.content IS NOT NULL AND m.content LIKE @like)
          OR EXISTS (
            SELECT 1 FROM chat_attachments a WHERE a.message_id = m.id AND a.file_name LIKE @like
          )
        )
      ORDER BY m.created_at DESC, m.id DESC
      OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
    `)

  const ids = messages.recordset.map(r => r.id)
  let attachments: any[] = []
  if (ids.length) {
    const tvp = ids
      .map((id) => `(${Number(id)})`)
      .join(',')
    const attRes = await connection.request().query(`
      SELECT a.id, a.message_id, a.file_name, a.file_path, a.mime_type, a.size
      FROM chat_attachments a
      WHERE a.message_id IN (${tvp})
      ORDER BY a.id ASC
    `)
    attachments = attRes.recordset
  }

  // 그룹핑
  const grouped: Record<number, any[]> = {}
  for (const a of attachments) {
    const arr = grouped[a.message_id] || (grouped[a.message_id] = [])
    arr.push(a)
  }

  const data = messages.recordset.map((m: any) => ({ ...m, attachments: grouped[m.id] || [] }))
  return { success: true, data }
})
