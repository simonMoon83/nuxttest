/**
 * Health check utilities
 * Monitors application and dependencies health
 */

import { getDbConnection } from './db'

/**
 * Health check result
 */
export interface HealthCheckResult {
  healthy: boolean
  latency?: number
  error?: string
  timestamp: string
}

/**
 * Overall system health
 */
export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  uptime: number
  checks: {
    database: HealthCheckResult
    memory: HealthCheckResult
  }
  version?: string
}

/**
 * Check database connectivity and response time
 */
export async function checkDatabaseHealth(): Promise<HealthCheckResult> {
  const start = Date.now()

  try {
    const connection = await getDbConnection()
    await connection.request().query('SELECT 1 as health_check')
    const latency = Date.now() - start

    return {
      healthy: true,
      latency,
      timestamp: new Date().toISOString(),
    }
  }
  catch (error) {
    const latency = Date.now() - start

    return {
      healthy: false,
      latency,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }
  }
}

/**
 * Check memory usage
 */
export function checkMemoryHealth(): HealthCheckResult {
  const usage = process.memoryUsage()
  const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024)
  const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024)
  const heapUsagePercent = Math.round((usage.heapUsed / usage.heapTotal) * 100)

  // Consider unhealthy if heap usage > 90%
  const healthy = heapUsagePercent < 90

  return {
    healthy,
    latency: 0,
    error: healthy ? undefined : `High memory usage: ${heapUsagePercent}%`,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Perform complete system health check
 */
export async function checkSystemHealth(): Promise<SystemHealth> {
  const [database, memory] = await Promise.all([
    checkDatabaseHealth(),
    Promise.resolve(checkMemoryHealth()),
  ])

  // Determine overall status
  let status: 'healthy' | 'degraded' | 'unhealthy'

  if (database.healthy && memory.healthy) {
    status = 'healthy'
  }
  else if (!database.healthy) {
    status = 'unhealthy'
  }
  else {
    status = 'degraded'
  }

  return {
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database,
      memory,
    },
    version: process.env.npm_package_version,
  }
}
