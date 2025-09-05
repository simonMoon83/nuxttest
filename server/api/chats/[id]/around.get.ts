import sql from 'mssql'
import { getCurrentUserId } from '../../../utils/auth'
import { getDbConnection } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const userId = getCurrentUserId(event)
  const chatIdRaw = getRouterParam(event, 'id') || ''
  const chatId = Number(chatIdRaw)
  if (!chatId || !Number.isFinite(chatId)) {
    throw createError({ statusCode: 400, message: '잘못된 chat id' })
  }

  const q = getQuery(event)
  const rawMid = Number(q.messageId || 0)
  const messageId = Number.isFinite(rawMid) ? rawMid : 0
  if (!(messageId > 0 && messageId <= 2147483647)) {
    throw createError({ statusCode: 400, message: '유효한 messageId 필요' })
  }
  const before = Math.min(Math.max(Number(q.before || 50), 0), 200)
  const after = Math.min(Math.max(Number(q.after || 50), 0), 200)

  const connection = await getDbConnection()

  // 권한: 멤버인지 확인
  const mem = await connection.request()
    .input('chat_id', sql.Int, chatId)
    .input('user_id', sql.Int, userId)
    .query(`SELECT COUNT(1) as cnt FROM chat_members WHERE chat_id=@chat_id AND user_id=@user_id`)
  if (!mem.recordset[0].cnt) {
    throw createError({ statusCode: 403, message: '권한 없음' })
  }

  // 기준 메시지가 같은 채팅인지 확인
  const exists = await connection.request()
    .input('chat_id', sql.Int, chatId)
    .input('mid', sql.Int, messageId)
    .query(`SELECT COUNT(1) AS cnt FROM chat_messages WHERE id=@mid AND chat_id=@chat_id`)
  if (!exists.recordset[0].cnt) {
    throw createError({ statusCode: 404, message: '메시지를 찾을 수 없습니다' })
  }

  // before: id <= messageId, 최근 것부터 상위 N개
  // after: id > messageId, 오래된 것부터 상위 N개
  const res = await connection.request()
    .input('chat_id', sql.Int, chatId)
    .input('mid', sql.Int, messageId)
    .query(`
      WITH before_msgs AS (
        SELECT TOP (${before}) m.id, m.chat_id, m.sender_id,
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
        WHERE m.chat_id=@chat_id AND m.id <= @mid
        ORDER BY m.id DESC
      ),
      after_msgs AS (
        SELECT TOP (${after}) m.id, m.chat_id, m.sender_id,
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
        WHERE m.chat_id=@chat_id AND m.id > @mid
        ORDER BY m.id ASC
      )
      SELECT * FROM (
        SELECT * FROM before_msgs
        UNION ALL
        SELECT * FROM after_msgs
      ) AS T
      ORDER BY id ASC
    `)

  const ids = res.recordset.map(r => r.id)
  let attachments: any[] = []
  if (ids.length) {
    const tvp = ids.map(id => `(${Number(id)})`).join(',')
    const attRes = await connection.request().query(`
      SELECT a.id, a.message_id, a.file_name, a.file_path, a.mime_type, a.size
      FROM chat_attachments a
      WHERE a.message_id IN (${tvp})
      ORDER BY a.id ASC
    `)
    attachments = attRes.recordset
  }

  const grouped: Record<number, any[]> = {}
  for (const a of attachments) {
    const arr = grouped[a.message_id] || (grouped[a.message_id] = [])
    arr.push(a)
  }

  const data = res.recordset.map((m: any) => ({ ...m, attachments: grouped[m.id] || [] }))
  return { success: true, data }
})
