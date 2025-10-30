/**
 * Change password endpoint
 * POST /api/auth/change-password
 *
 * Requires authentication
 * Validates password policy before updating
 */

import bcrypt from 'bcryptjs'
import sql from 'mssql'
import { getCurrentUserId } from '../../utils/auth'
import { getDbConnection } from '../../utils/db'
import { validatePassword } from '../../utils/password-policy'
import { validationError, unauthorizedError } from '../../utils/error-handler'
import { createSuccessResponse, createErrorResponse } from '../../types/api-response'
import { handleError } from '../../utils/error-handler'
import type { ApiResponse } from '../../types/api-response'

interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export default defineEventHandler(async (event): Promise<ApiResponse> => {
  try {
    // Require authentication
    const userId = getCurrentUserId(event)

    const body = await readBody<ChangePasswordRequest>(event)
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      throw validationError('Current password and new password are required')
    }

    // Validate new password against policy
    const validation = validatePassword(newPassword)
    if (!validation.valid) {
      throw validationError('Password does not meet requirements', {
        errors: validation.errors,
        strength: validation.strength,
      })
    }

    // Check if new password is same as current
    if (currentPassword === newPassword) {
      throw validationError('New password must be different from current password')
    }

    const db = await getDbConnection()

    // Get current user
    const userResult = await db
      .request()
      .input('id', sql.Int, userId)
      .query('SELECT password_hash FROM app_users WHERE id = @id')

    if (userResult.recordset.length === 0) {
      throw unauthorizedError('User not found')
    }

    const user = userResult.recordset[0]

    // Verify current password
    const passwordValid = await bcrypt.compare(currentPassword, user.password_hash)
    if (!passwordValid) {
      throw unauthorizedError('Current password is incorrect')
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10)

    // Update password and set password_changed_at
    await db
      .request()
      .input('id', sql.Int, userId)
      .input('password_hash', sql.NVarChar, newPasswordHash)
      .query(`
        UPDATE app_users
        SET 
          password_hash = @password_hash,
          password_changed_at = GETDATE()
        WHERE id = @id
      `)

    return createSuccessResponse({
      message: 'Password changed successfully',
    })
  }
  catch (error) {
    return handleError(error, event)
  }
})

