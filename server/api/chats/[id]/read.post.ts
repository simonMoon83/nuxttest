import sql from 'mssql'
import { getDbConnection } from '../../../utils/db'
import { getCurrentUserId } from '../../../utils/auth'
import { emitToUsers } from '../../../utils/chatBus'

export default defineEventHandler(async (event) => {
  const userId = getCurrentUserId(event)
  const chatId = Number(getRouterParam(event, 'id') || 0)
  if (!chatId) throw createError({ statusCode: 400, statusMessage: '잘못된 chat id' })
  const body = await readBody(event) as { lastMessageId?: number }
  const lastId = Number(body?.lastMessageId || 0)

  const connection = await getDbConnection()

  // 멤버 확인
  const mem = await connection.request()
    .input('chat_id', sql.Int, chatId)
    .input('user_id', sql.Int, userId)
    .query(`SELECT COUNT(1) as cnt FROM chat_members WHERE chat_id=@chat_id AND user_id=@user_id`)
  if (!mem.recordset[0].cnt) throw createError({ statusCode: 403, statusMessage: '권한 없음' })

  await connection.request()
    .input('chat_id', sql.Int, chatId)
    .input('user_id', sql.Int, userId)
    .input('mid', sql.Int, lastId || null)
    .query(`
      UPDATE chat_members
      SET last_read_message_id = CASE WHEN @mid IS NULL OR @mid = 0 THEN last_read_message_id ELSE @mid END,
          last_read_at = GETDATE()
      WHERE chat_id=@chat_id AND user_id=@user_id
    `)

  // 다른 멤버에게 읽음 이벤트 전송
  const members = await connection.request()
    .input('chat_id', sql.Int, chatId)
    .query(`SELECT user_id FROM chat_members WHERE chat_id=@chat_id`)
  const userIds = members.recordset.map((r: any) => r.user_id as number)

  emitToUsers(userIds, { type: 'read', data: { chat_id: chatId, user_id: userId, last_message_id: lastId || null } })

  return { success: true }
})
