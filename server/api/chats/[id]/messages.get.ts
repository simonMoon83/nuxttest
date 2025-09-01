import sql from 'mssql'
import { getDbConnection } from '../../../utils/db'
import { getCurrentUserId } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const userId = getCurrentUserId(event)
  const chatIdRaw = getRouterParam(event, 'id') || ''
  const chatId = Number(chatIdRaw)
  if (!chatId || !Number.isFinite(chatId)) {
    throw createError({ statusCode: 400, statusMessage: '잘못된 chat id' })
  }

  const q = getQuery(event)
  const days = Math.min(Number(q.days || 7), 30) // safety cap

  const connection = await getDbConnection()

  // 권한: 멤버인지 확인
  const mem = await connection.request()
    .input('chat_id', sql.Int, chatId)
    .input('user_id', sql.Int, userId)
    .query(`SELECT COUNT(1) as cnt FROM chat_members WHERE chat_id=@chat_id AND user_id=@user_id`)
  if (!mem.recordset[0].cnt) throw createError({ statusCode: 403, statusMessage: '권한 없음' })

  const messages = await connection.request()
    .input('chat_id', sql.Int, chatId)
    .input('days', sql.Int, days)
    .query(`
      SELECT m.id, m.chat_id, m.sender_id, m.content, m.created_at
      FROM chat_messages m
      WHERE m.chat_id = @chat_id
        AND m.created_at >= DATEADD(day, -@days, GETDATE())
      ORDER BY m.created_at ASC, m.id ASC
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
