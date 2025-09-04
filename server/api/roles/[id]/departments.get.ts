import { getDbConnection } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const roleId = Number(getRouterParam(event, 'id'))
  const db = await getDbConnection()
  await db.request().query(`
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='department_role_assignments')
      CREATE TABLE department_role_assignments (id INT IDENTITY(1,1) PRIMARY KEY, department_id INT NOT NULL, role_id INT NOT NULL, assigned_at DATETIME2 DEFAULT GETDATE(), assigned_by INT NULL, UNIQUE(department_id, role_id))
  `)
  const r = await db.request().input('roleId', roleId).query(`
    SELECT d.id, d.name
    FROM department_role_assignments a JOIN departments d ON d.id=a.department_id
    WHERE a.role_id=@roleId
    ORDER BY d.name
  `)
  return { success: true, data: r.recordset }
})


