/**
 * Migration 004: Create audit_logs table
 * Tracks important user actions for compliance and security
 */

import type { Migration } from '../utils/migrations'

const migration: Migration = {
  version: '004',
  name: 'add-audit-logs',
  async up(db) {
    // Check if table exists
    const checkResult = await db.request().query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_NAME = 'audit_logs'
    `)

    if (checkResult.recordset[0].count === 0) {
      // Create audit_logs table
      await db.request().query(`
        CREATE TABLE audit_logs (
          id INT IDENTITY(1,1) PRIMARY KEY,
          user_id INT NULL,
          action NVARCHAR(100) NOT NULL,
          resource NVARCHAR(100) NOT NULL,
          resource_id NVARCHAR(100) NULL,
          details NVARCHAR(MAX) NULL,
          ip_address NVARCHAR(50) NULL,
          user_agent NVARCHAR(500) NULL,
          created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
          FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE SET NULL
        )
      `)

      // Create index for user_id
      await db.request().query(`
        CREATE INDEX IX_audit_logs_user_id
        ON audit_logs (user_id, created_at DESC)
      `)

      // Create index for action
      await db.request().query(`
        CREATE INDEX IX_audit_logs_action_created_at
        ON audit_logs (action, created_at DESC)
      `)

      console.log('[Migration] Created audit_logs table with indexes')
    }
    else {
      console.log('[Migration] audit_logs table already exists')
    }
  },
  async down(db) {
    await db.request().query(`
      DROP TABLE IF EXISTS audit_logs
    `)
  },
}

export default migration
