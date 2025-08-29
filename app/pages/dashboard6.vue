<script setup lang='ts'>
definePageMeta({ middleware: 'auth', name: 'Dashboard6' })

import { ref, onMounted, shallowRef, markRaw, computed } from 'vue'

const isLoading = ref(false)
const errorMessage = ref('')

// 데이터 저장
const testRows = ref<any[]>([])
const specRows = ref<any[]>([])
const lastUpdated = ref<string>('')

// KPI
const kpiWidgets = computed(() => [
  { label: 'TEST Rows', value: testRows.value.length },
  { label: 'SPEC Rows', value: specRows.value.length },
  { label: 'Updated', value: lastUpdated.value || '-' },
])

// AG Charts
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

function updateCharts() {
  // TEST chart (group by TAGID)
  const map = new Map<string, any[]>()
  testRows.value.forEach(r => { const k = r.TAGID || 'TAG'; if (!map.has(k)) map.set(k, []); map.get(k)!.push([new Date(r._time).getTime(), r._value]) })
  const seriesTest = Array.from(map.entries()).map(([k, data]) => ({ name: k, type: 'line', showSymbol: false, data }))
  testLineOptions.value = { ...testLineOptions.value, series: seriesTest }
  // AG Charts
  const agSeriesTest = Array.from(map.entries()).map(([k, arr]) => ({ type: 'line', data: arr.map(([x,y]) => ({ x, y })), xKey: 'x', yKey: 'y', yName: k, marker: { enabled: false } }))
  agTestOptions.value = { ...agTestOptions.value, series: agSeriesTest }

  // SPEC chart (value + limits)
  const to = (key: string) => specRows.value.map(r => [new Date(r._time).getTime(), r[key]])
  const seriesSpec = [
    { name: 'VALUE', type: 'line', showSymbol: false, data: to('_value') },
    { name: 'LSL', type: 'line', showSymbol: false, data: to('lsl') },
    { name: 'USL', type: 'line', showSymbol: false, data: to('usl') },
    { name: 'LCL', type: 'line', showSymbol: false, data: to('lcl') },
    { name: 'UCL', type: 'line', showSymbol: false, data: to('ucl') },
  ]
  specLineOptions.value = { ...specLineOptions.value, series: seriesSpec }
  // AG Charts: five series
  agSpecOptions.value = { ...agSpecOptions.value, series: [
    { type: 'line', data: to('_value').map(([x,y]) => ({ x, y })), xKey: 'x', yKey: 'y', yName: 'VALUE', marker: { enabled: false } },
    { type: 'line', data: to('lsl').map(([x,y]) => ({ x, y })), xKey: 'x', yKey: 'y', yName: 'LSL', marker: { enabled: false } },
    { type: 'line', data: to('usl').map(([x,y]) => ({ x, y })), xKey: 'x', yKey: 'y', yName: 'USL', marker: { enabled: false } },
    { type: 'line', data: to('lcl').map(([x,y]) => ({ x, y })), xKey: 'x', yKey: 'y', yName: 'LCL', marker: { enabled: false } },
    { type: 'line', data: to('ucl').map(([x,y]) => ({ x, y })), xKey: 'x', yKey: 'y', yName: 'UCL', marker: { enabled: false } },
  ] }
}

async function fetchAll() {
  isLoading.value = true; errorMessage.value = ''
  try {
    const urlTest = `/api/influx/gettest?${new URLSearchParams({ tag: 'A', bucket: 'testspc', window: '1d', measurement: 'TESTSPC' })}`
    const urlSpec = `/api/influx/getspectest?${new URLSearchParams({ tag: 'A', bucket: 'testspecspc', window: '4h', measurement: 'TESTSPECSPC' })}`
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
  try {
    // ECharts
    const { use } = await import('echarts/core')
    const { LineChart } = await import('echarts/charts')
    const { GridComponent, TooltipComponent, LegendComponent, DataZoomComponent, TitleComponent, ToolboxComponent } = await import('echarts/components')
    const { CanvasRenderer } = await import('echarts/renderers')
    use([LineChart, GridComponent, TooltipComponent, LegendComponent, DataZoomComponent, TitleComponent, ToolboxComponent, CanvasRenderer])
    const modV: any = await import('vue-echarts')
    const Comp = modV.default || modV.VChart || modV.ECharts || modV.echarts || null
    if (Comp) VChart.value = markRaw(Comp)
    echartsReady.value = true

    // AG Charts
    const modAg: any = await import('ag-charts-vue3')
    const AgComp = modAg.AgCharts || modAg.default || null
    if (AgComp) AgChartsComp.value = markRaw(AgComp)

    await fetchAll()
  } catch (e) { console.error('초기화 실패:', e) }
})
</script>

<template>
  <div class="space-y-3">
    <!-- KPI -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
      <div v-for="w in kpiWidgets" :key="w.label" class="card p-3">
        <div class="text-xs text-gray-500">{{ w.label }}</div>
        <div class="text-lg font-semibold text-gray-700 dark:text-gray-100">{{ w.value }}</div>
      </div>
    </div>

    <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>

    <!-- 2x2 대시보드 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <!-- TEST - AG Charts -->
      <div class="card p-3">
        <div class="mb-2 flex items-center justify-between">
          <h3 class="text-base font-medium">TESTSPC (AG Charts)</h3>
          <Button size="small" icon="pi pi-refresh" text @click="fetchAll" :loading="isLoading" />
        </div>
        <ClientOnly>
          <component :is="AgChartsComp" v-if="AgChartsComp" :options="agTestOptions" style="height: 300px; width: 100%" />
        </ClientOnly>
      </div>

      <!-- SPEC - AG Charts -->
      <div class="card p-3">
        <div class="mb-2 flex items-center justify-between">
          <h3 class="text-base font-medium">TESTSPECSPC (AG Charts)</h3>
          <Button size="small" icon="pi pi-refresh" text @click="fetchAll" :loading="isLoading" />
        </div>
        <ClientOnly>
          <component :is="AgChartsComp" v-if="AgChartsComp" :options="agSpecOptions" style="height: 300px; width: 100%" />
        </ClientOnly>
      </div>

      <!-- TEST - ECharts -->
      <div class="card p-3">
        <div class="mb-2 flex items-center justify-between">
          <h3 class="text-base font-medium">TESTSPC (ECharts)</h3>
          <Button size="small" icon="pi pi-refresh" text @click="fetchAll" :loading="isLoading" />
        </div>
        <ClientOnly>
          <component :is="VChart" v-if="echartsReady && VChart" :option="testLineOptions" autoresize style="height: 300px; width: 100%" />
        </ClientOnly>
      </div>

      <!-- SPEC - ECharts -->
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
  </div>
</template>

<style scoped>
.card :deep(.p-button.p-button-icon-only) { padding: 0.25rem; }
</style>
