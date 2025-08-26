<script setup lang='ts'>
definePageMeta({ middleware: 'auth', name: 'Dashboard4' })

import { ref, onMounted, shallowRef, markRaw, computed, watch } from 'vue'

const colorMode = useColorMode()

const apiBase = ref<string>(import.meta.client ? (localStorage.getItem('influxApiBase') || 'http://127.0.0.1:8000') : 'http://127.0.0.1:8000')
const isLoading = ref(false)
const errorMessage = ref('')

// 데이터 저장
const testRows = ref<any[]>([])
const specRows = ref<any[]>([])
const lastUpdated = ref<string>('')

// 위젯용 간단 KPI
const kpiWidgets = computed(() => [
  { label: 'TEST Rows', value: testRows.value.length },
  { label: 'SPEC Rows', value: specRows.value.length },
  { label: 'Updated', value: lastUpdated.value || '-' },
  { label: 'API', value: apiBase.value.replace(/^https?:\/\//, '') },
])

// AG Charts (Vue)
const AgChartsComp = shallowRef<any>(null)

// ECharts
const VChart = shallowRef<any>(null)
const echartsReady = ref(false)
const baseChartOptions = { 
  tooltip: { trigger: 'axis' }, legend: { top: 0 }, grid: { left: 40, right: 20, top: 30, bottom: 40 },
  toolbox: { show: true, right: 10, feature: { dataZoom: { yAxisIndex: 'none', xAxisIndex: 'all' }, restore: {}, saveAsImage: {} } },
  dataZoom: [ { type: 'inside', zoomOnMouseWheel: true, moveOnMouseWheel: true, moveOnMouseMove: false }, { type: 'slider' } ],
  xAxis: { type: 'time' }, yAxis: { type: 'value' }
}
const testLineOptions = ref<any>({ title: { text: 'TEST (ECharts)' }, ...baseChartOptions, series: [] })
const specLineOptions = ref<any>({ title: { text: 'SPEC (ECharts)' }, ...baseChartOptions, series: [] })

// AG Charts 옵션
const agTestOptions = ref<any>({ title: { text: 'TEST (AG Charts)' }, series: [], axes: [ { type: 'time', position: 'bottom' }, { type: 'number', position: 'left' } ], legend: { enabled: true } })
const agSpecOptions = ref<any>({ title: { text: 'SPEC (AG Charts)' }, series: [], axes: [ { type: 'time', position: 'bottom' }, { type: 'number', position: 'left' } ], legend: { enabled: true } })

// PrimeVue Chart & DataTable
const primeChartData = ref<any>({ labels: [], datasets: [] }) // TEST
const primeChartOptions = ref<any>({
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'top' }, tooltip: { enabled: true } },
  scales: { x: { title: { display: true, text: 'Time' } }, y: { title: { display: true, text: 'Value' } } }
})
const tableRows = ref<any[]>([])
// SPEC용 PrimeVue Chart
const primeSpecChartData = ref<any>({ labels: [], datasets: [] })
const primeSpecChartOptions = ref<any>({
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'top' }, tooltip: { enabled: true } },
  scales: { x: { title: { display: true, text: 'Time' } }, y: { title: { display: true, text: 'Value' } } }
})

function buildUrl(base: string, path: string, params: Record<string, string | string[] | undefined>) {
  const usp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (Array.isArray(v)) v.forEach(val => usp.append(k, val))
    else if (typeof v === 'string' && v.length > 0) usp.append(k, v)
  })
  return `${base}${path}?${usp.toString()}`
}

function updateCharts() {
  // TEST chart (group by TAGID)
  const map = new Map<string, any[]>()
  testRows.value.forEach(r => { const k = r.TAGID || 'TAG'; if (!map.has(k)) map.set(k, []); map.get(k)!.push([new Date(r._time).getTime(), r._value]) })
  const seriesTest = Array.from(map.entries()).map(([k, data]) => ({ name: k, type: 'line', showSymbol: false, data }))
  testLineOptions.value = { ...testLineOptions.value, series: seriesTest }
  // AG Charts: one series per TAGID
  const agSeriesTest = Array.from(map.entries()).map(([k, arr]) => ({ type: 'line', data: arr.map(([x,y]) => ({ x, y })), xKey: 'x', yKey: 'y', yName: k, marker: { enabled: false } }))
  agTestOptions.value = { ...agTestOptions.value, series: agSeriesTest }

  // SPEC chart (value + limits)
  const to = (key: string) => specRows.value.map(r => [new Date(r._time).getTime(), r[key]])
  const seriesSpec = [ { name: 'VALUE', type: 'line', showSymbol: false, data: to('_value') }, { name: 'LSL', type: 'line', showSymbol: false, data: to('lsl') }, { name: 'USL', type: 'line', showSymbol: false, data: to('usl') }, { name: 'LCL', type: 'line', showSymbol: false, data: to('lcl') }, { name: 'UCL', type: 'line', showSymbol: false, data: to('ucl') } ]
  specLineOptions.value = { ...specLineOptions.value, series: seriesSpec }
  // AG Charts: five series
  agSpecOptions.value = { ...agSpecOptions.value, series: [
    { type: 'line', data: to('_value').map(([x,y]) => ({ x, y })), xKey: 'x', yKey: 'y', yName: 'VALUE', marker: { enabled: false } },
    { type: 'line', data: to('lsl').map(([x,y]) => ({ x, y })), xKey: 'x', yKey: 'y', yName: 'LSL', marker: { enabled: false } },
    { type: 'line', data: to('usl').map(([x,y]) => ({ x, y })), xKey: 'x', yKey: 'y', yName: 'USL', marker: { enabled: false } },
    { type: 'line', data: to('lcl').map(([x,y]) => ({ x, y })), xKey: 'x', yKey: 'y', yName: 'LCL', marker: { enabled: false } },
    { type: 'line', data: to('ucl').map(([x,y]) => ({ x, y })), xKey: 'x', yKey: 'y', yName: 'UCL', marker: { enabled: false } },
  ] }

  // PrimeVue Chart (라인) - TEST 데이터 기반, TAGID별 시리즈, x축은 시간 라벨
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
  primeChartData.value = { labels: uniqueTimes, datasets }

  // PrimeVue DataTable - 납작한 행 데이터(tag, time, value)
  tableRows.value = Array.from(tagToRows.entries()).flatMap(([tag, rows]) =>
    rows
      .sort((a, b) => new Date(a._time).getTime() - new Date(b._time).getTime())
      .map(r => ({ tag, time: new Date(r._time).toLocaleString(), value: r._value }))
  )

  // PrimeVue Chart (SPEC) - VALUE & LIMITS
  const specTimes: string[] = specRows.value.map(r => new Date(r._time).toLocaleString())
  const mk = (key: string, label: string, color: string) => ({
    label,
    data: specRows.value.map(r => Number(r[key])),
    borderColor: color,
    backgroundColor: color + '33',
    tension: 0.2,
    spanGaps: true,
  })
  primeSpecChartData.value = {
    labels: specTimes,
    datasets: [
      mk('_value', 'VALUE', '#3B82F6'),
      mk('lsl', 'LSL', '#10B981'),
      mk('usl', 'USL', '#F59E0B'),
      mk('lcl', 'LCL', '#8B5CF6'),
      mk('ucl', 'UCL', '#EF4444'),
    ],
  }
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
    updateCharts()
    lastUpdated.value = new Date().toLocaleString()
  } catch (e: any) {
    errorMessage.value = e?.message || '데이터 조회 실패'
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  if (!import.meta.client) return
  try {
    // ECharts 등록 → 컴포넌트 로드
    const { use } = await import('echarts/core')
    const { LineChart } = await import('echarts/charts')
    const { GridComponent, TooltipComponent, LegendComponent, DataZoomComponent, TitleComponent, ToolboxComponent } = await import('echarts/components')
    const { CanvasRenderer } = await import('echarts/renderers')
    use([LineChart, GridComponent, TooltipComponent, LegendComponent, DataZoomComponent, TitleComponent, ToolboxComponent, CanvasRenderer])
    const modV: any = await import('vue-echarts')
    const Comp = modV.default || modV.VChart || modV.ECharts || modV.echarts || null
    if (Comp) VChart.value = markRaw(Comp)
    echartsReady.value = true

    // AG Charts 컴포넌트 로드
    const modAg: any = await import('ag-charts-vue3')
    const AgComp = modAg.AgCharts || modAg.default || null
    if (AgComp) AgChartsComp.value = markRaw(AgComp)

    await fetchAll()
  } catch (e) { console.error('초기화 실패:', e) }
})
</script>

<template>
  <div class="space-y-3">
    <!-- KPI 위젯 -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
      <div v-for="w in kpiWidgets" :key="w.label" class="card p-3">
        <div class="text-xs text-gray-500">{{ w.label }}</div>
        <div class="text-lg font-semibold text-gray-700 dark:text-gray-100">{{ w.value }}</div>
      </div>
    </div>

    <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>

    <!-- 2x2 대시보드: 상단 AG Charts 2개, 하단 ECharts 2개 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <!-- 1) TEST - AG Charts -->
      <div class="card p-3">
        <div class="mb-2 flex items-center justify-between">
          <h3 class="text-base font-medium">TESTSPC (AG Charts)</h3>
          <Button size="small" icon="pi pi-refresh" text @click="fetchAll" :loading="isLoading" />
        </div>
        <ClientOnly>
          <component :is="AgChartsComp" v-if="AgChartsComp" :options="agTestOptions" style="height: 300px; width: 100%" />
        </ClientOnly>
      </div>

      <!-- 2) SPEC - AG Charts -->
      <div class="card p-3">
        <div class="mb-2 flex items-center justify-between">
          <h3 class="text-base font-medium">TESTSPECSPC (AG Charts)</h3>
          <Button size="small" icon="pi pi-refresh" text @click="fetchAll" :loading="isLoading" />
        </div>
        <ClientOnly>
          <component :is="AgChartsComp" v-if="AgChartsComp" :options="agSpecOptions" style="height: 300px; width: 100%" />
        </ClientOnly>
      </div>

      <!-- 3) TEST - ECharts -->
      <div class="card p-3">
        <div class="mb-2 flex items-center justify-between">
          <h3 class="text-base font-medium">TESTSPC (ECharts)</h3>
          <Button size="small" icon="pi pi-refresh" text @click="fetchAll" :loading="isLoading" />
        </div>
        <ClientOnly>
          <component :is="VChart" v-if="echartsReady && VChart" :option="testLineOptions" autoresize style="height: 300px; width: 100%" />
        </ClientOnly>
      </div>

      <!-- 4) SPEC - ECharts -->
      <div class="card p-3">
        <div class="mb-2 flex items-center justify-between">
          <h3 class="text-base font-medium">TESTSPECSPC (ECharts)</h3>
          <Button size="small" icon="pi pi-refresh" text @click="fetchAll" :loading="isLoading" />
        </div>
        <ClientOnly>
          <component :is="VChart" v-if="echartsReady && VChart" :option="specLineOptions" autoresize style="height: 300px; width: 100%" />
        </ClientOnly>
      </div>
    </div>

    <!-- PrimeVue Chart (TEST) + PrimeVue Chart (SPEC) 세트 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
      <!-- PrimeVue Chart (TEST) -->
      <div class="card p-3">
        <div class="mb-2 flex items-center justify-between">
          <h3 class="text-base font-medium">TESTSPC (PrimeVue Chart)</h3>
          <Button size="small" icon="pi pi-refresh" text @click="fetchAll" :loading="isLoading" />
        </div>
        <ClientOnly>
          <Chart type="line" :data="primeChartData" :options="primeChartOptions" style="height: 300px; width: 100%" />
        </ClientOnly>
      </div>

      <!-- PrimeVue Chart (SPEC) -->
      <div class="card p-3">
        <div class="mb-2 flex items-center justify-between">
          <h3 class="text-base font-medium">TESTSPECSPC (PrimeVue Chart)</h3>
          <Button size="small" icon="pi pi-refresh" text @click="fetchAll" :loading="isLoading" />
        </div>
        <ClientOnly>
          <Chart type="line" :data="primeSpecChartData" :options="primeSpecChartOptions" style="height: 300px; width: 100%" />
        </ClientOnly>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card :deep(.p-button.p-button-icon-only) { padding: 0.25rem; }
</style>