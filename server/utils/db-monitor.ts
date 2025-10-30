import { getDbConnection } from './db'

/**
 * Database monitoring utilities
 * @see docs/monitoring-guide.md
 */

export interface SlowQuery {
  execution_count: number
  query_text: string
  total_cpu_ms: number
  total_elapsed_ms: number
  total_logical_reads: number
  total_logical_writes: number
}

/**
 * Get slow queries from MSSQL
 *
 * @param durationMs - Minimum average duration in milliseconds (default: 1000ms)
 * @returns List of slow queries
 */
export async function getSlowQueries(durationMs: number = 1000): Promise<SlowQuery[]> {
  const db = await getDbConnection()

  const result = await db.request().query(`
    SELECT
      qs.execution_count,
      SUBSTRING(qt.text, (qs.statement_start_offset/2)+1,
        ((CASE qs.statement_end_offset
          WHEN -1 THEN DATALENGTH(qt.text)
          ELSE qs.statement_end_offset
        END - qs.statement_start_offset)/2) + 1) AS query_text,
      qs.total_worker_time/1000 AS total_cpu_ms,
      qs.total_elapsed_time/1000 AS total_elapsed_ms,
      qs.total_logical_reads,
      qs.total_logical_writes
    FROM sys.dm_exec_query_stats qs
    CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) qt
    WHERE qs.total_elapsed_time/qs.execution_count > ${durationMs} * 1000
    ORDER BY qs.total_elapsed_time DESC
  `)

  return result.recordset
}

export interface ConnectionStats {
  total_connections: number
  running: number
  sleeping: number
}

/**
 * Get current database connection statistics
 *
 * @returns Connection statistics from MSSQL
 */
export async function getConnectionStats(): Promise<ConnectionStats> {
  const db = await getDbConnection()

  const result = await db.request().query(`
    SELECT
      COUNT(*) as total_connections,
      SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running,
      SUM(CASE WHEN status = 'sleeping' THEN 1 ELSE 0 END) as sleeping
    FROM sys.dm_exec_sessions
    WHERE is_user_process = 1
  `)

  return result.recordset[0]
}
