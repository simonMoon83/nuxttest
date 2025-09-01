import sql from 'mssql'
import { getDbConnection } from '../../utils/db'
import { getCurrentUserId } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const me = getCurrentUserId(event)
  const body = await readBody(event) as { targetUserId?: number }
  const other = Number(body?.targetUserId || 0)
  if (!other || !Number.isFinite(other) || other <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'targetUserId가 필요합니다.' })
  }
  if (other === me) {
    throw createError({ statusCode: 400, statusMessage: '본인에게는 채팅을 시작할 수 없습니다.' })
  }
  const connection = await getDbConnection()

  // 기존 1:1 채팅 유무 확인
  const existing = await connection.request()
    .input('me', sql.Int, me)
    .input('other', sql.Int, other)
    .query(`
      SELECT TOP 1 c.id
      FROM chats c
      JOIN chat_members a ON a.chat_id = c.id AND a.user_id = @me
      JOIN chat_members b ON b.chat_id = c.id AND b.user_id = @other
      WHERE c.is_group = 0
      ORDER BY c.id
    `)
  if (existing.recordset.length) {
    return { success: true, chatId: existing.recordset[0].id }
  }

  // 생성
  const tx = new sql.Transaction(connection)
  await tx.begin()
  try {
    const createdChat = await new sql.Request(tx)
      .query(`
        INSERT INTO chats(is_group, title)
        OUTPUT INSERTED.id
        VALUES(0, NULL)
      `)
    const chatId = createdChat.recordset[0].id as number

    await new sql.Request(tx)
      .input('chat_id', sql.Int, chatId)
      .input('user_id', sql.Int, me)
      .query(`INSERT INTO chat_members(chat_id, user_id) VALUES(@chat_id, @user_id)`)
    await new sql.Request(tx)
      .input('chat_id', sql.Int, chatId)
      .input('user_id', sql.Int, other)
      .query(`INSERT INTO chat_members(chat_id, user_id) VALUES(@chat_id, @user_id)`)

    await tx.commit()
    return { success: true, chatId }
  } catch (e) {
    await tx.rollback()
    throw e
  }
})
