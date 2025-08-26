<script setup lang='ts'>
definePageMeta({ middleware: 'auth', name: 'Dashboard5' })

import { ref, onMounted, computed } from 'vue'

const apiBase = ref<string>(import.meta.client ? (localStorage.getItem('influxApiBase') || 'http://127.0.0.1:8000') : 'http://127.0.0.1:8000')
const isLoading = ref(false)
const errorMessage = ref('')

// 데이터 저장
const testRows = ref<any[]>([])
const specRows = ref<any[]>([])

// PrimeVue Chart (TEST)
const testChartData = ref<any>({ labels: [], datasets: [] })
const testChartOptions = ref<any>({
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'top' }, tooltip: { enabled: true } },
  scales: { x: { title: { display: true, text: 'Time' } }, y: { title: { display: true, text: 'Value' } } }
})

// PrimeVue DataTable (TEST)
const testTableRows = ref<any[]>([])

// PrimeVue Chart (SPEC)
const specChartData = ref<any>({ labels: [], datasets: [] })
const specChartOptions = ref<any>({
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'top' }, tooltip: { enabled: true } },
  scales: { x: { title: { display: true, text: 'Time' } }, y: { title: { display: true, text: 'Value' } } }
})

// PrimeVue DataTable (SPEC)
const specTableRows = ref<any[]>([])

function buildUrl(base: string, path: string, params: Record<string, string | string[] | undefined>) {
  const usp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (Array.isArray(v)) v.forEach(val => usp.append(k, val))
    else if (typeof v === 'string' && v.length > 0) usp.append(k, v)
  })
  return `${base}${path}?${usp.toString()}`
}

function updateViews() {
  // TEST → PrimeVue Chart
  const uniqueTimes: string[] = Array.from(new Set(testRows.value.map(r => new Date(r._time).toLocaleString()))).sort()
  const tagToRows = new Map<string, any[]>()
  testRows.value.forEach(r => { const k = r.TAGID || 'TAG'; if (!tagToRows.has(k)) tagToRows.set(k, []); tagToRows.get(k)!.push(r) })
  const datasets = Array.from(tagToRows.entries()).map(([tag, rows], idx) => {
    const color = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][idx % 5]
    const values = uniqueTimes.map(t => {
      const found = rows.find(rr => new Date(rr._time).toLocaleString() === t)
      return found ? Number(found._value) : null
    })
    return { label: tag, data: values, borderColor: color, backgroundColor: color + '33', tension: 0.2, spanGaps: true }
  })
  testChartData.value = { labels: uniqueTimes, datasets }

  // TEST → PrimeVue DataTable
  testTableRows.value = testRows.value
    .sort((a, b) => new Date(a._time).getTime() - new Date(b._time).getTime())
    .map(r => ({ time: new Date(r._time).toLocaleString(), tag: r.TAGID, value: r._value }))

  // SPEC → PrimeVue Chart
  const specTimes: string[] = specRows.value.map(r => new Date(r._time).toLocaleString())
  const mk = (key: string, label: string, color: string) => ({
    label,
    data: specRows.value.map(r => Number(r[key])),
    borderColor: color,
    backgroundColor: color + '33',
    tension: 0.2,
    spanGaps: true,
  })
  specChartData.value = {
    labels: specTimes,
    datasets: [
      mk('_value', 'VALUE', '#3B82F6'),
      mk('lsl', 'LSL', '#10B981'),
      mk('usl', 'USL', '#F59E0B'),
      mk('lcl', 'LCL', '#8B5CF6'),
      mk('ucl', 'UCL', '#EF4444'),
    ],
  }

  // SPEC → PrimeVue DataTable
  specTableRows.value = specRows.value
    .sort((a, b) => new Date(a._time).getTime() - new Date(b._time).getTime())
    .map(r => ({ time: new Date(r._time).toLocaleString(), value: r._value, lsl: r.lsl, usl: r.usl, lcl: r.lcl, ucl: r.ucl }))
}

async function fetchAll() {
  isLoading.value = true; errorMessage.value = ''
  try {
    const urlTest = buildUrl(apiBase.value, '/gettest', { tag: 'A', bucket: 'testspc', window: '1d', measurement: 'TESTSPC' })
    const urlSpec = buildUrl(apiBase.value, '/getspectest', { tag: 'A', bucket: 'testspecspc', window: '4h', measurement: 'TESTSPECSPC' })
    const [r1, r2] = await Promise.all([ fetch(urlTest), fetch(urlSpec) ])
    const [j1, j2] = await Promise.all([ r1.json(), r2.json() ])
    testRows.value = j1?.data || []
    specRows.value = j2?.data || []
    updateViews()
  } catch (e: any) {
    errorMessage.value = e?.message || '데이터 조회 실패'
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  if (!import.meta.client) return
  await fetchAll()
})
</script>

<template>
  <div class="space-y-3">
    <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <!-- TESTSPC: Chart + DataTable -->
      <div class="card p-3">
        <div class="mb-2 flex items-center justify-between">
          <h3 class="text-base font-medium">TESTSPC (Chart)</h3>
          <Button size="small" icon="pi pi-refresh" text @click="fetchAll" :loading="isLoading" />
        </div>
        <ClientOnly>
          <Chart type="line" :data="testChartData" :options="testChartOptions" style="height: 260px; width: 100%" />
        </ClientOnly>
        <div class="mt-3">
          <ClientOnly>
            <DataTable :value="testTableRows" size="small" stripedRows paginator :rows="10" :rowsPerPageOptions="[10,20,50]">
              <Column field="time" header="Time" style="width: 40%">
                <template #body="{ data }">
                  <code class="text-xs">{{ data.time }}</code>
                </template>
              </Column>
              <Column field="tag" header="TAG" style="width: 20%" />
              <Column field="value" header="Value" style="width: 40%" />
            </DataTable>
          </ClientOnly>
        </div>
      </div>

      <!-- TESTSPECSPC: Chart + DataTable -->
      <div class="card p-3">
        <div class="mb-2 flex items-center justify-between">
          <h3 class="text-base font-medium">TESTSPECSPC (Chart)</h3>
          <Button size="small" icon="pi pi-refresh" text @click="fetchAll" :loading="isLoading" />
        </div>
        <ClientOnly>
          <Chart type="line" :data="specChartData" :options="specChartOptions" style="height: 260px; width: 100%" />
        </ClientOnly>
        <div class="mt-3">
          <ClientOnly>
            <DataTable :value="specTableRows" size="small" stripedRows paginator :rows="10" :rowsPerPageOptions="[10,20,50]">
              <Column field="time" header="Time" style="width: 30%">
                <template #body="{ data }">
                  <code class="text-xs">{{ data.time }}</code>
                </template>
              </Column>
              <Column field="value" header="Value" style="width: 14%" />
              <Column field="lsl" header="LSL" style="width: 14%" />
              <Column field="usl" header="USL" style="width: 14%" />
              <Column field="lcl" header="LCL" style="width: 14%" />
              <Column field="ucl" header="UCL" style="width: 14%" />
            </DataTable>
          </ClientOnly>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>


