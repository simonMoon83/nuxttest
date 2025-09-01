import sql from 'mssql'
import { getDbConnection } from '../../../utils/db'
import { getCurrentUserId } from '../../../utils/auth'
import { emitToUsers } from '../../../utils/chatBus'

export default defineEventHandler( async (event) => {
  const senderId = getCurrentUserId(event)
  const chatId = Number(getRouterParam(event, 'id') || 0)
  if (!chatId) throw createError({ statusCode: 400, statusMessage: '잘못된 chat id' })
  const body = await readBody(event) as { content?: string }
  const content = (body?.content || '').toString().slice(0, 2000)

  const connection = await getDbConnection()

  // 권한 체크
  const mem = await connection.request()
    .input('chat_id', sql.Int, chatId)
    .input('user_id', sql.Int, senderId)
    .query(`SELECT COUNT(1) as cnt FROM chat_members WHERE chat_id=@chat_id AND user_id=@user_id`)
  if (!mem.recordset[0].cnt) throw createError({ statusCode: 403, statusMessage: '권한 없음' })

  const tx = new sql.Transaction(connection)
  await tx.begin()
  try {
    const res = await new sql.Request(tx)
      .input('chat_id', sql.Int, chatId)
      .input('sender_id', sql.Int, senderId)
      .input('content', sql.NVarChar(2000), content || null)
      .query(`
        INSERT INTO chat_messages(chat_id, sender_id, content)
        OUTPUT INSERTED.*
        VALUES(@chat_id, @sender_id, @content)
      `)
    const message = res.recordset[0]
    // Resolve sender_name
    const nameRes = await new sql.Request(tx)
      .input('uid', sql.Int, senderId)
      .query(`SELECT COALESCE(NULLIF(LTRIM(RTRIM(full_name)), ''), username) AS name FROM app_users WHERE id=@uid`)
    const sender_name = nameRes.recordset?.[0]?.name || null

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

    // 수신자 식별 및 SSE 전송
    const members = await connection.request()
      .input('chat_id', sql.Int, chatId)
      .query(`SELECT user_id FROM chat_members WHERE chat_id=@chat_id`)
    const userIds = members.recordset.map((r: any) => r.user_id as number)

    emitToUsers(userIds, { type: 'message', data: { chat_id: chatId, message: { ...message, sender_name } } })

    return { success: true, data: { message: { ...message, sender_name } } }
  } catch (e) {
    await tx.rollback()
    throw e
  }
})
