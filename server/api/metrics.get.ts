import { checkSystemHealth } from '../utils/health-check'
import { cache } from '../utils/cache'

/**
 * Prometheus metrics endpoint
 * Returns metrics in Prometheus text format for scraping
 *
 * @see docs/monitoring-guide.md
 */
export default defineEventHandler(async (event) => {
  const health = await checkSystemHealth()

  // Prometheus text format
  const metrics = [
    `# HELP app_up Application is running`,
    `# TYPE app_up gauge`,
    `app_up ${health.status === 'healthy' ? 1 : 0}`,
    ``,
    `# HELP app_uptime_seconds Application uptime in seconds`,
    `# TYPE app_uptime_seconds counter`,
    `app_uptime_seconds ${health.uptime}`,
    ``,
    `# HELP database_healthy Database is healthy`,
    `# TYPE database_healthy gauge`,
    `database_healthy ${health.checks.database.healthy ? 1 : 0}`,
    ``,
    `# HELP database_latency_ms Database query latency in milliseconds`,
    `# TYPE database_latency_ms gauge`,
    `database_latency_ms ${health.checks.database.latency || 0}`,
    ``,
    `# HELP memory_healthy Memory is healthy`,
    `# TYPE memory_healthy gauge`,
    `memory_healthy ${health.checks.memory.healthy ? 1 : 0}`,
    ``,
    `# HELP cache_size Cache entries count`,
    `# TYPE cache_size gauge`,
    `cache_size ${cache.size()}`,
  ].join('\n')

  setResponseHeader(event, 'Content-Type', 'text/plain; version=0.0.4')
  return metrics
})
