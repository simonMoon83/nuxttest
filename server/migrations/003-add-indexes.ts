/**
 * Migration 003: Add database indexes for performance
 * Improves query performance for frequently accessed columns
 */

import type { Migration } from '../utils/migrations'

const migration: Migration = {
  version: '003',
  name: 'add-indexes',
  async up(db) {
    console.log('[Migration] Adding indexes for performance...')

    // Check and create indexes
    const indexes = [
      // Index 1: app_users.department_id (for department joins)
      {
        table: 'app_users',
        name: 'IX_app_users_department_id',
        columns: 'department_id',
      },
      // Index 2: notifications (user_id, is_read, created_at) - for inbox queries
      {
        table: 'notifications',
        name: 'IX_notifications_user_id_is_read_created_at',
        columns: 'user_id, is_read, created_at DESC',
      },
      // Index 3: chat_messages (chat_id, created_at) - for message listing
      {
        table: 'chat_messages',
        name: 'IX_chat_messages_chat_id_created_at',
        columns: 'chat_id, created_at DESC',
      },
      // Index 4: user_role_assignments.user_id - for permission checks
      {
        table: 'user_role_assignments',
        name: 'IX_user_role_assignments_user_id',
        columns: 'user_id',
      },
      // Index 5: department_role_assignments.department_id - for permission checks
      {
        table: 'department_role_assignments',
        name: 'IX_department_role_assignments_department_id',
        columns: 'department_id',
      },
    ]

    for (const index of indexes) {
      // Check if index already exists
      const checkResult = await db.request().query(`
        SELECT COUNT(*) as count
        FROM sys.indexes
        WHERE name = '${index.name}'
          AND object_id = OBJECT_ID('${index.table}')
      `)

      if (checkResult.recordset[0].count === 0) {
        // Create index
        await db.request().query(`
          CREATE INDEX ${index.name}
          ON ${index.table} (${index.columns})
        `)

        console.log(`[Migration] Created index ${index.name}`)
      }
      else {
        console.log(`[Migration] Index ${index.name} already exists`)
      }
    }

    console.log('[Migration] All indexes created successfully')
  },
  async down(db) {
    // Drop indexes
    const indexes = [
      'IX_app_users_department_id',
      'IX_notifications_user_id_is_read_created_at',
      'IX_chat_messages_chat_id_created_at',
      'IX_user_role_assignments_user_id',
      'IX_department_role_assignments_department_id',
    ]

    for (const indexName of indexes) {
      await db.request().query(`
        DROP INDEX IF EXISTS ${indexName}
      `)
    }
  },
}

export default migration
