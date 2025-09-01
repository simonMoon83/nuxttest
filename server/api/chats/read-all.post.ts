import sql from 'mssql'
import { getDbConnection } from '../../utils/db'
import { getCurrentUserId } from '../../utils/auth'
import { emitToUsers } from '../../utils/chatBus'

export default defineEventHandler(async (event) => {
  const userId = getCurrentUserId(event)
  const connection = await getDbConnection()

  // Update last_read_message_id to latest message per chat for this user
  await connection.request()
    .input('user_id', sql.Int, userId)
    .query(`
      UPDATE cm
      SET cm.last_read_message_id = x.last_id,
          cm.last_read_at = GETDATE()
      FROM chat_members cm
      JOIN (
        SELECT m.chat_id, MAX(m.id) AS last_id
        FROM chat_messages m
        GROUP BY m.chat_id
      ) x ON x.chat_id = cm.chat_id
      WHERE cm.user_id = @user_id
    `)

  // Fetch per chat last_id for emitting events
  const rows = await connection.request()
    .input('user_id', sql.Int, userId)
    .query(`
      SELECT x.chat_id, x.last_id
      FROM (
        SELECT m.chat_id, MAX(m.id) AS last_id
        FROM chat_messages m
        GROUP BY m.chat_id
      ) x
      JOIN chat_members cm ON cm.chat_id = x.chat_id AND cm.user_id = @user_id
    `)

  const chatLastMap: { chat_id: number, last_id: number }[] = rows.recordset || []
  if (chatLastMap.length) {
    // Get all member ids for impacted chats
    const chatIds = chatLastMap.map(r => r.chat_id).join(',')
    const memRes = await connection.request().query(`
      SELECT chat_id, user_id FROM chat_members WHERE chat_id IN (${chatIds})
    `)
    const membersByChat = new Map<number, number[]>()
    for (const r of memRes.recordset as Array<{ chat_id: number, user_id: number }>) {
      const arr = membersByChat.get(r.chat_id) || []
      arr.push(r.user_id)
      membersByChat.set(r.chat_id, arr)
    }
    // Emit read event per chat with last id
    for (const { chat_id, last_id } of chatLastMap) {
      const users = membersByChat.get(chat_id) || []
      emitToUsers(users, { type: 'read', data: { chat_id, user_id: userId, last_message_id: last_id } })
    }
  }

  return { success: true }
})
