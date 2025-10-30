/**
 * Health check endpoint
 * Used by load balancers, monitoring systems, and Docker healthcheck
 *
 * GET /api/health
 *
 * Returns:
 * - 200 if healthy
 * - 503 if unhealthy (database unreachable)
 */

import { checkSystemHealth } from '../utils/health-check'

export default defineEventHandler(async (event) => {
  const health = await checkSystemHealth()

  // Set appropriate HTTP status code
  const statusCode = health.status === 'unhealthy' ? 503 : 200
  setResponseStatus(event, statusCode)

  return health
})
