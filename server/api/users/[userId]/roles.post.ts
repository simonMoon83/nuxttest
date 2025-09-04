import { getDbConnection } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const userId = Number(getRouterParam(event, 'userId'))
  const { role_id } = await readBody(event)
  const db = await getDbConnection()
  await db.request().query(`
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='user_role_assignments')
      CREATE TABLE user_role_assignments (id INT IDENTITY(1,1) PRIMARY KEY, user_id INT NOT NULL, role_id INT NOT NULL, assigned_at DATETIME2 DEFAULT GETDATE(), assigned_by INT NULL, UNIQUE(user_id, role_id))
  `)
  await db.request().input('userId', userId).input('roleId', role_id).query(`
    IF NOT EXISTS (SELECT 1 FROM user_role_assignments WHERE user_id=@userId AND role_id=@roleId)
      INSERT INTO user_role_assignments (user_id, role_id) VALUES (@userId, @roleId)
  `)
  return { success: true }
})


