import { getDbConnection } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const db = await getDbConnection()
  await db.request().query(`
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='role_permissions')
      CREATE TABLE role_permissions (
        id INT IDENTITY(1,1) PRIMARY KEY,
        role_id INT NOT NULL,
        resource NVARCHAR(200) NOT NULL,
        action NVARCHAR(10) NOT NULL,
        CONSTRAINT FK_role_permissions_roles FOREIGN KEY (role_id) REFERENCES user_roles(id),
        CONSTRAINT CK_role_permissions_action CHECK (action IN ('read','write')),
        CONSTRAINT UQ_role_permissions UNIQUE (role_id, resource)
      )
  `)
  await db.request().query(`
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='user_roles')
      CREATE TABLE user_roles (
        id INT IDENTITY(1,1) PRIMARY KEY,
        role_name NVARCHAR(50) UNIQUE NOT NULL,
        role_description NVARCHAR(255),
        permissions NVARCHAR(MAX),
        is_active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
      )
  `)
  const r = await db.request()
    .input('role_name', body.role_name)
    .input('role_description', body.role_description ?? null)
    .input('permissions', JSON.stringify(body.permissions ?? {}))
    .input('is_active', body.is_active ?? 1)
    .query(`
      INSERT INTO user_roles (role_name, role_description, permissions, is_active)
      OUTPUT INSERTED.*
      VALUES (@role_name, @role_description, @permissions, @is_active)
    `)
  const row = r.recordset[0]
  row.permissions = JSON.parse(row.permissions || '{}')

  // sync normalized table
  const newId = row.id
  const perms = row.permissions as Record<string, 'read' | 'write'>
  for (const [resource, action] of Object.entries(perms)) {
    if (action !== 'read' && action !== 'write') continue
    await db.request()
      .input('rid', newId)
      .input('resource', resource)
      .input('action', action)
      .query(`INSERT INTO role_permissions (role_id, resource, action) VALUES (@rid, @resource, @action)`) 
  }
  return { success: true, data: row }
})


