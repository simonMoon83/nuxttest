import { getDbConnection } from '../utils/db'
import { getCurrentUser } from '../utils/auth'
import { getUserPermissions, hasPermission } from '../utils/permissions'
import { getConnectionStats } from '../utils/db-monitor'
import { handleError } from '../utils/error-handler'
import type { ApiResponse } from '../types/api-response'

/**
 * Get database connection pool statistics
 * Admin-only endpoint for monitoring database health
 *
 * @see docs/monitoring-guide.md
 */
export default defineEventHandler(async (event): Promise<ApiResponse> => {
  try {
    const user = getCurrentUser(event)
    const permissions = await getUserPermissions(user.id)

    // Check admin permission
    if (!hasPermission(permissions, 'system', 'read')) {
      return {
        success: false,
        message: 'Insufficient permissions. Admin access required.',
      }
    }

    const db = await getDbConnection()

    // Get connection pool stats
    const poolStats = {
      size: db.pool?.size || 0,
      available: db.pool?.available || 0,
      pending: db.pool?.pending || 0,
      borrowed: db.pool?.borrowed || 0,
    }

    // Get active connections from MSSQL
    const connections = await getConnectionStats()

    return {
      success: true,
      data: {
        pool: poolStats,
        connections,
      },
    }
  }
  catch (error) {
    return handleError(error, event)
  }
})
