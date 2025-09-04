import { getDbConnection } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const roleId = Number(getRouterParam(event, 'id'))
  const db = await getDbConnection()
  await db.request().query(`
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='user_role_assignments')
      CREATE TABLE user_role_assignments (id INT IDENTITY(1,1) PRIMARY KEY, user_id INT NOT NULL, role_id INT NOT NULL, assigned_at DATETIME2 DEFAULT GETDATE(), assigned_by INT NULL, UNIQUE(user_id, role_id))
  `)
  const r = await db.request().input('roleId', roleId).query(`
    SELECT u.id, u.username, u.full_name, u.department_id, d.name AS department_name
    FROM user_role_assignments a
    JOIN app_users u ON u.id = a.user_id
    LEFT JOIN departments d ON d.id = u.department_id
    WHERE a.role_id = @roleId
    ORDER BY COALESCE(NULLIF(LTRIM(RTRIM(u.full_name)), ''), u.username)
  `)
  return { success: true, data: r.recordset }
})


