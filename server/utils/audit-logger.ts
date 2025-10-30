/**
 * Audit logging utilities
 * Records important user actions for compliance and security
 */

import sql from 'mssql'
import type { H3Event } from 'h3'
import { getDbConnection } from './db'

/**
 * Audit action types
 */
export enum AuditAction {
  // User actions
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',
  USER_CREATE = 'user.create',
  USER_UPDATE = 'user.update',
  USER_DELETE = 'user.delete',
  USER_PASSWORD_CHANGE = 'user.password_change',

  // Role actions
  ROLE_CREATE = 'role.create',
  ROLE_UPDATE = 'role.update',
  ROLE_DELETE = 'role.delete',
  ROLE_ASSIGN = 'role.assign',
  ROLE_REVOKE = 'role.revoke',

  // Permission actions
  PERMISSION_GRANT = 'permission.grant',
  PERMISSION_REVOKE = 'permission.revoke',
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  userId?: number
  action: AuditAction | string
  resource: string
  resourceId?: string | number
  details?: any
  ipAddress?: string
  userAgent?: string
}

/**
 * Log an audit entry
 *
 * @param entry - Audit log entry
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    const db = await getDbConnection()

    await db
      .request()
      .input('user_id', sql.Int, entry.userId || null)
      .input('action', sql.NVarChar(100), entry.action)
      .input('resource', sql.NVarChar(100), entry.resource)
      .input('resource_id', sql.NVarChar(100), entry.resourceId?.toString() || null)
      .input('details', sql.NVarChar(sql.MAX), entry.details ? JSON.stringify(entry.details) : null)
      .input('ip_address', sql.NVarChar(50), entry.ipAddress || null)
      .input('user_agent', sql.NVarChar(500), entry.userAgent || null)
      .query(`
        INSERT INTO audit_logs (user_id, action, resource, resource_id, details, ip_address, user_agent, created_at)
        VALUES (@user_id, @action, @resource, @resource_id, @details, @ip_address, @user_agent, GETDATE())
      `)
  }
  catch (error) {
    console.error('[AuditLog] Failed to log audit entry:', error)
    // Don't throw - audit logging should not break the main flow
  }
}

/**
 * Log audit entry from H3 event
 * Automatically extracts IP and User-Agent
 *
 * @param event - H3 event
 * @param entry - Audit log entry
 */
export async function logAuditFromEvent(
  event: H3Event,
  entry: Omit<AuditLogEntry, 'ipAddress' | 'userAgent'>,
): Promise<void> {
  const ipAddress = getRequestIP(event, { xForwardedFor: true }) || undefined
  const userAgent = getHeader(event, 'user-agent') || undefined

  await logAudit({
    ...entry,
    ipAddress,
    userAgent,
  })
}

/**
 * Get audit logs (for admin view)
 *
 * @param options - Query options
 * @returns Audit log entries
 */
export async function getAuditLogs(options: {
  userId?: number
  action?: string
  resource?: string
  limit?: number
  offset?: number
}) {
  const db = await getDbConnection()

  const { userId, action, resource, limit = 100, offset = 0 } = options

  const result = await db
    .request()
    .input('user_id', sql.Int, userId || null)
    .input('action', sql.NVarChar, action || null)
    .input('resource', sql.NVarChar, resource || null)
    .input('limit', sql.Int, limit)
    .input('offset', sql.Int, offset)
    .query(`
      SELECT a.*, u.username, u.full_name
      FROM audit_logs a
      LEFT JOIN app_users u ON u.id = a.user_id
      WHERE (@user_id IS NULL OR a.user_id = @user_id)
        AND (@action IS NULL OR a.action = @action)
        AND (@resource IS NULL OR a.resource = @resource)
      ORDER BY a.created_at DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `)

  return result.recordset
}
