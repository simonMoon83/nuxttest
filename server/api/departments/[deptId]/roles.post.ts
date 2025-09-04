import { getDbConnection } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const deptId = Number(getRouterParam(event, 'deptId'))
  const { role_id } = await readBody(event)
  const db = await getDbConnection()
  await db.request().query(`
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='department_role_assignments')
      CREATE TABLE department_role_assignments (id INT IDENTITY(1,1) PRIMARY KEY, department_id INT NOT NULL, role_id INT NOT NULL, assigned_at DATETIME2 DEFAULT GETDATE(), assigned_by INT NULL, UNIQUE(department_id, role_id))
  `)
  await db.request().input('deptId', deptId).input('roleId', role_id).query(`
    IF NOT EXISTS (SELECT 1 FROM department_role_assignments WHERE department_id=@deptId AND role_id=@roleId)
      INSERT INTO department_role_assignments (department_id, role_id) VALUES (@deptId, @roleId)
  `)
  return { success: true }
})


