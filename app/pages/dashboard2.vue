<script setup lang='ts'>
definePageMeta({ middleware: 'auth', name: 'Dashboard2 (ECharts)' })

import { ref, onMounted, shallowRef, markRaw, computed, watch } from 'vue'
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'

ModuleRegistry.registerModules([AllCommunityModule])

const colorMode = useColorMode()
const agGridThemeClass = computed(() => colorMode.value === 'dark' ? 'ag-theme-quartz-dark' : 'ag-theme-quartz')

const apiBase = ref<string>(import.meta.client ? (localStorage.getItem('influxApiBase') || 'http://127.0.0.1:8000') : 'http://127.0.0.1:8000')
const isLoading = ref(false)
const errorMessage = ref('')

// 검색 조건
const testTagsInput = ref('A')
const testBucket = ref('testspc')
const testWindow = ref('1d')
const testMeasurement = ref('TESTSPC')

const specTag = ref('A')
const specBucket = ref('testspecspc')
const specWindow = ref('4h')
const specMeasurement = ref('TESTSPECSPC')

// 범위 제어
const testStart = ref('')
const testEnd = ref('')
const testYMin = ref('')
const testYMax = ref('')

const specStart = ref('')
const specEnd = ref('')
const specYMin = ref('')
const specYMax = ref('')

// 데이터 저장
const testRows = ref<any[]>([])
const specRows = ref<any[]>([])

// AG Grid: 컬럼/기본설정/API
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
    const testDiv = document.querySelector('#testGrid')
    const specDiv = document.querySelector('#specGrid')
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

// ECharts 옵션
const testOptions = ref<any>({
  title: { text: 'TEST (_value)' },
  tooltip: { trigger: 'axis' },
  legend: { top: 0 },
  grid: { left: 40, right: 20, top: 40, bottom: 60 },
  toolbox: { show: true, right: 10, feature: { dataZoom: { yAxisIndex: 'none', xAxisIndex: 'all' }, restore: {}, saveAsImage: {} } },
  dataZoom: [
    { type: 'inside', zoomOnMouseWheel: true, moveOnMouseWheel: true, moveOnMouseMove: false, brushSelect: true },
    { type: 'slider' },
  ],
  xAxis: { type: 'time' },
  yAxis: { type: 'value' },
  series: []
})

const specOptions = ref<any>({
  title: { text: 'SPEC (VALUE & LIMITS)' },
  tooltip: { trigger: 'axis' },
  legend: { top: 0 },
  grid: { left: 40, right: 20, top: 40, bottom: 60 },
  toolbox: { show: true, right: 10, feature: { dataZoom: { yAxisIndex: 'none', xAxisIndex: 'all' }, restore: {}, saveAsImage: {} } },
  dataZoom: [
    { type: 'inside', zoomOnMouseWheel: true, moveOnMouseWheel: true, moveOnMouseMove: false, brushSelect: true },
    { type: 'slider' },
  ],
  xAxis: { type: 'time' },
  yAxis: { type: 'value' },
  series: []
})

function buildUrl(base: string, path: string, params: Record<string, string | string[] | undefined>) {
  const usp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (Array.isArray(v)) v.forEach(val => usp.append(k, val))
    else if (typeof v === 'string' && v.length > 0) usp.append(k, v)
  })
  return `${base}${path}?${usp.toString()}`
}

function parseTagsInput(input: string): string[] {
  return input.split(/[\s,]+/).map(s => s.trim()).filter(Boolean)
}

function applyDateFilter(rows: any[], start: string, end: string) {
  if (!start && !end) return rows
  const s = start ? new Date(start + 'T00:00:00').getTime() : -Infinity
  const e = end ? new Date(end + 'T23:59:59.999').getTime() : Infinity
  return rows.filter(r => {
    const t = new Date(r._time).getTime()
    return t >= s && t <= e
  })
}

function updateTestChart() {
  const rows = applyDateFilter(testRows.value, testStart.value, testEnd.value)
  const map = new Map<string, any[]>()
  rows.forEach(r => {
    const k = r.TAGID || 'TAG'
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push([new Date(r._time).getTime(), r._value])
  })
  const series = Array.from(map.entries()).map(([k, data]) => ({ name: k, type: 'line', showSymbol: false, data }))
  const yMin = testYMin.value !== '' ? Number(testYMin.value) : null
  const yMax = testYMax.value !== '' ? Number(testYMax.value) : null
  testOptions.value = { ...testOptions.value, series, yAxis: { ...testOptions.value.yAxis, min: yMin, max: yMax } }
}

function updateSpecChart() {
  const rows = applyDateFilter(specRows.value, specStart.value, specEnd.value)
  const to = (key: string) => rows.map(r => [new Date(r._time).getTime(), r[key]])
  const series = [
    { name: 'VALUE', type: 'line', showSymbol: false, data: to('_value') },
    { name: 'LSL', type: 'line', showSymbol: false, data: to('lsl') },
    { name: 'USL', type: 'line', showSymbol: false, data: to('usl') },
    { name: 'LCL', type: 'line', showSymbol: false, data: to('lcl') },
    { name: 'UCL', type: 'line', showSymbol: false, data: to('ucl') },
  ]
  const yMin = specYMin.value !== '' ? Number(specYMin.value) : null
  const yMax = specYMax.value !== '' ? Number(specYMax.value) : null
  specOptions.value = { ...specOptions.value, series, yAxis: { ...specOptions.value.yAxis, min: yMin, max: yMax } }
}

async function fetchTest() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const url = buildUrl(apiBase.value, '/gettest', {
      tag: parseTagsInput(testTagsInput.value),
      bucket: testBucket.value,
      window: testWindow.value,
      measurement: testMeasurement.value,
    })
    const res = await fetch(url)
    const json = await res.json()
    testRows.value = json?.data || []
    if (testGridApi) testGridApi.setGridOption('rowData', testRows.value)
    updateTestChart()
  } catch (e: any) {
    errorMessage.value = e?.message || '조회 실패'
  } finally {
    isLoading.value = false
  }
}

async function fetchSpec() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const url = buildUrl(apiBase.value, '/getspectest', {
      tag: specTag.value,
      bucket: specBucket.value,
      window: specWindow.value,
      measurement: specMeasurement.value,
    })
    const res = await fetch(url)
    const json = await res.json()
    specRows.value = json?.data || []
    if (specGridApi) specGridApi.setGridOption('rowData', specRows.value)
    updateSpecChart()
  } catch (e: any) {
    errorMessage.value = e?.message || '조회 실패'
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

    // AG Grid 생성
    const { createGrid } = await import('ag-grid-community')
    const testOptionsGrid: any = {
      theme: 'legacy',
      columnDefs: testColumnDefs.value,
      rowData: [],
      defaultColDef: defaultColDef.value,
      animateRows: true,
      rowSelection: { mode: 'multiRow' },
      pagination: true,
      paginationPageSize: 20,
      paginationPageSizeSelector: [20, 50, 100],
      onGridReady: (params: any) => {
        testGridApi = params.api
        updateGridTheme()
      },
    }
    const specOptionsGrid: any = {
      theme: 'legacy',
      columnDefs: specColumnDefs.value,
      rowData: [],
      defaultColDef: defaultColDef.value,
      animateRows: true,
      rowSelection: { mode: 'multiRow' },
      pagination: true,
      paginationPageSize: 20,
      paginationPageSizeSelector: [20, 50, 100],
      onGridReady: (params: any) => {
        specGridApi = params.api
        updateGridTheme()
      },
    }
    const testDiv = document.querySelector('#testGrid')
    if (testDiv) createGrid(testDiv as any, testOptionsGrid)
    const specDiv = document.querySelector('#specGrid')
    if (specDiv) createGrid(specDiv as any, specOptionsGrid)
  } catch (e) {
    console.error('초기화 실패:', e)
  }
})
</script>

<template>
  <div class="space-y-4">
    <div class="card p-4">
      <div class="flex items-center gap-2 mb-2">
        <i class="pi pi-chart-line text-primary" />
        <h2 class="text-xl font-semibold">Dashboard2 (ECharts)</h2>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <input v-model="apiBase" class="p-inputtext p-component w-80" placeholder="API Base (http://127.0.0.1:8000)" />
        <span class="text-xs text-gray-500">대시보드에서 저장한 값이 자동 사용됩니다.</span>
      </div>
      <p v-if="errorMessage" class="text-sm text-red-600 mt-2">{{ errorMessage }}</p>
    </div>

    <!-- TEST 조건/차트/표 -->
    <div class="card p-4">
      <h3 class="font-semibold mb-3">TEST 조건</h3>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <div>
          <label class="text-xs text-gray-600">Tags</label>
          <input v-model="testTagsInput" class="p-inputtext p-component w-full" placeholder="예: A, B, C" />
        </div>
        <div>
          <label class="text-xs text-gray-600">Bucket</label>
          <input v-model="testBucket" class="p-inputtext p-component w-full" />
        </div>
        <div>
          <label class="text-xs text-gray-600">Window</label>
          <select v-model="testWindow" class="p-inputtext p-component w-full">
            <option value="1d">1d</option>
            <option value="12h">12h</option>
            <option value="6h">6h</option>
            <option value="1h">1h</option>
          </select>
        </div>
        <div>
          <label class="text-xs text-gray-600">Measurement</label>
          <input v-model="testMeasurement" class="p-inputtext p-component w-full" />
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-3 items-end mt-3">
        <div>
          <label class="text-xs text-gray-600">Start</label>
          <input type="date" v-model="testStart" class="p-inputtext p-component w-full" />
        </div>
        <div>
          <label class="text-xs text-gray-600">End</label>
          <input type="date" v-model="testEnd" class="p-inputtext p-component w-full" />
        </div>
        <div>
          <label class="text-xs text-gray-600">Y Min</label>
          <input type="number" v-model="testYMin" class="p-inputtext p-component w-full" placeholder="자동" />
        </div>
        <div>
          <label class="text-xs text-gray-600">Y Max</label>
          <input type="number" v-model="testYMax" class="p-inputtext p-component w-full" placeholder="자동" />
        </div>
      </div>
      <div class="mt-3 flex gap-2 items-center">
        <button class="p-button p-component" @click="fetchTest">
          <span class="p-button-label">/gettest 조회</span>
        </button>
        <button class="p-button p-component p-button-secondary" @click="updateTestChart()">
          <span class="p-button-label">범위 적용</span>
        </button>
      </div>
      <ClientOnly>
        <component :is="VChart" v-if="echartsReady && VChart" :option="testOptions" autoresize style="height: 380px; width: 100%" />
      </ClientOnly>
      <div class="mt-4">
        <h4 class="font-semibold mb-2">TEST 표</h4>
        <div id="testGrid" :class="agGridThemeClass" class="ag-grid-container"></div>
      </div>
    </div>

    <!-- SPEC 조건/차트/표 -->
    <div class="card p-4">
      <h3 class="font-semibold mb-3">SPEC 조건</h3>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <div>
          <label class="text-xs text-gray-600">Tag</label>
          <input v-model="specTag" class="p-inputtext p-component w-full" placeholder="예: A" />
        </div>
        <div>
          <label class="text-xs text-gray-600">Bucket</label>
          <input v-model="specBucket" class="p-inputtext p-component w-full" />
        </div>
        <div>
          <label class="text-xs text-gray-600">Window</label>
          <select v-model="specWindow" class="p-inputtext p-component w-full">
            <option value="4h">4h</option>
            <option value="1d">1d</option>
            <option value="12h">12h</option>
            <option value="6h">6h</option>
            <option value="1h">1h</option>
          </select>
        </div>
        <div>
          <label class="text-xs text-gray-600">Measurement</label>
          <input v-model="specMeasurement" class="p-inputtext p-component w-full" />
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-3 items-end mt-3">
        <div>
          <label class="text-xs text-gray-600">Start</label>
          <input type="date" v-model="specStart" class="p-inputtext p-component w-full" />
        </div>
        <div>
          <label class="text-xs text-gray-600">End</label>
          <input type="date" v-model="specEnd" class="p-inputtext p-component w-full" />
        </div>
        <div>
          <label class="text-xs text-gray-600">Y Min</label>
          <input type="number" v-model="specYMin" class="p-inputtext p-component w-full" placeholder="자동" />
        </div>
        <div>
          <label class="text-xs text-gray-600">Y Max</label>
          <input type="number" v-model="specYMax" class="p-inputtext p-component w-full" placeholder="자동" />
        </div>
      </div>
      <div class="mt-3 flex gap-2 items-center">
        <button class="p-button p-component p-button-secondary" @click="fetchSpec()">
          <span class="p-button-label">/getspectest 조회</span>
        </button>
        <button class="p-button p-component p-button-secondary" @click="updateSpecChart()">
          <span class="p-button-label">범위 적용</span>
        </button>
      </div>
      <ClientOnly>
        <component :is="VChart" v-if="echartsReady && VChart" :option="specOptions" autoresize style="height: 380px; width: 100%" />
      </ClientOnly>
      <div class="mt-4">
        <h4 class="font-semibold mb-2">SPEC 표</h4>
        <div id="specGrid" :class="agGridThemeClass" class="ag-grid-container"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ag-grid-container {
  height: 420px;
  width: 100%;
}
</style>
