import sql from 'mssql'
import { getDbConnection } from '../../../utils/db'
import { getCurrentUserId } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const userId = getCurrentUserId(event)
  const idParam = getRouterParam(event, 'id')
  const chatId = Number(idParam)
  if (!Number.isFinite(chatId) || chatId <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid chat id' })
  }

  const connection = await getDbConnection()

  // Ensure requester is a member of the chat
  const memCheck = await connection.request()
    .input('chat_id', sql.Int, chatId)
    .input('user_id', sql.Int, userId)
    .query(`SELECT COUNT(1) AS cnt FROM chat_members WHERE chat_id = @chat_id AND user_id = @user_id`)
  const cnt = (memCheck as any).recordset?.[0]?.cnt ?? 0
  if (!cnt) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const rs = await connection.request()
    .input('chat_id', sql.Int, chatId)
    .input('me', sql.Int, userId)
    .query(`
      SELECT 
        u.id,
        u.username,
        COALESCE(NULLIF(LTRIM(RTRIM(u.full_name)), ''), u.username) AS name,
        u.full_name,
        u.is_active
      FROM chat_members cm
      JOIN app_users u ON u.id = cm.user_id
      WHERE cm.chat_id = @chat_id
      ORDER BY CASE WHEN u.id = @me THEN 0 ELSE 1 END,
               COALESCE(NULLIF(LTRIM(RTRIM(u.full_name)), ''), u.username) ASC
    `)

  return { success: true, data: (rs as any).recordset }
})
