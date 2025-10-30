<script setup lang='ts'>
// AG Grid Community 모듈들 import
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'
// AG Grid Enterprise 모듈들 import (트리 데이터, 엑셀 내보내기, 셀 선택, 클립보드)
import { CellSelectionModule, ClipboardModule, ExcelExportModule, TreeDataModule } from 'ag-grid-enterprise'
// AG Grid Vue 3 컴포넌트 import
import { AgGridVue } from 'ag-grid-vue3'
// AG Grid CSS 스타일 import
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'

// Props 인터페이스 정의
interface Props {
  title?: string // 그리드 제목
  columnDefs?: any[] // 컬럼 정의 배열
  rowData?: any[] // 행 데이터 배열
  searchQuery?: string // 검색 쿼리 문자열
  gridId?: string // 그리드 ID (동적 컬럼 정보 조회용)
  treeData?: boolean // 트리 데이터 사용 여부
  autoGroupColumnName?: string // 자동 그룹 컬럼 헤더 이름
  editable?: boolean // 편집 가능 여부
  editMode?: 'singleClick' | 'doubleClick' | 'enterKey' // 편집 모드
  rowSelect?: boolean // 행 선택 기능 사용 여부
}

// Props 기본값 설정
const props = withDefaults(defineProps<Props>(), {
  title: '메뉴 트리',
  columnDefs: () => [],
  rowData: () => [],
  searchQuery: '',
  gridId: '',
  treeData: false,
  editable: false,
  editMode: 'singleClick',
  rowSelect: false
})

// Emits 정의 - 부모 컴포넌트로 이벤트 전달
const emit = defineEmits<{
  'grid-ready': [params: any] // 그리드 준비 완료 이벤트
  'cell-double-clicked': [event: any] // 셀 더블클릭 이벤트
  'expand-all': [] // 전체 펼치기 이벤트
  'collapse-all': [] // 전체 접기 이벤트
  'cell-value-changed': [event: any] // 셀 값 변경 이벤트
  'row-editing-started': [event: any] // 행 편집 시작 이벤트
  'row-editing-stopped': [event: any] // 행 편집 종료 이벤트
  'row-added': [row: any]
  'rows-deleted': [rows: any[]]
}>()

// 메뉴 아이템 인터페이스 정의
interface MenuItem {
  id: number
  title: string
  href: string
  icon: string
  parent_id: number | null
  sort_order: number
  is_separator: boolean
  is_active: boolean
}

// AG Grid 모듈 등록 - 필요한 기능들을 활성화
ModuleRegistry.registerModules([AllCommunityModule, TreeDataModule, ExcelExportModule, CellSelectionModule, ClipboardModule])

// 다크모드/라이트모드 감지
const colorMode = useColorMode()
// AG Grid 테마 클래스 계산 (다크모드에 따라 동적 변경)
const agGridThemeClass = computed(() => colorMode.value === 'dark' ? 'ag-theme-quartz-dark' : 'ag-theme-quartz')

// AG Grid 참조 및 API
const agGrid = ref()
const gridApi = shallowRef<any | null>(null)

// 동적 컬럼 정보
const dynamicColumnDefs = ref<any[]>([])

// 값 변환 및 포맷 보조 함수들
function coerceBooleanValue(value: any): boolean {
  if (value === true || value === false) return value
  const str = String(value ?? '').trim().toLowerCase()
  if (str === 'y' || str === 'yes' || str === 'true' || str === '1' || str === 't') return true
  if (str === 'n' || str === 'no' || str === 'false' || str === '0' || str === 'f' || str === '') return false
  return Boolean(value)
}

function formatDateValue(input: any, kind: 'date' | 'datetime'): string {
  if (input == null || input === '') return ''
  if (input instanceof Date && !isNaN(input.getTime())) {
    const y = input.getFullYear()
    const m = String(input.getMonth() + 1).padStart(2, '0')
    const d = String(input.getDate()).padStart(2, '0')
    if (kind === 'datetime') {
      const hh = String(input.getHours()).padStart(2, '0')
      const mm = String(input.getMinutes()).padStart(2, '0')
      return `${y}-${m}-${d} ${hh}:${mm}`
    }
    return `${y}-${m}-${d}`
  }
  const raw = String(input).trim()
  // YYYYMMDD
  if (/^\d{8}$/.test(raw)) {
    const y = Number(raw.slice(0, 4))
    const m = Number(raw.slice(4, 6)) - 1
    const d = Number(raw.slice(6, 8))
    const dt = new Date(y, m, d)
    return isNaN(dt.getTime()) ? raw : formatDateValue(dt, kind)
  }
  // YYYYMMDDHHmmss
  if (/^\d{14}$/.test(raw)) {
    const y = Number(raw.slice(0, 4))
    const m = Number(raw.slice(4, 6)) - 1
    const d = Number(raw.slice(6, 8))
    const hh = Number(raw.slice(8, 10))
    const mm = Number(raw.slice(10, 12))
    const ss = Number(raw.slice(12, 14))
    const dt = new Date(y, m, d, hh, mm, ss)
    return isNaN(dt.getTime()) ? raw : formatDateValue(dt, kind)
  }
  const tryDate = new Date(raw)
  return isNaN(tryDate.getTime()) ? raw : formatDateValue(tryDate, kind)
}

// sp_grid_info 값 정규화 헬퍼들
function toTrimmedString(value: any): string {
  return String(value ?? '').trim()
}
function toLowerTrimmed(value: any): string {
  return toTrimmedString(value).toLowerCase()
}
function toNumberOrUndefined(value: any): number | undefined {
  const n = Number(value)
  return isNaN(n) ? undefined : n
}
function toHideBoolean(value: any): boolean {
  const n = Number(value)
  return !isNaN(n) ? n === 1 : String(value ?? '').trim() === '1'
}

// 데이터 키 매칭 유틸 (대소문자/구분자 무시)
function normalizeKey(input: any): string {
  return String(input ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
}
function findMatchingKey(data: any, expectedField: string): string | null {
  if (!data || typeof data !== 'object') return null
  if (expectedField in data) return expectedField
  const target = normalizeKey(expectedField)
  const keys = Object.keys(data)
  for (const k of keys) {
    if (normalizeKey(k) === target) return k
  }
  return null
}
function smartGet(data: any, expectedField: string): any {
  if (!data) return null
  const key = findMatchingKey(data, expectedField)
  if (key) return (data as any)[key]
  return (data as any)[expectedField]
}
function smartSet(data: any, expectedField: string, newValue: any): boolean {
  if (!data) return false
  const key = findMatchingKey(data, expectedField)
  if (key) { (data as any)[key] = newValue; return true }
  if (expectedField) { (data as any)[expectedField] = newValue; return true }
  return false
}

/**
 * 동적 컬럼 정보 조회 함수
 */
async function loadDynamicColumnDefs() {
  if (!props.gridId) {
    console.log('gridId가 없어서 동적 컬럼 정보를 로드하지 않습니다.')
    return
  }
  
  try {
    const result = await $fetch<any>('/api/stored-procedure/execute', {
      method: 'POST',
      body: {
        procedureName: 'sp_grid_info',
        parameters: {
          case: 'search',
          grid_id: props.gridId
        }
      }
    })
    
    if (result.success && result.data && Array.isArray(result.data)) {
      // 드롭다운 옵션 사전 로드용 맵
      const dropdownPromises: Promise<void>[] = []
      const tempDefs: any[] = result.data.map((col: any) => {
        const def: any = {
          field: toTrimmedString(col.col_id || ''),
          headerName: toTrimmedString(col.col_name || ''),
          width: toNumberOrUndefined(col.col_width) ?? 100,
          hide: toHideBoolean(col.col_hide),
          flex: toNumberOrUndefined(col.col_flex) ?? undefined,
        }

        const colType = toLowerTrimmed(col.col_type || '')
        const editable = props.editable === true

        if (colType === 'text' || colType === '' || !colType) {
          if (editable) def.cellEditor = 'agTextCellEditor'
          def.valueFormatter = (p: any) => (p.value == null ? '' : p.value)
          def.valueGetter = (p: any) => smartGet(p?.data, def.field)
          if (editable) def.valueSetter = (p: any) => smartSet(p?.data, def.field, p.newValue)
        } else if (colType === 'number') {
          def.filter = 'agNumberColumnFilter'
          def.valueParser = (p: any) => {
            const v = Number(p.newValue)
            return isNaN(v) ? null : v
          }
          if (editable) def.cellEditor = 'agTextCellEditor'
          def.valueFormatter = (p: any) => (p.value == null ? '' : p.value)
          def.valueGetter = (p: any) => smartGet(p?.data, def.field)
          if (editable) def.valueSetter = (p: any) => smartSet(p?.data, def.field, (p.newValue == null || p.newValue === '') ? null : Number(p.newValue))
        } else if (colType === 'checkbox' || colType === 'bool' || colType === 'boolean') {
          // 클릭으로 직접 토글되도록 실제 DOM 요소 렌더링
          def.cellRenderer = (p: any) => {
            const input = document.createElement('input')
            input.type = 'checkbox'
            input.checked = coerceBooleanValue(smartGet(p?.data, def.field))
            input.disabled = !editable
            input.addEventListener('click', (ev) => ev.stopPropagation())
            input.addEventListener('change', () => {
              const newVal = !!input.checked
              smartSet(p.data, def.field, newVal)
              try { p.node.setDataValue?.(def.field, newVal) } catch {}
              try { p.api?.refreshCells({ force: true, columns: ['__rownum', def.field] }) } catch {}
            })
            return input
          }
          // 더블클릭 편집 경로 유지
          if (editable) {
            def.editable = true
            def.cellEditor = (params: any) => {
              const e = document.createElement('input')
              e.type = 'checkbox'
              e.checked = coerceBooleanValue(smartGet(params?.data, def.field))
              e.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') params.stopEditing() })
              return { getGui: () => e, afterGuiAttached: () => {}, getValue: () => e.checked, isPopup: () => false }
            }
            def.valueGetter = (p: any) => smartGet(p?.data, def.field)
            def.valueSetter = (p: any) => smartSet(p?.data, def.field, coerceBooleanValue(p.newValue))
          }
        } else if (colType === 'date' || colType === 'datetime') {
          def.filter = 'agDateColumnFilter'
          def.valueFormatter = (p: any) => formatDateValue(p.value, colType === 'datetime' ? 'datetime' : 'date')
          def.valueGetter = (p: any) => smartGet(p?.data, def.field)
          if (editable) {
            def.editable = true
            def.cellEditorPopup = true
            def.cellEditor = (params: any) => {
              const input = document.createElement('input')
              input.type = 'date'
              const raw = smartGet(params?.data, def.field)
              const val = raw ? new Date(raw) : null
              if (val && !isNaN(val.getTime())) input.value = `${val.getFullYear()}-${String(val.getMonth() + 1).padStart(2, '0')}-${String(val.getDate()).padStart(2, '0')}`
              return {
                getGui: () => input,
                afterGuiAttached: () => { input.focus() },
                getValue: () => input.value || null,
                isPopup: () => true
              }
            }
            def.valueSetter = (p: any) => smartSet(p?.data, def.field, p.newValue || null)
          }
        } else if (colType === 'select' || colType === 'dropdown') {
          // 옵션 라벨 포맷팅 (옵션 로드 전/후 모두 동작)
          def.valueFormatter = (p: any) => {
            const v = smartGet(p?.data, def.field)
            const opts = (p.colDef as any)?.__options
            if (Array.isArray(opts)) {
              const m = opts.find((o: any) => String(o.code) === String(v))
              return m ? (m.code_name ?? m.name ?? m.text ?? v ?? '') : (v ?? '')
            }
            // 옵션이 아직 없으면 원시값 표시
            return v ?? ''
          }
          def.valueGetter = (p: any) => smartGet(p?.data, def.field)
          // 코드그룹이 있으면 옵션을 서버에서 로드해 __options에 저장
          const codeGroup = toTrimmedString(col.col_code || '')
          if (codeGroup) {
            dropdownPromises.push((async () => {
              try {
                const codeResult = await $fetch<any>('/api/stored-procedure/execute', {
                  method: 'POST',
                  body: {
                    procedureName: 'sp_code_info',
                    parameters: { case: 'search', plant_code: '1000', code_grp: codeGroup }
                  }
                })
                if (codeResult?.success && Array.isArray(codeResult.data)) {
                  def.__options = codeResult.data
                  // 값 -> 라벨 포맷팅
                  def.valueFormatter = (p: any) => {
                    const v = smartGet(p?.data, def.field)
                    const m = (def.__options || []).find((o: any) => String(o.code) === String(v))
                    return m ? (m.code_name ?? m.name ?? m.text ?? v) : (v ?? '')
                  }
                } else {
                  def.__options = []
                }
              } catch {
                def.__options = []
              }
            })())
          }
          if (editable) {
            def.editable = true
            def.cellEditorPopup = true
            def.cellEditor = (params: any) => {
              const select = document.createElement('select')
              const options = (params.colDef as any).__options || []
              const placeholder = document.createElement('option')
              placeholder.value = ''
              placeholder.text = '-- 선택 --'
              select.appendChild(placeholder)
              options.forEach((opt: any) => {
                const o = document.createElement('option')
                o.value = String(opt.code)
                o.text = String(opt.code_name ?? opt.name ?? opt.text ?? opt.code)
                const cur = smartGet(params?.data, def.field)
                if (String(cur) === String(o.value)) o.selected = true
                select.appendChild(o)
              })
              return {
                getGui: () => select,
                afterGuiAttached: () => { select.focus() },
                getValue: () => select.value || null,
                isPopup: () => true
              }
            }
            def.valueSetter = (p: any) => smartSet(p?.data, def.field, p.newValue || null)
          }
        }

        return def
      })
      // 옵션 로드가 끝나면 일괄 반영
      try { await Promise.allSettled(dropdownPromises) } catch {}
      dynamicColumnDefs.value = tempDefs
    } else {
      console.warn('동적 컬럼 정보가 없거나 잘못된 형식입니다:', result)
    }
  } catch (error) {
    console.error('동적 컬럼 정보 조회 실패:', error)
    
    dynamicColumnDefs.value = []
  }
}

// 기본 컬럼 정의 - 모든 컬럼에 적용되는 기본 설정
const defaultColDef = ref<any>({ 
  resizable: true, // 컬럼 크기 조절 가능
  sortable: true, // 정렬 가능
  filter: true, // 필터링 가능
  editable: props.editable, // 편집 가능 여부
  // 편집 모드에 따른 설정
  ...(props.editable && {
    cellEditor: 'agTextCellEditor', // 기본 텍스트 편집기
    cellEditorPopup: false, // 팝업 편집기 비활성화
    singleClickEdit: props.editMode === 'singleClick', // 편집 모드에 따른 설정
  })
})

// AG Grid 옵션 설정 (트리 데이터가 있을 때만 그룹 관련 설정 적용)
const gridOptions = computed(() => {
  const baseOptions = {
    rowHeight: 28, // 행 높이
    headerHeight: 32, // 헤더 높이
    animateRows: true, // 행 애니메이션 활성화
    enableRangeSelection: true, // 범위 선택 활성화
    enableRangeHandle: true, // 범위 핸들 활성화
    clipboardDelimiter: '\t', // 클립보드 구분자
    suppressScrollOnNewData: true, // 데이터 변경 시 자동 스크롤 방지
    // 편집 관련 설정
    ...(props.editable && {
      editType: 'singleCell' as const, // 개별 셀 편집 모드
      stopEditingWhenCellsLoseFocus: true, // 포커스 잃을 때 편집 종료
      singleClickEdit: props.editMode === 'singleClick', // 편집 모드에 따른 설정
    })
  }
  
  // 트리 데이터가 있을 때만 그룹 관련 설정 추가
  if (props.treeData) {
    return {
      ...baseOptions,
      groupDefaultExpanded: 1, // 기본적으로 1레벨까지 펼쳐짐
    }
  }
  
  return baseOptions
})

// 행 선택 설정
const rowSelection = ref({ 
  mode: 'multiRow' as const, // 다중 행 선택 모드
  checkboxes: true, // 체크박스 표시
  headerCheckbox: true // 헤더 체크박스 표시
})

// 자동 그룹 컬럼 정의 (트리 데이터용)
const autoGroupColumnDef = ref<any>({
  headerName: props.autoGroupColumnName || '메뉴명', // 동적으로 받아온 이름 또는 기본값
  cellRendererParams: { suppressCount: true }, // 카운트 숨김
})

// 고정 좌측 상태/행번호 컬럼
const rowNumberStatusColDef = {
  headerName: ' ',
  field: '__rownum',
  width: 80,
  pinned: 'left' as const,
  editable: false,
  sortable: false,
  filter: false,
  suppressMenu: true,
  cellClass: 'ag-rownum-cell',
  valueGetter: (params: any) => (params?.node?.rowIndex != null ? params.node.rowIndex + 1 : ''),
  cellRenderer: (params: any) => {
    const no = params?.value ?? ''
    const status = params?.data?.__status
    let iconHtml = ''
    if (status === 'N') iconHtml = '<i class="pi pi-plus" style="color:#2563eb;font-size:0.9rem"></i>'
    else if (status === 'D') iconHtml = '<i class="pi pi-minus" style="color:#dc2626;font-size:0.9rem"></i>'
    else if (status === 'M') iconHtml = '<i class="pi pi-pencil" style="color:#d97706;font-size:0.9rem"></i>'
    return iconHtml ? `${iconHtml} <span>${no}</span>` : `<span>${no}</span>`
  }
}

// 자동 컬럼 생성 (rowData 기반) - 동적/props 컬럼이 없을 때만 사용
function buildAutoColumnDefsFromRow(sample: any): any[] {
  if (!sample || typeof sample !== 'object') return []
  const keys = Object.keys(sample).filter(k => k && k !== '__rownum' && k !== '__status')
  return keys.map(k => ({ field: k, headerName: k }))
}

// 최종 컬럼 정의 (동적 컬럼 + props 컬럼 병합 > rowData 자동 생성)
const finalColumnDefs = computed(() => {
  const dynamicDefs = dynamicColumnDefs.value || []
  const propDefs = Array.isArray(props.columnDefs) ? props.columnDefs : []
  
  console.log('AgGrid - 동적 컬럼:', dynamicDefs)
  console.log('AgGrid - Props 컬럼:', propDefs)
  
  // 동적 컬럼과 props 컬럼을 병합
  if (dynamicDefs.length > 0 || propDefs.length > 0) {
    const mergedDefs = [...dynamicDefs]
    
    // props 컬럼을 동적 컬럼과 병합 (같은 field가 있으면 props 컬럼으로 덮어쓰기)
    propDefs.forEach(propDef => {
      const existingIndex = mergedDefs.findIndex(def => def.field === propDef.field)
      if (existingIndex >= 0) {
        // 기존 컬럼을 props 컬럼으로 교체
        console.log(`AgGrid - 컬럼 교체: ${propDef.field}`, propDef)
        mergedDefs[existingIndex] = propDef
      } else {
        // 새로운 컬럼 추가
        console.log(`AgGrid - 컬럼 추가: ${propDef.field}`, propDef)
        mergedDefs.push(propDef)
      }
    })
    
    console.log('AgGrid - 병합된 컬럼:', mergedDefs)
    return mergedDefs
  }
  
  // 자동 생성
  const firstRow = Array.isArray(props.rowData) && props.rowData.length > 0 ? props.rowData[0] : null
  return buildAutoColumnDefsFromRow(firstRow)
})

// 표시용 컬럼 정의: 상태/행번호 컬럼 + 실제 컬럼들
const computedColumnDefs = computed(() => [rowNumberStatusColDef, ...finalColumnDefs.value])

/**
 * AG Grid 준비 완료 이벤트 핸들러
 * @param params AG Grid API 파라미터
 */
function onGridReady(params: any) { 
  gridApi.value = params.api // Grid API 저장
  applyGridFilter() // 초기 필터 적용
  updateGridTheme() // 테마 업데이트
  
  emit('grid-ready', params) // 부모에게 이벤트 전달
}

/**
 * 셀 더블클릭 이벤트 핸들러
 * @param event 더블클릭 이벤트 객체
 */
function onCellDoubleClicked(event: any) { 
  try { 
    // 편집 가능한 셀인 경우 편집 시작
    if (props.editable && event.column && event.column.getColDef().editable !== false) {
      console.log('AgGrid - 더블클릭 편집 시작:', event.column.getColId(), event.column.getColDef())
      gridApi.value?.startEditingCell({
        rowIndex: event.rowIndex,
        colKey: event.column.getColId()
      })
    }
  } catch (error) {
    console.error('AgGrid - 더블클릭 편집 시작 실패:', error)
  }
  emit('cell-double-clicked', event) // 부모에게 이벤트 전달
}

/**
 * 셀 값 변경 이벤트 핸들러
 * @param event 값 변경 이벤트 객체
 */
function onCellValueChanged(event: any) {
  try {
    const row = event?.data
    if (row && row.__status !== 'N') {
      row.__status = 'M'
      refreshStatusCells()
    }
  } catch {}
  emit('cell-value-changed', event)
}

/**
 * 행 편집 시작 이벤트 핸들러
 * @param event 편집 시작 이벤트 객체
 */
function onRowEditingStarted(event: any) {
  console.log('AgGrid - 행 편집 시작:', event)
  console.log('AgGrid - 편집 시작 컬럼:', event.column?.getColId())
  console.log('AgGrid - 편집 시작 컬럼 정의:', event.column?.getColDef())
  emit('row-editing-started', event)
}

/**
 * 행 편집 종료 이벤트 핸들러
 * @param event 편집 종료 이벤트 객체
 */
function onRowEditingStopped(event: any) {
  console.log('AgGrid - 행 편집 종료:', event)
  emit('row-editing-stopped', event)
}

// 다른 로우로 포커스 이동 시 편집 종료
function tryStopEditingOnRowChange(newRowIndex: number | null | undefined) {
  try {
    const api = gridApi.value
    if (!api) return
    const editingCells = api.getEditingCells?.() || []
    if (editingCells.length === 0) return
    const currentRowIndex = editingCells[0]?.rowIndex
    if (newRowIndex != null && currentRowIndex != null && newRowIndex !== currentRowIndex) {
      api.stopEditing?.()
    }
  } catch {}
}

function onCellFocused(event: any) {
  tryStopEditingOnRowChange(event?.rowIndex)
}

function onRowClicked(event: any) {
  tryStopEditingOnRowChange(event?.rowIndex)
}

/**
 * 정렬 또는 필터 변경 시 호출되는 함수
 */
function onSortOrFilterChanged() {
  refreshStatusCells()
}

/**
 * 트리 데이터 경로 계산 함수
 * @param data 행 데이터
 * @returns 경로 배열
 */
function getDataPath(data: any) { 
  return data.orgHierarchy || [] 
}

/**
 * 전체 펼치기 함수
 */
function expandAllGrid() { 
  if (gridApi.value && props.treeData) {
    gridApi.value.expandAll()
    emit('expand-all')
  }
}

/**
 * 전체 접기 함수
 */
function collapseAllGrid() { 
  if (gridApi.value && props.treeData) {
    gridApi.value.collapseAll()
    emit('collapse-all')
  }
}

/**
 * AG Grid 테마 업데이트 함수
 * 다크모드/라이트모드 변경 시 테마 클래스 동적 변경
 */
function updateGridTheme() { 
  if (import.meta.client) { 
    const div = document.querySelector('.ag-grid-menu4')
    if (div) { 
      // 기존 테마 클래스 제거
      div.classList.remove('ag-theme-quartz', 'ag-theme-quartz-dark')
      // 새로운 테마 클래스 추가
      div.classList.add(agGridThemeClass.value) 
    } 
  } 
}

/**
 * AG Grid 필터 적용 함수
 * searchQuery를 기반으로 Quick Filter 적용
 */
function applyGridFilter() { 
  if (!gridApi.value) return
  const q = props.searchQuery.toLowerCase().trim()
  gridApi.value.setGridOption('quickFilterText', q) 
}

/**
 * 외부에서 필터 적용을 위한 메서드
 * 부모 컴포넌트에서 호출 가능
 */
function applyExternalFilter() {
  applyGridFilter()
}

/**
 * 엑셀 내보내기 함수
 * 현재 그리드 데이터를 엑셀 파일로 내보내기
 */
function exportExcel() { 
  const api = gridApi.value
  if (api) api.exportDataAsExcel({ fileName: 'MenuList', sheetName: 'Menus' }) 
}

// 행 추가/삭제 동작
function addRow() {
  const fields = finalColumnDefs.value.map((c: any) => c?.field).filter((f: any) => f && f !== '__rownum')
  const newRow: any = {}
  fields.forEach((f: string) => { newRow[f] = null })
  newRow.__status = 'N'
  const api = gridApi.value
  try {
    if (api?.applyTransaction) {
      api.applyTransaction({ add: [newRow] })
    } else {
      (props.rowData as any[]).push(newRow)
    }
    try { newlyAddedRows.value.add(newRow) } catch {}
    emit('row-added', newRow)
    nextTick(() => refreshStatusCells())
  } catch {
    // fallback push
    try {
      (props.rowData as any[]).push(newRow)
      try { newlyAddedRows.value.add(newRow) } catch {}
      emit('row-added', newRow)
      nextTick(() => refreshStatusCells())
    } catch {}
  }
}

// 외부에서 호출할 수 있는 메서드들을 expose
const exposeMethods = {
  expandAll: expandAllGrid, // 전체 펼치기
  collapseAll: collapseAllGrid, // 전체 접기
  exportExcel, // 엑셀 내보내기
  applyFilter: applyExternalFilter, // 필터 적용
  getGridApi: () => gridApi.value, // Grid API 반환
  loadDynamicColumnDefs, // 동적 컬럼 정보 로드
  getDynamicColumnDefs: () => dynamicColumnDefs.value, // 동적 컬럼 정보 반환
  markDeleted: (row: any) => { if (row) { row.__status = 'D'; refreshStatusCells() } },
  clearStatuses: () => {
    try {
      const rows = Array.isArray(props.rowData) ? props.rowData : []
      rows.forEach((r: any) => { if (r && r.__status) delete r.__status })
      refreshStatusCells()
    } catch {}
  },
  addRow,
  deleteSelectedRows,
  stopEditing: () => { try { gridApi.value?.stopEditing?.() } catch {} },
  // 현재 그리드의 모든 행 데이터 반환 (필터/소트 무시, 내부 스토어 기준)
  getAllRows: (): any[] => {
    const api = gridApi.value
    const out: any[] = []
    try {
      if (api?.forEachNode) {
        api.forEachNode((node: any) => { if (node?.data) out.push(node.data) })
      } else if (api?.getDisplayedRowCount && api?.getDisplayedRowAtIndex) {
        const n = api.getDisplayedRowCount()
        for (let i = 0; i < n; i++) {
          const node = api.getDisplayedRowAtIndex(i)
          if (node?.data) out.push(node.data)
        }
      }
    } catch {}
    return out
  },
  // 변경된 행들만 반환
  getChangedRows: (): { added: any[], modified: any[], deleted: any[] } => {
    const all = (exposeMethods as any).getAllRows?.() as any[] || []
    const addedSet = new Set<any>()
    try { newlyAddedRows.value.forEach((r: any) => { if (r && r.__status !== 'D') addedSet.add(r) }) } catch {}
    all.forEach((r: any) => { if (r && r.__status === 'N') addedSet.add(r) })
    const added = Array.from(addedSet)
    const modified = all.filter((r: any) => r && r.__status === 'M')
    const deleted = all.filter((r: any) => r && r.__status === 'D')
    return { added, modified, deleted }
  },
}

// 부모 컴포넌트에서 메서드 호출 가능하도록 expose
defineExpose(exposeMethods)

// 감시자들 (Watchers)
// 다크모드 변경 시 테마 업데이트
watch(() => colorMode.value, () => updateGridTheme())

// 검색 쿼리 변경 시 필터 적용
watch(() => props.searchQuery, () => {
  nextTick(() => applyGridFilter())
})

// 행 데이터 변경 시 필터 적용
watch(() => props.rowData, () => {
  if (gridApi.value) {
    nextTick(() => applyGridFilter())
  }
}, { deep: true })

// 행 추가 감지 및 상태 관리: 기존/신규 행 추적
const seenRows = shallowRef<WeakSet<any>>(new WeakSet<any>())
// 신규 추가 행들을 별도로 추적하여 저장 시 누락 방지
const newlyAddedRows = shallowRef<Set<any>>(new Set<any>())

// 배열 레퍼런스가 바뀌면(조회/재조회 등) 현재 데이터는 기준선으로 간주: 상태 제거 및 베이스라인 등록
watch(() => props.rowData, (newRows) => {
  const rows = Array.isArray(newRows) ? newRows : []
  try { rows.forEach(r => { if (r && typeof r === 'object' && r.__status) delete r.__status }) } catch {}
  seenRows.value = new WeakSet<any>()
  rows.forEach(r => { if (r && typeof r === 'object') seenRows.value.add(r) })
  refreshStatusCells()
}, { immediate: true })

// push 등으로 기존 배열에 추가된 새 객체만 N 표기
watch(() => props.rowData, (newRows) => {
  const rows = Array.isArray(newRows) ? newRows : []
  let marked = false
  rows.forEach(r => {
    if (r && typeof r === 'object' && !seenRows.value.has(r)) {
      seenRows.value.add(r)
      if (!r.__status) r.__status = 'N'
      marked = true
    }
  })
  if (marked) refreshStatusCells()
}, { deep: true })

// grid_id 변경 시 동적 컬럼 정보 다시 로드
watch(() => props.gridId, async (newGridId, oldGridId) => {
  if (newGridId && newGridId !== oldGridId) {
    await loadDynamicColumnDefs()
  }
})

function refreshStatusCells() {
  const api = gridApi.value
  try { api?.refreshCells({ force: true, columns: ['__rownum'] }) } catch {}
}

function deleteSelectedRows() {
  const api = gridApi.value
  if (!api) return
  // 삭제 전 포커스/스크롤 위치 보존
  const focusedCell = api.getFocusedCell?.()
  let prevRowIndex: number | null = focusedCell?.rowIndex ?? null
  let prevColId: any = null
  try {
    prevColId = focusedCell?.column?.getColId ? focusedCell.column.getColId() : (focusedCell?.column || focusedCell?.colId)
  } catch {
    prevColId = focusedCell?.colId
  }
  // 현재 스크롤 위치 및 첫 표시 행 저장 (포커스가 없을 때 복원용)
  let prevScrollTop: number | null = null
  let firstDisplayedRow: number | null = null
  try {
    const host = (agGrid as any)?.value?.$el as HTMLElement | undefined
    const viewport = host?.querySelector?.('.ag-body-viewport') as HTMLElement | undefined
    if (viewport) prevScrollTop = viewport.scrollTop
  } catch {}
  try { firstDisplayedRow = typeof api.getFirstDisplayedRow === 'function' ? api.getFirstDisplayedRow() : null } catch {}
  let rows = api.getSelectedRows?.() || []
  // 선택이 없으면 포커스된 셀의 행으로 대체
  if (!rows.length && api.getFocusedCell) {
    const focused = api.getFocusedCell()
    if (focused && focused.rowIndex != null) {
      const node = api.getDisplayedRowAtIndex?.(focused.rowIndex)
      if (node?.data) rows = [node.data]
    }
  }
  if (!rows.length) return
  const toRemove: any[] = []
  rows.forEach((r: any) => {
    if (!r) return
    if (r.__status === 'N') {
      toRemove.push(r)
      try { newlyAddedRows.value.delete(r) } catch {}
    } else {
      r.__status = 'D'
    }
  })
  if (toRemove.length) {
    try { api.applyTransaction?.({ remove: toRemove }) } catch {}
  }
  emit('rows-deleted', rows)
  refreshStatusCells()
  // 삭제 후 포커스/스크롤 복원
  nextTick(() => {
    try {
      // 1) 스크롤이 있었으면 정확히 스크롤만 복원 (포커스 없어도 동작)
      const host = (agGrid as any)?.value?.$el as HTMLElement | undefined
      const viewport = host?.querySelector?.('.ag-body-viewport') as HTMLElement | undefined
      if (viewport && prevScrollTop != null) {
        viewport.scrollTop = prevScrollTop
      }

      // 2) 포커스가 있었던 경우에만 포커스/가시영역 보정 수행
      const hadFocus = typeof prevRowIndex === 'number'
      const rowCount = api.getDisplayedRowCount?.() ?? 0
      if (rowCount <= 0) return
      if (hadFocus) {
        let targetRowIndex = prevRowIndex as number
        if (targetRowIndex >= rowCount) targetRowIndex = rowCount - 1
        api.ensureIndexVisible?.(targetRowIndex)
        const colId = typeof prevColId === 'string' ? prevColId : (prevColId?.colId || prevColId)
        if (colId != null) api.setFocusedCell?.(targetRowIndex, colId)
      } else if (firstDisplayedRow != null) {
        // 포커스가 없었다면 기존 첫 표시 행을 그대로 유지
        let target = firstDisplayedRow
        if (target >= rowCount) target = rowCount - 1
        api.ensureIndexVisible?.(target)
      }
    } catch {}
  })
}

// 컴포넌트 마운트 시 초기화
onMounted(async () => {
  updateGridTheme()
  if (props.gridId) {
    await loadDynamicColumnDefs()
  } else {
    console.log('gridId가 없어서 동적 컬럼 정보를 로드하지 않습니다.')
  }
})
</script>

<template>
  <div class="w-full">
    <!-- AG Grid 헤더 영역 - 제목과 컨트롤 버튼들 -->
    <div class="flex items-center gap-2 mb-1">
      <h5 class="m-0">{{ title }}</h5>
             <!-- 트리 데이터가 있을 때만 펼치기/접기 버튼 표시 -->
      <template v-if="props.treeData">
        <Button icon="pi pi-angle-double-down" text size="small" v-tooltip.bottom="'전체 펼치기'" @click="expandAllGrid" />
        <Button icon="pi pi-angle-double-up" text size="small" v-tooltip.bottom="'전체 접기'" @click="collapseAllGrid" />
      </template>

      <!-- 우측 액션 버튼: 엑셀, 행 추가/행 삭제 -->
      <div class="ml-auto flex items-center gap-1">
        <Button icon="pi pi-file-excel" label="엑셀" size="small" text severity="success" @click="exportExcel" />
        <Button v-if="props.editable" icon="pi pi-plus" label="행추가" size="small" text severity="primary" @click="addRow" />
        <Button v-if="props.editable" icon="pi pi-minus" label="행삭제" size="small" text severity="danger" @click="deleteSelectedRows" />
      </div>
    </div>

    <!-- AG Grid 컨테이너 - 테마 클래스와 스타일 적용 -->
    <div :class="agGridThemeClass" class="ag-grid-menu4" style="height: 550px; width: 100%;">
      <div class="datatable-header"></div>
      <!-- AG Grid Vue 컴포넌트 -->
      <AgGridVue
         ref="agGrid"
         :row-data="rowData"
         :column-defs="computedColumnDefs"
         :default-col-def="defaultColDef"
         :row-selection="props.rowSelect ? rowSelection : undefined"
         :tree-data="props.treeData"
         :get-data-path="props.treeData ? getDataPath : undefined"
         :auto-group-column-def="props.treeData ? autoGroupColumnDef : undefined"
         :grid-options="gridOptions"
         :animate-rows="true"
         theme="legacy"
         style="width: 100%; height: calc(100% - 8px);"
         @grid-ready="onGridReady"
         @cell-double-clicked="onCellDoubleClicked"
         @cell-value-changed="onCellValueChanged"
         @row-editing-started="onRowEditingStarted"
         @row-editing-stopped="onRowEditingStopped"
         @cell-focused="onCellFocused"
         @row-clicked="onRowClicked"
         @sort-changed="onSortOrFilterChanged"
         @filter-changed="onSortOrFilterChanged"
       />
    </div>
  </div>
</template>

<style scoped>
.field {
  margin-bottom: 1rem;
}

/* 왼쪽 번호/상태 열 배경을 헤더와 유사하게 */
:deep(.ag-rownum-cell) {
  background-color: var(--ag-header-background-color, var(--p-surface-ground));
}
</style>
