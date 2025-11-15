/**
 * Migration 002: Add password_changed_at column to app_users
 * Supports first-login password change enforcement
 */

import type { Migration } from '../utils/migrations'

const migration: Migration = {
  version: '002',
  name: 'add-password-changed-at',
  async up(db) {
    // Check if column already exists
    const checkResult = await db.request().query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'app_users'
        AND COLUMN_NAME = 'password_changed_at'
    `)

    if (checkResult.recordset[0].count === 0) {
      // Add column
      await db.request().query(`
        ALTER TABLE app_users
        ADD password_changed_at DATETIME2 NULL
      `)

      console.log('[Migration] Added password_changed_at column')

      // Set password_changed_at for existing users to current time
      // This prevents them from being forced to change password
      await db.request().query(`
        UPDATE app_users
        SET password_changed_at = GETDATE()
        WHERE password_changed_at IS NULL
      `)

      console.log('[Migration] Set password_changed_at for existing users')
    }
    else {
      console.log('[Migration] password_changed_at column already exists')
    }
  },
  async down(db) {
    await db.request().query(`
      ALTER TABLE app_users
      DROP COLUMN IF EXISTS password_changed_at
    `)
  },
}

export default migration







