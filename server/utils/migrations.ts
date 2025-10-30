/**
 * Database migration system
 * Tracks and executes schema changes automatically
 */

import sql from 'mssql'
import { getDbConnection } from './db'

/**
 * Migration definition
 */
export interface Migration {
  version: string
  name: string
  up: (db: sql.ConnectionPool) => Promise<void>
  down?: (db: sql.ConnectionPool) => Promise<void>
}

/**
 * Ensure schema_version table exists
 */
async function ensureSchemaVersionTable(db: sql.ConnectionPool): Promise<void> {
  const result = await db.request().query(`
    IF NOT EXISTS (
      SELECT * FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'schema_version'
    )
    BEGIN
      CREATE TABLE schema_version (
        version NVARCHAR(20) PRIMARY KEY,
        name NVARCHAR(200) NOT NULL,
        executed_at DATETIME2 NOT NULL DEFAULT GETDATE()
      )
    END
  `)
}

/**
 * Check if a migration has been executed
 */
async function isMigrationExecuted(
  db: sql.ConnectionPool,
  version: string,
): Promise<boolean> {
  const result = await db
    .request()
    .input('version', sql.NVarChar, version)
    .query(`
      SELECT COUNT(*) as count 
      FROM schema_version 
      WHERE version = @version
    `)

  return result.recordset[0].count > 0
}

/**
 * Record a migration as executed
 */
async function recordMigration(
  db: sql.ConnectionPool,
  migration: Migration,
): Promise<void> {
  await db
    .request()
    .input('version', sql.NVarChar, migration.version)
    .input('name', sql.NVarChar, migration.name)
    .query(`
      INSERT INTO schema_version (version, name, executed_at)
      VALUES (@version, @name, GETDATE())
    `)
}

/**
 * Run all pending migrations
 *
 * @param migrations - Array of migrations to execute
 */
export async function runMigrations(migrations: Migration[]): Promise<void> {
  const db = await getDbConnection()

  try {
    // Ensure schema_version table exists
    await ensureSchemaVersionTable(db)

    // Sort migrations by version
    const sorted = [...migrations].sort((a, b) =>
      a.version.localeCompare(b.version),
    )

    let executedCount = 0

    for (const migration of sorted) {
      // Check if already executed
      const executed = await isMigrationExecuted(db, migration.version)

      if (executed) {
        continue
      }

      console.log(`[Migration] Running ${migration.version}: ${migration.name}`)

      // Execute migration in transaction
      const transaction = new sql.Transaction(db)

      try {
        await transaction.begin()

        // Run the migration
        await migration.up(db)

        // Record in schema_version
        await db
          .request()
          .input('version', sql.NVarChar, migration.version)
          .input('name', sql.NVarChar, migration.name)
          .query(`
            INSERT INTO schema_version (version, name, executed_at)
            VALUES (@version, @name, GETDATE())
          `)

        await transaction.commit()

        console.log(`[Migration] ✓ Completed ${migration.version}`)
        executedCount++
      }
      catch (error) {
        await transaction.rollback()
        console.error(`[Migration] ✗ Failed ${migration.version}:`, error)
        throw error
      }
    }

    if (executedCount === 0) {
      console.log('[Migration] All migrations up to date')
    }
    else {
      console.log(`[Migration] Executed ${executedCount} migration(s)`)
    }
  }
  catch (error) {
    console.error('[Migration] Error:', error)
    throw error
  }
}

/**
 * Get list of executed migrations
 */
export async function getExecutedMigrations(): Promise<Array<{
  version: string
  name: string
  executed_at: Date
}>> {
  const db = await getDbConnection()

  try {
    await ensureSchemaVersionTable(db)

    const result = await db.request().query(`
      SELECT version, name, executed_at
      FROM schema_version
      ORDER BY version ASC
    `)

    return result.recordset
  }
  catch (error) {
    console.error('[Migration] Error getting executed migrations:', error)
    return []
  }
}

