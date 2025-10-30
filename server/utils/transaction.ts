/**
 * Database transaction utilities
 * Provides helper functions for managing MSSQL transactions
 */

import sql from 'mssql'
import { getDbConnection } from './db'

/**
 * Transaction options
 */
export interface TransactionOptions {
  /**
   * Transaction isolation level
   * Default: READ_COMMITTED
   */
  isolationLevel?: sql.IIsolationLevel

  /**
   * Transaction timeout in milliseconds
   * Default: 30000 (30 seconds)
   */
  timeout?: number
}

/**
 * Execute a function within a database transaction
 * Automatically commits on success and rolls back on error
 *
 * @param callback - Function to execute within transaction
 * @param options - Transaction options
 * @returns Result from callback
 *
 * @example
 * ```typescript
 * const result = await withTransaction(async (tx) => {
 *   const user = await tx.request()
 *     .input('username', 'john')
 *     .query('INSERT INTO users...')
 *
 *   const profile = await tx.request()
 *     .input('user_id', user.recordset[0].id)
 *     .query('INSERT INTO profiles...')
 *
 *   return { user, profile }
 * })
 * ```
 */
export async function withTransaction<T>(
  callback: (transaction: sql.Transaction) => Promise<T>,
  options: TransactionOptions = {},
): Promise<T> {
  const connection = await getDbConnection()
  const transaction = new sql.Transaction(connection)

  // Set isolation level if specified
  if (options.isolationLevel) {
    transaction.isolationLevel = options.isolationLevel
  }

  try {
    // Begin transaction
    await transaction.begin()

    // Set timeout if specified
    if (options.timeout) {
      const request = transaction.request()
      request.timeout = options.timeout
    }

    // Execute callback
    const result = await callback(transaction)

    // Commit transaction
    await transaction.commit()

    return result
  }
  catch (error) {
    // Rollback transaction on error
    try {
      await transaction.rollback()
    }
    catch (rollbackError) {
      console.error('[Transaction] Rollback failed:', rollbackError)
    }

    // Re-throw original error
    throw error
  }
}

/**
 * Execute a function within a transaction with a request helper
 * Provides both transaction and a pre-configured request
 *
 * @param callback - Function to execute
 * @param options - Transaction options
 * @returns Result from callback
 *
 * @example
 * ```typescript
 * const result = await withTransactionRequest(async (tx, request) => {
 *   const user = await request
 *     .input('username', sql.NVarChar, 'john')
 *     .query('INSERT INTO users...')
 *
 *   return user.recordset[0]
 * })
 * ```
 */
export async function withTransactionRequest<T>(
  callback: (transaction: sql.Transaction, request: sql.Request) => Promise<T>,
  options: TransactionOptions = {},
): Promise<T> {
  return withTransaction(async (transaction) => {
    const request = transaction.request()

    if (options.timeout) {
      request.timeout = options.timeout
    }

    return callback(transaction, request)
  }, options)
}

/**
 * Create a savepoint within a transaction
 * Useful for nested transactions or partial rollbacks
 *
 * @param transaction - Active transaction
 * @param savepointName - Name of the savepoint
 */
export async function createSavepoint(
  transaction: sql.Transaction,
  savepointName: string,
): Promise<void> {
  const request = transaction.request()
  await request.query(`SAVE TRANSACTION ${savepointName}`)
}

/**
 * Rollback to a savepoint
 *
 * @param transaction - Active transaction
 * @param savepointName - Name of the savepoint
 */
export async function rollbackToSavepoint(
  transaction: sql.Transaction,
  savepointName: string,
): Promise<void> {
  const request = transaction.request()
  await request.query(`ROLLBACK TRANSACTION ${savepointName}`)
}

/**
 * Transaction isolation levels
 * Re-export from mssql for convenience
 */
export const IsolationLevel = {
  READ_UNCOMMITTED: sql.ISOLATION_LEVEL.READ_UNCOMMITTED,
  READ_COMMITTED: sql.ISOLATION_LEVEL.READ_COMMITTED,
  REPEATABLE_READ: sql.ISOLATION_LEVEL.REPEATABLE_READ,
  SERIALIZABLE: sql.ISOLATION_LEVEL.SERIALIZABLE,
  SNAPSHOT: sql.ISOLATION_LEVEL.SNAPSHOT,
} as const
