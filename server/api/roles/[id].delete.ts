import { getDbConnection } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const db = await getDbConnection()
  await db.request().query(`
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='user_role_assignments')
      CREATE TABLE user_role_assignments (id INT IDENTITY(1,1) PRIMARY KEY, user_id INT NOT NULL, role_id INT NOT NULL, assigned_at DATETIME2 DEFAULT GETDATE(), assigned_by INT NULL, UNIQUE(user_id, role_id))
  `)
  await db.request().query(`
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='department_role_assignments')
      CREATE TABLE department_role_assignments (id INT IDENTITY(1,1) PRIMARY KEY, department_id INT NOT NULL, role_id INT NOT NULL, assigned_at DATETIME2 DEFAULT GETDATE(), assigned_by INT NULL, UNIQUE(department_id, role_id))
  `)
  await db.request().input('id', id).query(`
    DELETE FROM user_role_assignments WHERE role_id=@id;
    DELETE FROM department_role_assignments WHERE role_id=@id;
    DELETE FROM user_roles WHERE id=@id;
  `)
  return { success: true }
})


