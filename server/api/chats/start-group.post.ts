import sql from 'mssql'
import { getDbConnection } from '../../utils/db'
import { getCurrentUserId } from '../../utils/auth'

interface StartGroupBody {
  title?: string | null
  memberUserIds?: number[]
  departmentId?: number | null
  includeSub?: boolean
}

export default defineEventHandler(async (event) => {
  const me = getCurrentUserId(event)
  const body = await readBody(event) as StartGroupBody

  const title = (body?.title || '').toString().trim()
  const memberUserIdsRaw = Array.isArray(body?.memberUserIds) ? body!.memberUserIds! : []
  const departmentId = body?.departmentId ? Number(body.departmentId) : null
  const includeSub = !!body?.includeSub

  const members = new Set<number>()
  // Always include me
  members.add(me)

  // Add explicit members
  for (const id of memberUserIdsRaw) {
    const n = Number(id)
    if (Number.isFinite(n) && n > 0 && n !== me) members.add(n)
  }

  const connection = await getDbConnection()

  // Add department members if provided
  if (departmentId && Number.isFinite(departmentId) && departmentId > 0) {
    if (includeSub) {
      // Include sub-departments using a recursive CTE
      const rs = await connection.request()
        .input('deptId', sql.Int, departmentId)
        .query(`
          WITH dept_tree AS (
            SELECT id FROM departments WHERE id = @deptId
            UNION ALL
            SELECT d.id FROM departments d JOIN dept_tree dt ON d.parent_id = dt.id
          )
          SELECT u.id AS user_id
          FROM app_users u
          WHERE u.is_active = 1 AND u.department_id IN (SELECT id FROM dept_tree)
        `)
      for (const r of rs.recordset as Array<{ user_id: number }>) {
        const uid = Number(r.user_id)
        if (Number.isFinite(uid) && uid > 0 && uid !== me) members.add(uid)
      }
    } else {
      const rs = await connection.request()
        .input('deptId', sql.Int, departmentId)
        .query(`
          SELECT u.id AS user_id
          FROM app_users u
          WHERE u.is_active = 1 AND u.department_id = @deptId
        `)
      for (const r of rs.recordset as Array<{ user_id: number }>) {
        const uid = Number(r.user_id)
        if (Number.isFinite(uid) && uid > 0 && uid !== me) members.add(uid)
      }
    }
  }

  if (members.size < 2) {
    throw createError({ statusCode: 400, statusMessage: '그룹 채팅은 2인 이상이어야 합니다.' })
  }

  const tx = new sql.Transaction(connection)
  await tx.begin()
  try {
    const createdChat = await new sql.Request(tx)
      .input('is_group', sql.Bit, 1)
      .input('title', sql.NVarChar, title || null)
      .query(`
        INSERT INTO chats(is_group, title)
        OUTPUT INSERTED.id
        VALUES(@is_group, @title)
      `)
    const chatId = createdChat.recordset[0].id as number

    // Insert members (new Request per iteration to avoid parameter carryover)
    for (const uid of members) {
      await new sql.Request(tx)
        .input('chat_id', sql.Int, chatId)
        .input('user_id', sql.Int, uid)
        .query('INSERT INTO chat_members(chat_id, user_id) VALUES(@chat_id, @user_id)')
    }

    await tx.commit()
    return { success: true, chatId }
  } catch (e) {
    await tx.rollback()
    throw e
  }
})
