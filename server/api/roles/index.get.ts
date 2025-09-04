import { getDbConnection } from '../../utils/db'

async function ensureTables(db: any) {
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
}

export default defineEventHandler(async (event) => {
  const db = await getDbConnection()
  await ensureTables(db)
  const q = (getQuery(event).search as string) || ''
  const r = await db.request()
    .input('q', `%${q}%`)
    .query(`
      SELECT id, role_name, role_description, permissions, is_active, created_at, updated_at
      FROM user_roles
      WHERE (@q='%%') OR (role_name LIKE @q OR role_description LIKE @q)
      ORDER BY role_name ASC
    `)
  const data = r.recordset.map((row: any) => ({ ...row, permissions: JSON.parse(row.permissions || '{}') }))

  // role_permissions 테이블 병합(정규화된 권한 우선 반영)
  if (data.length > 0) {
    // 보장
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

    const ids = data.map(d => d.id)
    // 동적 IN 구문 구성
    const params: string[] = []
    const req = db.request()
    ids.forEach((id, idx) => { params.push(`@p${idx}`); req.input(`p${idx}`, id) })
    const sql = `SELECT role_id, resource, action FROM role_permissions WHERE role_id IN (${params.join(',')})`
    const rp = ids.length > 0 ? await req.query(sql) : { recordset: [] }
    const byRole: Record<number, Array<{ resource: string; action: 'read' | 'write' }>> = {}
    for (const row of (rp as any).recordset || []) {
      const arr = byRole[row.role_id] || (byRole[row.role_id] = [])
      arr.push({ resource: row.resource, action: row.action })
    }
    for (const role of data) {
      const list = byRole[role.id] || []
      for (const { resource, action } of list) {
        // write 우선
        const cur = role.permissions[resource]
        if (!cur || action === 'write') role.permissions[resource] = action
      }
    }
  }
  return { success: true, data }
})


