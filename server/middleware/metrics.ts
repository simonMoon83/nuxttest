/**
 * Metrics collection middleware
 * Tracks HTTP request duration and logs slow requests
 *
 * @see docs/monitoring-guide.md
 */

const SLOW_REQUEST_THRESHOLD_MS = 1000

export default defineEventHandler((event) => {
  const start = Date.now()

  event.node.res.on('finish', () => {
    const duration = Date.now() - start
    const path = event.path
    const method = event.method
    const status = event.node.res.statusCode

    // Log slow requests
    if (duration > SLOW_REQUEST_THRESHOLD_MS) {
      console.warn(`[SlowRequest] ${method} ${path} - ${duration}ms (${status})`)
    }

    // You can extend this to send metrics to Prometheus, InfluxDB, etc.
    // Example:
    // await collectHttpMetric(duration, path, method, status)
  })
})
