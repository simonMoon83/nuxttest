import sql from 'mssql'
import { getDbConnection } from '../../../utils/db'
import { getCurrentUserId } from '../../../utils/auth'
import { emitToUsers } from '../../../utils/chatBus'

export default defineEventHandler(async (event) => {
  const inviterId = getCurrentUserId(event)
  const chatId = Number(getRouterParam(event, 'id') || 0)
  if (!chatId) throw createError({ statusCode: 400, statusMessage: '잘못된 chat id' })

  const body = await readBody(event) as { userIds?: number[]; departmentId?: number | null; includeSub?: boolean }
  let userIds = Array.isArray(body?.userIds) ? (body!.userIds as any[]).map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0) : []
  userIds = Array.from(new Set(userIds))
  const departmentId = (body?.departmentId != null && body.departmentId !== '') ? Number(body.departmentId) : null
  const includeSub = !!body?.includeSub

  const connection = await getDbConnection()

  // If department specified, collect users in department (and optionally sub-departments)
  if (departmentId != null) {
    if (includeSub) {
      const deptUsers = await connection.request()
        .input('dept_id', sql.Int, departmentId)
        .query(`
          WITH subdepts AS (
            SELECT id FROM departments WHERE id = @dept_id
            UNION ALL
            SELECT d.id FROM departments d
            JOIN subdepts sd ON sd.id = d.parent_id
          )
          SELECT u.id AS user_id
          FROM app_users u
          WHERE u.is_active = 1 AND u.department_id IN (SELECT id FROM subdepts)
        `)
      const deptIds = (deptUsers as any).recordset.map((r: any) => Number(r.user_id)).filter(Boolean)
      userIds = Array.from(new Set([...userIds, ...deptIds]))
    } else {
      const deptUsers = await connection.request()
        .input('dept_id', sql.Int, departmentId)
        .query(`SELECT id AS user_id FROM app_users WHERE is_active = 1 AND department_id = @dept_id`)
      const deptIds = (deptUsers as any).recordset.map((r: any) => Number(r.user_id)).filter(Boolean)
      userIds = Array.from(new Set([...userIds, ...deptIds]))
    }
  }

  if (!userIds.length) return { success: true, added: 0 }

  // 권한 체크: 초대자는 멤버여야 함
  const mem = await connection.request()
    .input('chat_id', sql.Int, chatId)
    .input('user_id', sql.Int, inviterId)
    .query(`SELECT COUNT(1) as cnt FROM chat_members WHERE chat_id=@chat_id AND user_id=@user_id`)
  if (!mem.recordset[0].cnt) throw createError({ statusCode: 403, statusMessage: '권한 없음' })

  // 기존 멤버 조회
  const existing = await connection.request()
    .input('chat_id', sql.Int, chatId)
    .query(`SELECT user_id FROM chat_members WHERE chat_id=@chat_id`)
  const existingIds: number[] = existing.recordset.map((r: any) => r.user_id)

  const toAdd = userIds.filter((id) => !existingIds.includes(id))
  if (!toAdd.length) return { success: true, added: 0 }

  const tx = new sql.Transaction(connection)
  await tx.begin()
  try {
    // 필요 시 그룹 플래그 설정
    await new sql.Request(tx)
      .input('chat_id', sql.Int, chatId)
      .query(`UPDATE chats SET is_group = 1 WHERE id=@chat_id AND (is_group = 0 OR is_group IS NULL)`)

    for (const uid of toAdd) {
      await new sql.Request(tx)
        .input('chat_id', sql.Int, chatId)
        .input('user_id', sql.Int, uid)
        .query(`INSERT INTO chat_members(chat_id, user_id, last_read_message_id, last_read_at) VALUES(@chat_id, @user_id, NULL, NULL)`)
    }

    await new sql.Request(tx)
      .input('chat_id', sql.Int, chatId)
      .query(`UPDATE chats SET updated_at = GETDATE() WHERE id=@chat_id`)

    await tx.commit()
  } catch (e) {
    await tx.rollback()
    throw e
  }

  // 이름 조회
  const inviterNameRs = await connection.request()
    .input('uid', sql.Int, inviterId)
    .query(`SELECT COALESCE(NULLIF(LTRIM(RTRIM(full_name)), ''), username) AS name FROM app_users WHERE id=@uid`)
  const inviterName = inviterNameRs.recordset?.[0]?.name || '사용자'

  const invitedNames: string[] = []
  for (const uid of toAdd) {
    const rs = await connection.request()
      .input('uid', sql.Int, uid)
      .query(`SELECT COALESCE(NULLIF(LTRIM(RTRIM(full_name)), ''), username) AS name FROM app_users WHERE id=@uid`)
    invitedNames.push(rs.recordset?.[0]?.name || String(uid))
  }

  const notifyRs = await connection.request()
    .input('chat_id', sql.Int, chatId)
    .query(`SELECT user_id FROM chat_members WHERE chat_id=@chat_id`)
  const notifyIds: number[] = notifyRs.recordset.map((r: any) => r.user_id)

  try {
    emitToUsers(notifyIds, { type: 'conversation', data: { chat_id: chatId, action: 'invited', inviter_id: inviterId, inviter_name: inviterName, invited_user_ids: toAdd, invited_user_names: invitedNames } })
  } catch {}

  return { success: true, added: toAdd.length }
})


