import sql from 'mssql'
import { getDbConnection } from '../../../utils/db'
import { getCurrentUserId } from '../../../utils/auth'
import { emitToUsers } from '../../../utils/chatBus'

export default defineEventHandler(async (event) => {
  const userId = getCurrentUserId(event)
  const chatId = Number(getRouterParam(event, 'id') || 0)
  if (!chatId) throw createError({ statusCode: 400, statusMessage: '잘못된 chat id' })

  const connection = await getDbConnection()

  // 현재 멤버 여부 및 채팅 존재 확인
  const memRs = await connection.request()
    .input('chat_id', sql.Int, chatId)
    .input('user_id', sql.Int, userId)
    .query(`
      SELECT c.is_group
      FROM chat_members cm
      JOIN chats c ON c.id = cm.chat_id
      WHERE cm.chat_id = @chat_id AND cm.user_id = @user_id
    `)

  if (!memRs.recordset.length) {
    // 이미 멤버가 아니면 성공으로 간주
    return { success: true }
  }

  // 남아있는 멤버 목록(알림용) 수집
  const beforeMembers = await connection.request()
    .input('chat_id', sql.Int, chatId)
    .query(`SELECT user_id FROM chat_members WHERE chat_id = @chat_id`)
  const beforeIds: number[] = beforeMembers.recordset.map((r: any) => r.user_id)

  // 떠나는 사용자의 표시 이름 조회
  const nameRs = await connection.request()
    .input('uid', sql.Int, userId)
    .query(`SELECT COALESCE(NULLIF(LTRIM(RTRIM(full_name)), ''), username) AS name FROM app_users WHERE id=@uid`)
  const userName: string = (nameRs as any).recordset?.[0]?.name || '사용자'

  // 나가기 처리
  await connection.request()
    .input('chat_id', sql.Int, chatId)
    .input('user_id', sql.Int, userId)
    .query(`DELETE FROM chat_members WHERE chat_id = @chat_id AND user_id = @user_id`)

  // 남은 멤버에게 목록 갱신 신호 전송 (+ 본인에게도 전달하여 목록 갱신)
  const notifyIds = Array.from(new Set([...beforeIds, userId]))
  try {
    emitToUsers(notifyIds, { type: 'conversation', data: { chat_id: chatId, action: 'left', user_id: userId, user_name: userName } })
  } catch {}

  return { success: true }
})


