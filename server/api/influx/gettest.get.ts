import { defineEventHandler, getQuery, createError } from 'h3'
import { getInfluxQueryApi } from '../../utils/influx'

function esc(s: string) { return s.replace(/"/g, '\\"') }

export default defineEventHandler(async (event) => {
  const q = getQuery(event) as Record<string, any>
  const tagParam = q.tag
  const bucket = (q.bucket as string) || process.env.INFLUX_BUCKET_TEST || 'testspc'
  const window = (q.window as string) || '1d'
  const measurement = (q.measurement as string) || 'TESTSPC'

  const tags: string[] = Array.isArray(tagParam) ? tagParam : (tagParam ? [String(tagParam)] : [])
  if (!tags.length) {
    throw createError({ statusCode: 400, statusMessage: 'tag 파라미터를 하나 이상 제공해야 합니다.' })
  }

  const [first] = tags
  const cond = tags.length === 1
    ? `r["TAGID"] == "${esc(first!)}"`
    : tags.map((t: string) => `r["TAGID"] == "${esc(t)}"`).join(' or ')

  const flux = `
from(bucket: "${bucket}")
  |> range(start: -5y, stop: now())
  |> filter(fn: (r) => r["_measurement"] == "${measurement}")
  |> filter(fn: (r) => ${cond})
  |> aggregateWindow(every: ${window}, fn: mean, createEmpty: false)
`

  try {
    const queryApi = getInfluxQueryApi()
    const rows = await queryApi.collectRows<Record<string, any>>(flux)
    const data = rows.map((r: Record<string, any>) => ({
      _time: r._time,
      TAGID: r.TAGID,
      _value: r._value != null ? Number.parseFloat(String(r._value)).toFixed(3) : null,
    })).map((r: { _time: string; TAGID: string; _value: string | null }) => ({
      ...r,
      _value: r._value != null ? Number(r._value) : null,
    }))

    return { success: true, data, bucket }
  } catch (e: any) {
    console.error('InfluxDB 쿼리 오류', e)
    throw createError({ statusCode: 500, statusMessage: `InfluxDB 쿼리 오류: ${e?.message || e}` })
  }
})
