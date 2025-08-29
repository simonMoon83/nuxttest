import { defineEventHandler, getQuery, createError } from 'h3'
import { getInfluxQueryApi } from '../../utils/influx'

function esc(s: string) { return s.replace(/"/g, '\\"') }

export default defineEventHandler(async (event) => {
  const q = getQuery(event) as Record<string, any>
  const tag = (q.tag as string) || ''
  const bucket = (q.bucket as string) || process.env.INFLUX_BUCKET_SPEC || 'testspecspc'
  const window = (q.window as string) || '4h'
  const measurement = (q.measurement as string) || 'TESTSPECSPC'

  if (!tag) {
    throw createError({ statusCode: 400, statusMessage: 'tag 파라미터를 제공해야 합니다.' })
  }

  const cond = `r["TAGID"] == "${esc(tag)}"`

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

    const timeMap = new Map<string, any>()
    for (const r of rows) {
      const t = String(r._time)
      const field = r._field
      const rawVal = r._value
      const val = rawVal != null ? Number.parseFloat(String(rawVal)) : null
      if (!timeMap.has(t)) {
        timeMap.set(t, { _time: t, _value: null, lsl: null, usl: null, lcl: null, ucl: null })
      }
      const obj = timeMap.get(t)!
      switch (field) {
        case 'VALUE': obj._value = val != null ? Number(val.toFixed(3)) : null; break
        case 'LSL': obj.lsl = val != null ? Number(val.toFixed(3)) : null; break
        case 'USL': obj.usl = val != null ? Number(val.toFixed(3)) : null; break
        case 'LCL': obj.lcl = val != null ? Number(val.toFixed(3)) : null; break
        case 'UCL': obj.ucl = val != null ? Number(val.toFixed(3)) : null; break
      }
    }

    const data = Array.from(timeMap.values())
    return { success: true, data, bucket }
  } catch (e: any) {
    console.error('InfluxDB 쿼리 오류', e)
    throw createError({ statusCode: 500, statusMessage: `InfluxDB 쿼리 오류: ${e?.message || e}` })
  }
})
