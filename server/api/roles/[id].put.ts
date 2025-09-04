import { getDbConnection } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)
  const db = await getDbConnection()
  // ensure role_permissions table
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
  const r = await db.request()
    .input('id', id)
    .input('role_name', body.role_name)
    .input('role_description', body.role_description ?? null)
    .input('permissions', JSON.stringify(body.permissions ?? {}))
    .input('is_active', body.is_active ?? 1)
    .query(`
      UPDATE user_roles
      SET role_name=@role_name, role_description=@role_description, permissions=@permissions,
          is_active=@is_active, updated_at=GETDATE()
      WHERE id=@id;
      SELECT * FROM user_roles WHERE id=@id
    `)
  const row = r.recordset[0]
  row.permissions = JSON.parse(row.permissions || '{}')

  // sync normalized table with JSON permissions
  const perms = row.permissions as Record<string, 'read' | 'write'>
  // 단순화: 기존 레코드 삭제 후 현재 JSON 기준으로 재삽입 → stale 권한 제거 보장
  await db.request().input('rid', id).query(`DELETE FROM role_permissions WHERE role_id = @rid`)
  for (const [resource, action] of Object.entries(perms)) {
    if (action !== 'read' && action !== 'write') continue
    await db.request()
      .input('rid', id)
      .input('resource', resource)
      .input('action', action)
      .query(`INSERT INTO role_permissions (role_id, resource, action) VALUES (@rid, @resource, @action)`) 
  }
  return { success: true, data: row }
})


