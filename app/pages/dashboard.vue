<script setup lang='ts'>
// 인증 필요 시 유지
definePageMeta({ middleware: 'auth', name: 'Dashboard' })

import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'
import { ref, computed, watch, onMounted, shallowRef } from 'vue'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'

ModuleRegistry.registerModules([AllCommunityModule])

const colorMode = useColorMode()
const agGridThemeClass = computed(() => {
	return colorMode.value === 'dark' ? 'ag-theme-quartz-dark' : 'ag-theme-quartz'
})

// 차트 컴포넌트 동적 로드
const AgChartsVue = shallowRef<any>(null)
onMounted(async () => {
	try {
		const mod: any = await import('ag-charts-vue3')
		AgChartsVue.value = mod.AgCharts || mod.default || null
	}
	catch {}
})

const apiBase = ref<string>(import.meta.client ? (localStorage.getItem('influxApiBase') || 'http://127.0.0.1:8000') : 'http://127.0.0.1:8000')
const health = ref<'idle' | 'ok' | 'fail'>('idle')

// 검색 조건
const testTagsInput = ref<string>('A')
const testBucket = ref<string>('testspc')
const testWindow = ref<string>('1d')
const testMeasurement = ref<string>('TESTSPC')

const specTag = ref<string>('A')
const specBucket = ref<string>('testspecspc')
const specWindow = ref<string>('4h')
const specMeasurement = ref<string>('TESTSPECSPC')

// 범위 제어 (날짜/Y축)
const testStart = ref<string>('')
const testEnd = ref<string>('')
const testYMin = ref<string>('')
const testYMax = ref<string>('')

const specStart = ref<string>('')
const specEnd = ref<string>('')
const specYMin = ref<string>('')
const specYMax = ref<string>('')

const isLoading = ref(false)
const errorMessage = ref<string>('')

// 최근 조회 데이터 보관
const testRows = ref<any[]>([])
const specRows = ref<any[]>([])

// Grid API
let testGridApi: any = null
let specGridApi: any = null

// Chart options
const testChartOptions = ref<any>({
	autoSize: true,
	legend: { enabled: true },
	title: { text: 'TEST (_value over time)' },
	series: [],
	xAxis: { type: 'time' },
	yAxis: { label: { format: '%.0f' } },
})

const specChartOptions = ref<any>({
	autoSize: true,
	title: { text: 'SPEC (value & limits over time)' },
	legend: { enabled: true },
	series: [],
	xAxis: { type: 'time' },
	yAxis: { label: { format: '%.0f' } },
})

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

const defaultColDef = ref({
	flex: 1,
	minWidth: 100,
	resizable: true,
	sortable: true,
	filter: true,
})

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

function saveApiBase() {
	if (import.meta.client) {
		localStorage.setItem('influxApiBase', apiBase.value)
	}
	checkHealth()
}

async function checkHealth() {
	errorMessage.value = ''
	health.value = 'idle'
	try {
		const res = await fetch(`${apiBase.value}/`)
		health.value = res.ok ? 'ok' : 'fail'
	} catch (e: any) {
		health.value = 'fail'
		errorMessage.value = e?.message || '연결 실패'
	}
}

function buildUrl(base: string, path: string, params: Record<string, string | string[] | undefined>) {
	const usp = new URLSearchParams()
	Object.entries(params).forEach(([k, v]) => {
		if (Array.isArray(v)) {
			v.forEach(val => usp.append(k, val))
		} else if (typeof v === 'string' && v.length > 0) {
			usp.append(k, v)
		}
	})
	return `${base}${path}?${usp.toString()}`
}

function parseTagsInput(input: string): string[] {
	return input
		.split(/[\s,]+/)
		.map(s => s.trim())
		.filter(Boolean)
}

function applyDateFilter(rows: any[], start: string, end: string): any[] {
	if (!start && !end) return rows
	const startDate = start ? new Date(start + 'T00:00:00') : null
	const endDate = end ? new Date(end + 'T23:59:59.999') : null
	return rows.filter(r => {
		const t = new Date(r._time).getTime()
		if (startDate && t < startDate.getTime()) return false
		if (endDate && t > endDate.getTime()) return false
		return true
	})
}

function updateTestChart(data: any[]) {
	const filtered = applyDateFilter(data, testStart.value, testEnd.value)
	const byTag = new Map<string, any[]>()
	for (const row of filtered) {
		const tag = row.TAGID || 'TAG'
		if (!byTag.has(tag)) byTag.set(tag, [])
		byTag.get(tag)!.push({ x: new Date(row._time), y: row._value })
	}
	const series = Array.from(byTag.entries()).map(([tag, points]) => ({
		type: 'line',
		yKey: 'y',
		xKey: 'x',
		data: points,
		title: `TAG ${tag}`,
	}))
	const yMin = testYMin.value !== '' ? Number(testYMin.value) : undefined
	const yMax = testYMax.value !== '' ? Number(testYMax.value) : undefined
	const currentYAxis = testChartOptions.value.yAxis || {}
	testChartOptions.value = { ...testChartOptions.value, series, yAxis: { ...currentYAxis, min: yMin, max: yMax } }
}

function updateSpecChart(data: any[]) {
	const filtered = applyDateFilter(data, specStart.value, specEnd.value)
	const valueSeries = filtered.map(d => ({ x: new Date(d._time), y: d._value }))
	const lslSeries = filtered.map(d => ({ x: new Date(d._time), y: d.lsl }))
	const uslSeries = filtered.map(d => ({ x: new Date(d._time), y: d.usl }))
	const lclSeries = filtered.map(d => ({ x: new Date(d._time), y: d.lcl }))
	const uclSeries = filtered.map(d => ({ x: new Date(d._time), y: d.ucl }))
	const yMin = specYMin.value !== '' ? Number(specYMin.value) : undefined
	const yMax = specYMax.value !== '' ? Number(specYMax.value) : undefined
	const currentYAxis = specChartOptions.value.yAxis || {}
	specChartOptions.value = {
		...specChartOptions.value,
		series: [
			{ type: 'line', xKey: 'x', yKey: 'y', data: valueSeries, title: 'VALUE' },
			{ type: 'line', xKey: 'x', yKey: 'y', data: lslSeries, title: 'LSL' },
			{ type: 'line', xKey: 'x', yKey: 'y', data: uslSeries, title: 'USL' },
			{ type: 'line', xKey: 'x', yKey: 'y', data: lclSeries, title: 'LCL' },
			{ type: 'line', xKey: 'x', yKey: 'y', data: uclSeries, title: 'UCL' },
		],
		yAxis: { ...currentYAxis, min: yMin, max: yMax },
	}
}

async function fetchTest() {
	isLoading.value = true
	errorMessage.value = ''
	try {
		const tags = parseTagsInput(testTagsInput.value)
		const url = buildUrl(apiBase.value, '/gettest', {
			tag: tags,
			bucket: testBucket.value,
			window: testWindow.value,
			measurement: testMeasurement.value,
		})
		const res = await fetch(url)
		const json = await res.json()
		testRows.value = json?.data || []
		if (testGridApi) testGridApi.setGridOption('rowData', testRows.value)
		updateTestChart(testRows.value)
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
		updateSpecChart(specRows.value)
	} catch (e: any) {
		errorMessage.value = e?.message || '조회 실패'
	} finally {
		isLoading.value = false
	}
}

function resetTestRange() {
	testStart.value = ''
	testEnd.value = ''
	testYMin.value = ''
	testYMax.value = ''
	updateTestChart(testRows.value)
}

function resetSpecRange() {
	specStart.value = ''
	specEnd.value = ''
	specYMin.value = ''
	specYMax.value = ''
	updateSpecChart(specRows.value)
}

onMounted(() => {
	checkHealth()
	if (typeof window !== 'undefined') {
		import('ag-grid-community').then(({ createGrid }) => {
			const testOptions: any = {
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
			const specOptions: any = {
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
			if (testDiv) createGrid(testDiv as any, testOptions)
			const specDiv = document.querySelector('#specGrid')
			if (specDiv) createGrid(specDiv as any, specOptions)
		})
	}
})
</script>

<template>
	<div class="space-y-4">
		<div class="card p-4">
			<div class="flex items-center gap-2 mb-2">
				<i class="pi pi-chart-line text-primary" />
				<h2 class="text-xl font-semibold">Dashboard (Influx 통신 테스트)</h2>
			</div>
			<div class="flex items-center gap-2 flex-wrap">
				<input v-model="apiBase" class="p-inputtext p-component w-80" placeholder="API Base (http://127.0.0.1:8000)" />
				<button class="p-button p-component" @click="saveApiBase">
					<span class="p-button-label">저장/헬스체크</span>
				</button>
				<span class="ml-2 text-sm" :class="{ 'text-green-600': health === 'ok', 'text-red-600': health === 'fail' }">
					상태: {{ health }}
				</span>
			</div>
			<p v-if="errorMessage" class="text-sm text-red-600 mt-2">{{ errorMessage }}</p>
		</div>

		<!-- 검색 조건: TEST -->
		<div class="card p-4">
			<h3 class="font-semibold mb-3">TEST 조회 조건</h3>
			<div class="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
				<div>
					<label class="text-xs text-gray-600">Tags (쉼표/공백 구분)</label>
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
			<!-- 범위 제어: TEST -->
			<div class="grid grid-cols-1 md:grid-cols-4 gap-3 items-end mt-3">
				<div>
					<label class="text-xs text-gray-600">Start Date</label>
					<input type="date" v-model="testStart" class="p-inputtext p-component w-full" />
				</div>
				<div>
					<label class="text-xs text-gray-600">End Date</label>
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
				<button class="p-button p-component p-button-secondary" @click="updateTestChart(testRows)">
					<span class="p-button-label">범위 적용</span>
				</button>
				<button class="p-button p-component p-button-outlined" @click="resetTestRange">
					<span class="p-button-label">범위 초기화</span>
				</button>
			</div>
			<div v-if="isLoading" class="text-sm text-gray-500 mt-2">로딩 중...</div>
			<div class="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-3">
				<div>
					<h4 class="font-semibold mb-2">TEST 라인 차트</h4>
					<ClientOnly>
						<component :is="AgChartsVue" v-if="AgChartsVue" :options="testChartOptions" style="height: 360px; width: 100%" />
					</ClientOnly>
				</div>
				<div>
					<h4 class="font-semibold mb-2">TEST 표</h4>
					<div id="testGrid" :class="agGridThemeClass" class="ag-grid-container"></div>
				</div>
			</div>
		</div>

		<!-- 검색 조건: SPEC -->
		<div class="card p-4">
			<h3 class="font-semibold mb-3">SPEC 조회 조건</h3>
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
			<!-- 범위 제어: SPEC -->
			<div class="grid grid-cols-1 md:grid-cols-4 gap-3 items-end mt-3">
				<div>
					<label class="text-xs text-gray-600">Start Date</label>
					<input type="date" v-model="specStart" class="p-inputtext p-component w-full" />
				</div>
				<div>
					<label class="text-xs text-gray-600">End Date</label>
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
				<button class="p-button p-component p-button-secondary" @click="fetchSpec">
					<span class="p-button-label">/getspectest 조회</span>
				</button>
				<button class="p-button p-component p-button-secondary" @click="updateSpecChart(specRows)">
					<span class="p-button-label">범위 적용</span>
				</button>
				<button class="p-button p-component p-button-outlined" @click="resetSpecRange">
					<span class="p-button-label">범위 초기화</span>
				</button>
			</div>
			<div v-if="isLoading" class="text-sm text-gray-500 mt-2">로딩 중...</div>
			<div class="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-3">
				<div>
					<h4 class="font-semibold mb-2">SPEC 라인 차트</h4>
					<ClientOnly>
						<component :is="AgChartsVue" v-if="AgChartsVue" :options="specChartOptions" style="height: 360px; width: 100%" />
					</ClientOnly>
				</div>
				<div>
					<h4 class="font-semibold mb-2">SPEC 표</h4>
					<div id="specGrid" :class="agGridThemeClass" class="ag-grid-container"></div>
				</div>
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
