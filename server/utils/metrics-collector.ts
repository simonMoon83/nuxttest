/**
 * Metrics collector for InfluxDB integration
 * @see docs/monitoring-guide.md
 */

import { writeMetric } from './influx'

export interface HttpMetric {
  duration_ms: number
  path: string
  method: string
  status: number
}

/**
 * Collect HTTP request metrics and send to InfluxDB
 *
 * @param duration - Request duration in milliseconds
 * @param path - Request path
 * @param method - HTTP method
 * @param statusCode - HTTP status code
 */
export async function collectHttpMetric(
  duration: number,
  path: string,
  method: string,
  statusCode: number,
): Promise<void> {
  try {
    await writeMetric('http_requests', {
      duration_ms: duration,
      path,
      method,
      status: statusCode,
    })
  }
  catch (error) {
    // Silently fail - don't break the request if metrics collection fails
    console.error('[MetricsCollector] Failed to collect metric:', error)
  }
}

/**
 * Collect custom application metrics
 *
 * @param measurement - Measurement name
 * @param fields - Metric fields
 * @param tags - Optional tags
 */
export async function collectCustomMetric(
  measurement: string,
  fields: Record<string, number | string>,
  tags?: Record<string, string>,
): Promise<void> {
  try {
    await writeMetric(measurement, fields, tags)
  }
  catch (error) {
    console.error('[MetricsCollector] Failed to collect custom metric:', error)
  }
}
