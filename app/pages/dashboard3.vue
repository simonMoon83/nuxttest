<script setup lang='ts'>
definePageMeta({ middleware: 'auth', name: 'Dashboard3 (FormKit + ECharts)' })

import { ref, onMounted, shallowRef, markRaw, computed, watch } from 'vue'
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'

// FormKit schema helper
const { addElement } = useFormKitSchema()

ModuleRegistry.registerModules([AllCommunityModule])

const colorMode = useColorMode()
const agGridThemeClass = computed(() => colorMode.value === 'dark' ? 'ag-theme-quartz-dark' : 'ag-theme-quartz')

const apiBase = ref<string>(import.meta.client ? (localStorage.getItem('influxApiBase') || 'http://127.0.0.1:8000') : 'http://127.0.0.1:8000')
const isLoading = ref(false)
const errorMessage = ref('')

// 단일 데이터 모델(FormKit와 양방향)
const formData = ref({
  // TEST
  testTagsInput: 'A',
  testBucket: 'testspc',
  testWindow: '1d',
  testMeasurement: 'TESTSPC',
  testStart: '',
  testEnd: '',
  testYMin: '',
  testYMax: '',
  // SPEC
  specTag: 'A',
  specBucket: 'testspecspc',
  specWindow: '4h',
  specMeasurement: 'TESTSPECSPC',
  specStart: '',
  specEnd: '',
  specYMin: '',
  specYMax: '',
})

// FormKit 스키마 (분리)
const schemaTest = ref<any>([
  addElement('h5', ['TEST 조건']),
  { $formkit: 'primeInputText', name: 'testTagsInput', label: 'Tags', help: '쉼표/공백 구분', outerClass: 'col-2' },
  { $formkit: 'primeInputText', name: 'testBucket', label: 'Bucket', outerClass: 'col-2' },
  { $formkit: 'primeInputText', name: 'testWindow', label: 'Window', help: '예: 1d,12h', outerClass: 'col-2' },
  { $formkit: 'primeInputText', name: 'testMeasurement', label: 'Measurement', outerClass: 'col-2' },
  { $formkit: 'primeDatePicker', name: 'testStart', label: 'Start', help: 'YYYY-MM-DD', dateFormat: 'yy-mm-dd', showIcon: true, outerClass: 'col-2', class: 'w-full' },
  { $formkit: 'primeDatePicker', name: 'testEnd', label: 'End', help: 'YYYY-MM-DD', dateFormat: 'yy-mm-dd', showIcon: true, outerClass: 'col-2', class: 'w-full' },
  { $formkit: 'primeInputText', name: 'testYMin', label: 'Y Min', outerClass: 'col-4' },
  { $formkit: 'primeInputText', name: 'testYMax', label: 'Y Max', outerClass: 'col-8' },
  {
    $el: 'div',
    attrs: { class: 'col-12 w-full flex justify-end items-center gap-x-2 mt-1' },
    children: [
      { $cmp: 'Button', props: { label: 'TEST 조회', severity: 'primary', onClick: () => fetchTest() } },
      { $cmp: 'Button', props: { label: 'TEST 범위 적용', severity: 'secondary', onClick: () => updateTestChart() } },
      { $cmp: 'Button', props: { label: 'TEST 초기화', outlined: true, severity: 'secondary', onClick: () => resetTest() } },
    ],
  },
])

const schemaSpec = ref<any>([
  addElement('h5', ['SPEC 조건']),
  { $formkit: 'primeInputText', name: 'specTag', label: 'Tag', outerClass: 'col-3' },
  { $formkit: 'primeInputText', name: 'specBucket', label: 'Bucket', outerClass: 'col-3' },
  { $formkit: 'primeInputText', name: 'specWindow', label: 'Window', help: '예: 4h,1d', outerClass: 'col-3' },
  { $formkit: 'primeInputText', name: 'specMeasurement', label: 'Measurement', outerClass: 'col-3' },
  { $formkit: 'primeDatePicker', name: 'specStart', label: 'Start', help: 'YYYY-MM-DD', dateFormat: 'yy-mm-dd', showIcon: true, outerClass: 'col-3', class: 'w-full' },
  { $formkit: 'primeDatePicker', name: 'specEnd', label: 'End', help: 'YYYY-MM-DD', dateFormat: 'yy-mm-dd', showIcon: true, outerClass: 'col-3', class: 'w-full' },
  { $formkit: 'primeInputText', name: 'specYMin', label: 'Y Min', outerClass: 'col-3' },
  { $formkit: 'primeInputText', name: 'specYMax', label: 'Y Max', outerClass: 'col-3' },
  {
    $el: 'div',
    attrs: { class: 'col-12 w-full flex justify-end items-center gap-x-2 mt-1' },
    children: [
      { $cmp: 'Button', props: { label: 'SPEC 조회', severity: 'primary', onClick: () => fetchSpec() } },
      { $cmp: 'Button', props: { label: 'SPEC 범위 적용', severity: 'secondary', onClick: () => updateSpecChart() } },
      { $cmp: 'Button', props: { label: 'SPEC 초기화', outlined: true, severity: 'secondary', onClick: () => resetSpec() } },
    ],
  },
])

function resetTest() {
  formData.value.testTagsInput = 'A'
  formData.value.testBucket = 'testspc'
  formData.value.testWindow = '1d'
  formData.value.testMeasurement = 'TESTSPC'
  formData.value.testStart = ''
  formData.value.testEnd = ''
  formData.value.testYMin = ''
  formData.value.testYMax = ''
}

function resetSpec() {
  formData.value.specTag = 'A'
  formData.value.specBucket = 'testspecspc'
  formData.value.specWindow = '4h'
  formData.value.specMeasurement = 'TESTSPECSPC'
  formData.value.specStart = ''
  formData.value.specEnd = ''
  formData.value.specYMin = ''
  formData.value.specYMax = ''
}

// 데이터 저장
const testRows = ref<any[]>([])
const specRows = ref<any[]>([])

// AG Grid
const testColumnDefs = ref([
  { field: '_time', headerName: 'Time', sortable: true, filter: true, minWidth: 200 },
  { field: 'TAGID', headerName: 'TAGID', sortable: true, filter: true, minWidth: 100 },
  { field: '_value', headerName: 'Value', sortable: true, filter: 'agNumberColumnFilter', minWidth: 120 },
])
const specColumnDefs = ref([
  { field: '_time', headerName: 'Time', sortable: true, filter: true, minWidth: 200 },
  { field: '_value', headerName: 'Value', sortable: true, filter: 'agNumberColumnFilter', minWidth: 110 },
  { field: 'lsl', headerName: 'LSL', sortable: true, filter: 'agNumberColumnFilter', minWidth: 90 },
  { field: 'usl', headerName: 'USL', sortable: true, filter: 'agNumberColumnFilter', minWidth: 90 },
  { field: 'lcl', headerName: 'LCL', sortable: true, filter: 'agNumberColumnFilter', minWidth: 90 },
  { field: 'ucl', headerName: 'UCL', sortable: true, filter: 'agNumberColumnFilter', minWidth: 90 },
])
const defaultColDef = ref({ flex: 1, minWidth: 100, resizable: true, sortable: true, filter: true })
let testGridApi: any = null
let specGridApi: any = null

function updateGridTheme() {
  if (import.meta.client) {
    const testDiv = document.querySelector('#testGrid3')
    const specDiv = document.querySelector('#specGrid3')
    if (testDiv) {
      testDiv.classList.remove('ag-theme-quartz', 'ag-theme-quartz-dark')
      testDiv.classList.add(agGridThemeClass.value)
    }
    if (specDiv) {
      specDiv.classList.remove('ag-theme-quartz', 'ag-theme-quartz-dark')
      specDiv.classList.add(agGridThemeClass.value)
    }
  }
}
watch(() => colorMode.value, () => updateGridTheme())

// ECharts 동적 컴포넌트 (SSR 회피)
const VChart = shallowRef<any>(null)
const echartsReady = ref(false)

// 공통 옵션(툴박스 + dataZoom)
const baseChartOptions = { 
  tooltip: { trigger: 'axis' }, legend: { top: 0 }, grid: { left: 40, right: 20, top: 40, bottom: 60 },
  toolbox: { show: true, right: 10, feature: { dataZoom: { yAxisIndex: 'none', xAxisIndex: 'all' }, restore: {}, saveAsImage: {} } },
  dataZoom: [ { type: 'inside', zoomOnMouseWheel: true, moveOnMouseWheel: true, moveOnMouseMove: false }, { type: 'slider' } ],
  xAxis: { type: 'time' }, yAxis: { type: 'value' }
}

const testOptions = ref<any>({ title: { text: 'TEST (_value)' }, ...baseChartOptions, series: [] })
const specOptions = ref<any>({ title: { text: 'SPEC (VALUE & LIMITS)' }, ...baseChartOptions, series: [] })

function buildUrl(base: string, path: string, params: Record<string, string | string[] | undefined>) {
  const usp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (Array.isArray(v)) v.forEach(val => usp.append(k, val))
    else if (typeof v === 'string' && v.length > 0) usp.append(k, v)
  })
  return `${base}${path}?${usp.toString()}`
}

function parseTagsInput(input: string): string[] { return input.split(/[\s,]+/).map(s => s.trim()).filter(Boolean) }

function toDayBoundaryMs(input: string | Date, boundary: 'start' | 'end'): number {
  const dateObj = typeof input === 'string' ? new Date(input) : input
  if (Number.isNaN(dateObj?.getTime?.())) {
    return boundary === 'start' ? -Infinity : Infinity
  }
  const year = dateObj.getFullYear()
  const month = dateObj.getMonth()
  const day = dateObj.getDate()
  const at = boundary === 'start' ? new Date(year, month, day, 0, 0, 0, 0) : new Date(year, month, day, 23, 59, 59, 999)
  return at.getTime()
}

function applyDateFilter(rows: any[], start: string | Date, end: string | Date) {
  const hasStart = Boolean(start)
  const hasEnd = Boolean(end)
  if (!hasStart && !hasEnd) {
    return rows
  }
  const startMs = hasStart ? toDayBoundaryMs(start, 'start') : -Infinity
  const endMs = hasEnd ? toDayBoundaryMs(end, 'end') : Infinity
  return rows.filter((row: any) => {
    const timeMs = new Date(row._time).getTime()
    return timeMs >= startMs && timeMs <= endMs
  })
}

function applyValueFilter(rows: any[], minStr: string, maxStr: string, field: string = '_value') {
  const hasMin = minStr !== ''
  const hasMax = maxStr !== ''
  if (!hasMin && !hasMax) {
    return rows
  }
  const min = hasMin ? Number(minStr) : null
  const max = hasMax ? Number(maxStr) : null
  return rows.filter((row: any) => {
    const v = row[field]
    if (v == null || Number.isNaN(Number(v))) return false
    if (min !== null && Number(v) < min) return false
    if (max !== null && Number(v) > max) return false
    return true
  })
}

function updateTestChart() {
  const rows = applyDateFilter(testRows.value, formData.value.testStart, formData.value.testEnd)
  const map = new Map<string, any[]>()
  rows.forEach(r => { const k = r.TAGID || 'TAG'; if (!map.has(k)) map.set(k, []); map.get(k)!.push([new Date(r._time).getTime(), r._value]) })
  const series = Array.from(map.entries()).map(([k, data]) => ({ name: k, type: 'line', showSymbol: false, data }))
  const yMin = formData.value.testYMin !== '' ? Number(formData.value.testYMin) : null
  const yMax = formData.value.testYMax !== '' ? Number(formData.value.testYMax) : null
  testOptions.value = { ...testOptions.value, series, yAxis: { ...testOptions.value.yAxis, min: yMin, max: yMax } }
  const gridRows = applyValueFilter(rows, formData.value.testYMin, formData.value.testYMax, '_value')
  if (testGridApi) {
    testGridApi.setGridOption('rowData', gridRows)
  }
}

function updateSpecChart() {
  const rows = applyDateFilter(specRows.value, formData.value.specStart, formData.value.specEnd)
  const to = (key: string) => rows.map(r => [new Date(r._time).getTime(), r[key]])
  const series = [ { name: 'VALUE', type: 'line', showSymbol: false, data: to('_value') }, { name: 'LSL', type: 'line', showSymbol: false, data: to('lsl') }, { name: 'USL', type: 'line', showSymbol: false, data: to('usl') }, { name: 'LCL', type: 'line', showSymbol: false, data: to('lcl') }, { name: 'UCL', type: 'line', showSymbol: false, data: to('ucl') } ]
  const yMin = formData.value.specYMin !== '' ? Number(formData.value.specYMin) : null
  const yMax = formData.value.specYMax !== '' ? Number(formData.value.specYMax) : null
  specOptions.value = { ...specOptions.value, series, yAxis: { ...specOptions.value.yAxis, min: yMin, max: yMax } }
  const gridRows = applyValueFilter(rows, formData.value.specYMin, formData.value.specYMax, '_value')
  if (specGridApi) {
    specGridApi.setGridOption('rowData', gridRows)
  }
}

async function fetchTest() {
  isLoading.value = true; errorMessage.value = ''
  try {
    const url = buildUrl(apiBase.value, '/gettest', { tag: parseTagsInput(formData.value.testTagsInput), bucket: formData.value.testBucket, window: formData.value.testWindow, measurement: formData.value.testMeasurement })
    const res = await fetch(url); const json = await res.json()
    testRows.value = json?.data || []
    if (testGridApi) testGridApi.setGridOption('rowData', testRows.value)
    updateTestChart()
  } catch (e: any) { errorMessage.value = e?.message || '조회 실패' } finally { isLoading.value = false }
}

async function fetchSpec() {
  isLoading.value = true; errorMessage.value = ''
  try {
    const url = buildUrl(apiBase.value, '/getspectest', { tag: formData.value.specTag, bucket: formData.value.specBucket, window: formData.value.specWindow, measurement: formData.value.specMeasurement })
    const res = await fetch(url); const json = await res.json()
    specRows.value = json?.data || []
    if (specGridApi) specGridApi.setGridOption('rowData', specRows.value)
    updateSpecChart()
  } catch (e: any) { errorMessage.value = e?.message || '조회 실패' } finally { isLoading.value = false }
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

    // AG Grid 생성
    const { createGrid } = await import('ag-grid-community')
    const testOptionsGrid: any = {
      theme: 'legacy', columnDefs: testColumnDefs.value, rowData: [], defaultColDef: defaultColDef.value, animateRows: true,
      rowHeight: 28, headerHeight: 32,
      rowSelection: { mode: 'multiRow' }, pagination: true, paginationPageSize: 20, paginationPageSizeSelector: [20, 50, 100],
      onGridReady: (params: any) => { testGridApi = params.api; updateGridTheme() },
    }
    const specOptionsGrid: any = {
      theme: 'legacy', columnDefs: specColumnDefs.value, rowData: [], defaultColDef: defaultColDef.value, animateRows: true,
      rowHeight: 28, headerHeight: 32,
      rowSelection: { mode: 'multiRow' }, pagination: true, paginationPageSize: 20, paginationPageSizeSelector: [20, 50, 100],
      onGridReady: (params: any) => { specGridApi = params.api; updateGridTheme() },
    }
    const testDiv = document.querySelector('#testGrid3'); if (testDiv) createGrid(testDiv as any, testOptionsGrid)
    const specDiv = document.querySelector('#specGrid3'); if (specDiv) createGrid(specDiv as any, specOptionsGrid)
  } catch (e) { console.error('초기화 실패:', e) }
  try {
    document.querySelectorAll('.fk-date input').forEach((el) => {
      try { (el as HTMLInputElement).readOnly = false } catch {}
    })
  } catch {}
})
</script>

<template>
  <div class="space-y-3">
    <div class="card p-3">
      <div class="flex items-center gap-2 flex-wrap">
        <input v-model="apiBase" class="p-inputtext p-component w-80" placeholder="API Base (http://127.0.0.1:8000)" />
        <span class="text-xs text-gray-500">대시보드에서 저장한 값이 자동 사용됩니다.</span>
      </div>
      <p v-if="errorMessage" class="text-sm text-red-600 mt-2">{{ errorMessage }}</p>
    </div>

    <!-- TEST: 조건 + 차트/표 -->
    <div class="card p-3">
      <div class="compact-form">
        <FormKitDataEdit v-model="formData" :schema="schemaTest" form-class="form-horizontal grid-12" submit-label="" />
      </div>
      <div class="mt-3">
        <ClientOnly>
          <component :is="VChart" v-if="echartsReady && VChart" :option="testOptions" autoresize style="height: 320px; width: 100%" />
        </ClientOnly>
      </div>
      <div class="mt-3">
        <div id="testGrid3" :class="agGridThemeClass" class="ag-grid-container"></div>
      </div>
    </div>

    <!-- SPEC: 조건 + 차트/표 -->
    <div class="card p-3">
      <div class="compact-form">
        <FormKitDataEdit v-model="formData" :schema="schemaSpec" form-class="form-horizontal grid-4" submit-label="" />
      </div>
      <div class="mt-3">
        <ClientOnly>
          <component :is="VChart" v-if="echartsReady && VChart" :option="specOptions" autoresize style="height: 320px; width: 100%" />
        </ClientOnly>
      </div>
      <div class="mt-3">
        <div id="specGrid3" :class="agGridThemeClass" class="ag-grid-container"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ag-grid-container { height: 420px; width: 100%; }

/* grid-4 레이아웃은 전역(app/assets/sass/form.scss)에서 관리 */
</style>
