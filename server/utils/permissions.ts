import { getDbConnection } from './db'

export function hasPermission(userPermissions: any, resource: string, action: 'read' | 'write' = 'read'): boolean {
  if (!userPermissions) return false
  if (userPermissions.all) return true
  const v = userPermissions[resource]
  if (!v) return false
  if (v === 'write') return true
  return v === action
}

export async function getUserPermissions(userId: number): Promise<any> {
  const connection = await getDbConnection()

  // 권한 테이블 보장
  await connection.request().query(`
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

  const merged: Record<string, 'read' | 'write'> = {}

  // 1) 정규화 테이블 우선 병합
  const resNorm = await connection.request()
    .input('userId', userId)
    .query(`
      SELECT rp.resource, rp.action
      FROM role_permissions rp
      JOIN user_role_assignments ura ON ura.role_id = rp.role_id
      WHERE ura.user_id = @userId
      UNION ALL
      SELECT rp.resource, rp.action
      FROM role_permissions rp
      JOIN department_role_assignments dra ON dra.role_id = rp.role_id
      JOIN app_users u ON u.id = @userId AND u.department_id = dra.department_id
    `)
  for (const row of (resNorm as any).recordset || []) {
    const cur = merged[row.resource]
    // write가 read보다 우선
    if (!cur || row.action === 'write') merged[row.resource] = row.action
  }

  // 2) 레거시 JSON 병합(없을 때 보완)
  const resJson = await connection.request()
    .input('userId', userId)
    .query(`
      WITH user_roles_cte AS (
        SELECT r.permissions
        FROM user_roles r
        JOIN user_role_assignments ura ON ura.role_id = r.id
        WHERE ura.user_id = @userId AND r.is_active = 1
      ),
      dept_roles_cte AS (
        SELECT r.permissions
        FROM user_roles r
        JOIN department_role_assignments dra ON dra.role_id = r.id
        JOIN app_users u ON u.id = @userId AND u.department_id = dra.department_id
        WHERE r.is_active = 1
      )
      SELECT permissions FROM user_roles_cte
      UNION ALL
      SELECT permissions FROM dept_roles_cte
    `)
  for (const row of (resJson as any).recordset || []) {
    try {
      const p = JSON.parse(row.permissions || '{}')
      for (const [k, v] of Object.entries(p)) {
        if (v !== 'read' && v !== 'write') continue
        const cur = merged[k]
        if (!cur || v === 'write') merged[k] = v
      }
    } catch {}
  }
  return merged
}

// 기본 정책: 명시되지 않은 리소스는 none(= 접근 불가)
export function hasReadOrWrite(userPermissions: any, resource: string): boolean {
  if (!userPermissions) return false
  if (userPermissions.all) return true
  const v = userPermissions[resource]
  if (!v) return false
  return v === 'read' || v === 'write'
}


