import sql from 'mssql'
import { getDbConnection } from '../../utils/db'
import { handleError } from '../../utils/error-handler'
import type { ApiResponse } from '../../types/api-response'

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

export default defineEventHandler(async (event): Promise<ApiResponse> => {
  try {
    const db = await getDbConnection()
    await ensureTables(db)
    const q = (getQuery(event).search as string) || ''

    // Optimized query - JOIN roles with permissions in single query
    const r = await db.request()
      .input('q', sql.NVarChar, `%${q}%`)
      .query(`
        SELECT
          r.id, r.role_name, r.role_description, r.permissions,
          r.is_active, r.created_at, r.updated_at,
          rp.resource, rp.action
        FROM user_roles r
        LEFT JOIN role_permissions rp ON rp.role_id = r.id
        WHERE (@q='%%') OR (r.role_name LIKE @q OR r.role_description LIKE @q)
        ORDER BY r.role_name ASC, rp.resource ASC
      `)

    // Group results by role
    const rolesMap = new Map()
    for (const row of r.recordset) {
      if (!rolesMap.has(row.id)) {
        rolesMap.set(row.id, {
          id: row.id,
          role_name: row.role_name,
          role_description: row.role_description,
          permissions: JSON.parse(row.permissions || '{}'),
          is_active: row.is_active,
          created_at: row.created_at,
          updated_at: row.updated_at,
        })
      }

      // Merge normalized permissions
      if (row.resource && row.action) {
        const role = rolesMap.get(row.id)
        const cur = role.permissions[row.resource]
        // write takes precedence over read
        if (!cur || row.action === 'write') {
          role.permissions[row.resource] = row.action
        }
      }
    }

    const data = Array.from(rolesMap.values())

    // Ensure role_permissions table exists
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

    return {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
      },
    }
  }
  catch (error) {
    return handleError(error, event)
  }
})


