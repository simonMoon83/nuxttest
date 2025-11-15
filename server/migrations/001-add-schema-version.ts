/**
 * Migration 001: Create schema_version table
 * This migration is a no-op since the table is created by the migration runner itself
 * but we keep it for tracking purposes
 */

import type { Migration } from '../utils/migrations'

const migration: Migration = {
  version: '001',
  name: 'add-schema-version',
  async up(db) {
    // Table is created by migration runner
    // This migration exists only for tracking
  },
  async down(db) {
    await db.request().query(`
      DROP TABLE IF EXISTS schema_version
    `)
  },
}

export default migration







