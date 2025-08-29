import process from 'node:process'
import { InfluxDB } from '@influxdata/influxdb-client'
import type { QueryApi } from '@influxdata/influxdb-client'

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
