import { getDbConnection } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const search = (query.search as string) || ''
    const deptName = (query.dept as string) || ''
    const departmentIdRaw = (query.departmentId as string) || ''
    const departmentId = departmentIdRaw ? Number(departmentIdRaw) : null

    const connection = await getDbConnection()
    const result = await connection.request()
      .input('search', `%${search}%`)
      .input('deptName', `%${deptName}%`)
      .input('departmentId', departmentId)
      .query(`
        SELECT u.id, u.username, u.email, u.full_name, u.is_active, u.created_at, u.updated_at,
               u.department_id, d.name AS department_name
        FROM app_users u
        LEFT JOIN departments d ON d.id = u.department_id
        WHERE ((@search = '%%') OR (u.username LIKE @search OR u.email LIKE @search OR u.full_name LIKE @search))
          AND ((@departmentId IS NULL) OR (u.department_id = @departmentId))
          AND ((@deptName = '%%') OR (d.name LIKE @deptName))
        ORDER BY u.created_at DESC
      `)

    return { success: true, data: result.recordset }
  } catch (error) {
    console.error('사용자 목록 조회 실패:', error)
    throw createError({ statusCode: 500, statusMessage: '사용자 목록을 불러오지 못했습니다.' })
  }
})


