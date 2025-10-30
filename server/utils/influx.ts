import process from 'node:process'
import { InfluxDB, Point } from '@influxdata/influxdb-client'
import type { QueryApi, WriteApi } from '@influxdata/influxdb-client'

export interface InfluxEnv {
  url: string
  token: string
  org: string
}

export function getInfluxEnv(): InfluxEnv {
  const url = process.env.INFLUX_URL || ''
  const token = process.env.INFLUX_TOKEN || ''
  const org = process.env.INFLUX_ORG || ''
  if (!url || !token || !org) {
    throw new Error('Missing InfluxDB env: please set INFLUX_URL, INFLUX_TOKEN, INFLUX_ORG')
  }
  return { url, token, org }
}

export function getInfluxQueryApi(): QueryApi {
  const { url, token, org } = getInfluxEnv()
  const client = new InfluxDB({ url, token })
  return client.getQueryApi(org)
}

/**
 * Write a metric point to InfluxDB
 *
 * @param measurement - Measurement name
 * @param fields - Field values
 * @param tags - Optional tags
 */
export async function writeMetric(
  measurement: string,
  fields: Record<string, number | string>,
  tags?: Record<string, string>,
): Promise<void> {
  try {
    const { url, token, org } = getInfluxEnv()
    const bucket = process.env.INFLUX_BUCKET || 'default'
    const client = new InfluxDB({ url, token })
    const writeApi: WriteApi = client.getWriteApi(org, bucket, 'ms')

    const point = new Point(measurement)

    // Add tags if provided
    if (tags) {
      for (const [key, value] of Object.entries(tags)) {
        point.tag(key, value)
      }
    }

    // Add fields
    for (const [key, value] of Object.entries(fields)) {
      if (typeof value === 'number') {
        point.floatField(key, value)
      }
      else {
        point.stringField(key, value)
      }
    }

    writeApi.writePoint(point)
    await writeApi.close()
  }
  catch (error) {
    // InfluxDB가 설정되지 않은 경우 조용히 실패
    if (error instanceof Error && error.message.includes('Missing InfluxDB env')) {
      return
    }
    throw error
  }
}
