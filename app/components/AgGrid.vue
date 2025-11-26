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

import type { ColDef, GridApi, ValueFormatterParams } from 'ag-grid-community'
import type {
  AgGridProps,
  ChangedRows,
  DynamicColumnDef,
  EditPolicy,
  GridInfoColumn,
  SaveResult,
  StatusRow,
} from '~/types/ag-grid'
import {
  buildAutoColumnDefsFromRow,
  coerceBooleanValue,
  coerceCheckboxToBit,
  coerceEditPolicy,
  findMatchingKey,
  formatDateValue,
  isNewRow,
  pickSaveFields,
  smartGet,
  smartSet,
  toHideBoolean,
  toLowerTrimmed,
  toNumberOrUndefined,
  toTrimmedString,
} from '~/composables/useAgGridUtils'

/**
 * 컴포넌트 개요
 * - AG Grid(Vue3) 래퍼 컴포넌트
 * - 기능: 동적 컬럼 로드(sp_grid_info), 코드 옵션 로드(sp_code_info), 편집/삭제/추가, 트리 데이터,
 *         엑셀 내보내기, 빠른 검색(Quick Filter), 라이트/다크 테마 전환, 상태 아이콘 표기(__rownum 열)
 * - props: title, columnDefs, rowData, searchQuery, gridId, treeData, editable, editMode, rowSelect 등
 * - emits: grid-ready, cell-double-clicked, cell-value-changed, row-editing-started/row-editing-stopped,
 *          row-added, rows-deleted, expand-all, collapse-all
 * - expose: expandAll, collapseAll, exportExcel, applyFilter, getGridApi, loadDynamicColumnDefs,
 *           getDynamicColumnDefs, markDeleted, clearStatuses, addRow, deleteSelectedRows, stopEditing,
 *           getAllRows, getChangedRows
 */

// Props 기본값 설정
const props = withDefaults(defineProps<AgGridProps>(), {
  title: '메뉴 트리',
  columnDefs: () => [],
  rowData: () => [],
  searchQuery: '',
  gridId: '',
  treeData: false,
  editable: false,
  showAddRowButton: false,
  showDeleteRowButton: false,
  editMode: 'singleClick',
  rowSelect: false,
  procedureName: '',
  saveCase: 'save',
  menuId: undefined,
  extraSaveParams: () => ({}),
  showSaveButton: false,
  saveButtonLabel: '저장',
  savingState: false,
})

// Emits 정의 - 부모 컴포넌트로 이벤트 전달
/**
 * 이벤트 요약
 * - grid-ready: AG Grid 초기화 완료
 * - cell-double-clicked: 셀 더블클릭
 * - expand-all / collapse-all: 트리 펼치기/접기
 * - cell-value-changed: 셀 값 변경
 * - row-editing-started / row-editing-stopped: 행 편집 시작/종료
 * - row-added / rows-deleted: 행 추가/삭제
 * - saved: 저장 성공(result 포함)
 * - save-error: 저장 실패(error 포함)
 */
const emit = defineEmits<{
  'grid-ready': [params: any]
  'cell-double-clicked': [event: any]
  'expand-all': []
  'collapse-all': []
  'cell-value-changed': [event: any]
  'row-editing-started': [event: any]
  'row-editing-stopped': [event: any]
  'row-added': [row: StatusRow]
  'rows-deleted': [rows: StatusRow[]]
  'row-clicked': [event: any]
  'saved': [result: SaveResult]
  'save-error': [error: any]
}>()

// AG Grid 모듈 등록 - 필요한 기능들을 활성화
ModuleRegistry.registerModules([AllCommunityModule, TreeDataModule, ExcelExportModule, CellSelectionModule, ClipboardModule])

// 다크모드/라이트모드 감지
const colorMode = useColorMode()
// AG Grid 테마 클래스 계산 (다크모드에 따라 동적 변경)
const agGridThemeClass = computed(() => colorMode.value === 'dark' ? 'ag-theme-quartz-dark' : 'ag-theme-quartz')

// AG Grid 참조 및 API
const agGrid = ref()
const gridApi = shallowRef<GridApi | null>(null)

// 동적 컬럼 정보
const dynamicColumnDefs = ref<DynamicColumnDef[]>([])
// 저장 파라미터로 사용할 필드 목록(col_save=Y) 저장
const saveParamFields = ref<string[]>([])

// 저장 중 상태 관리
const internalSaving = ref(false)
const isSaving = computed(() => props.savingState || internalSaving.value)

/**
 * 편집 가능 여부 판단 함수 생성
 * @param policy 편집 정책
 * @returns editable 함수 또는 boolean
 */
function createEditableFunction(policy: EditPolicy): boolean | ((params: any) => boolean) {
  if (policy === 'A')
    return true
  if (policy === 'F')
    return (p: any) => isNewRow(p?.data)
  return false
}

/**
 * 행이 편집 가능한지 확인
 * @param row 행 데이터
 * @param policy 편집 정책
 * @returns 편집 가능 여부
 */
function isEditableRow(row: StatusRow | null | undefined, policy: EditPolicy): boolean {
  if (policy === 'A')
    return true
  if (policy === 'F')
    return isNewRow(row)
  return false
}

/**
 * 동적 컬럼 정보 조회 함수
 */
async function loadDynamicColumnDefs(): Promise<void> {
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
          grid_id: props.gridId,
        },
      },
    })

    if (result.success && result.data && Array.isArray(result.data)) {
      // 드롭다운 옵션 사전 로드용 맵
      const dropdownPromises: Promise<void>[] = []
      const saveFields: string[] = []

      const tempDefs: DynamicColumnDef[] = result.data.map((col: GridInfoColumn) => {
        const def: DynamicColumnDef = {
          field: toTrimmedString(col.col_id || ''),
          headerName: toTrimmedString(col.col_name || ''),
          width: toNumberOrUndefined(col.col_width) ?? 100,
          hide: toHideBoolean(col.col_hide),
          flex: toNumberOrUndefined(col.col_flex) ?? undefined,
          __colType: toLowerTrimmed(col.col_type || ''),
        }

        const colType = toLowerTrimmed(col.col_type || '')
        // 편집 정책: 값이 비어있으면 'N'으로 간주 (정책만 사용)
        const rawPolicy = col?.col_edit
        const hasPolicy = String(rawPolicy ?? '').trim() !== ''
        const policy = coerceEditPolicy(rawPolicy)
        const effectivePolicy: EditPolicy = hasPolicy ? policy : 'N'
        const anyEditable = (effectivePolicy === 'A' || effectivePolicy === 'F')
        const editableByPolicy = createEditableFunction(effectivePolicy)

        const saveParam = coerceBooleanValue(col.col_save)
        if (saveParam) {
          def.__saveParam = true
          if (def.field)
            saveFields.push(def.field)
        }

        if (colType === 'text' || colType === '' || !colType) {
          if (anyEditable)
            def.cellEditor = 'agTextCellEditor'
          def.editable = editableByPolicy
          def.valueFormatter = (p: any) => (p.value == null ? '' : p.value)
          def.valueGetter = (p: any) => smartGet(p?.data, def.field!)
          if (anyEditable)
            def.valueSetter = (p: any) => smartSet(p?.data, def.field!, p.newValue)
        }
        else if (colType === 'number') {
          def.filter = 'agNumberColumnFilter'
          def.valueParser = (p: any) => {
            const v = Number(p.newValue)
            return Number.isNaN(v) ? null : v
          }
          if (anyEditable)
            def.cellEditor = 'agTextCellEditor'
          def.editable = editableByPolicy
          def.valueFormatter = (p: any) => (p.value == null ? '' : p.value)
          def.valueGetter = (p: any) => smartGet(p?.data, def.field!)
          if (anyEditable)
            def.valueSetter = (p: any) => smartSet(p?.data, def.field!, (p.newValue == null || p.newValue === '') ? null : Number(p.newValue))
        }
        else if (colType === 'checkbox' || colType === 'bool' || colType === 'boolean') {
          // 클릭으로 직접 토글되도록 실제 DOM 요소 렌더링
          def.cellRenderer = (p: any) => {
            const input = document.createElement('input')
            input.type = 'checkbox'
            input.checked = coerceBooleanValue(smartGet(p?.data, def.field!))
            input.disabled = !isEditableRow(p?.data, effectivePolicy)
            input.addEventListener('click', (ev) => ev.stopPropagation())
            input.addEventListener('change', () => {
              const newVal = !!input.checked
              smartSet(p.data, def.field!, newVal)
              try {
                p.node.setDataValue?.(def.field, newVal)
              }
              catch { /* ignore */ }
              try {
                p.api?.refreshCells({ force: true, columns: ['__rownum', def.field] })
              }
              catch { /* ignore */ }
            })
            return input
          }
          // 더블클릭 편집 경로 유지
          if (anyEditable) {
            def.editable = editableByPolicy
            def.cellEditor = (params: any) => {
              const e = document.createElement('input')
              e.type = 'checkbox'
              e.checked = coerceBooleanValue(smartGet(params?.data, def.field!))
              e.addEventListener('keydown', (ev) => {
                if (ev.key === 'Enter')
                  params.stopEditing()
              })
              return { getGui: () => e, afterGuiAttached: () => {}, getValue: () => e.checked, isPopup: () => false }
            }
            def.valueGetter = (p: any) => smartGet(p?.data, def.field!)
            def.valueSetter = (p: any) => smartSet(p?.data, def.field!, coerceBooleanValue(p.newValue))
          }
        }
        else if (colType === 'date' || colType === 'datetime') {
          def.filter = 'agDateColumnFilter'
          def.valueFormatter = (p: any) => formatDateValue(p.value, colType === 'datetime' ? 'datetime' : 'date')
          def.valueGetter = (p: any) => smartGet(p?.data, def.field!)
          if (anyEditable) {
            def.editable = editableByPolicy
            def.cellEditorPopup = true
            def.cellEditor = (params: any) => {
              const input = document.createElement('input')
              input.type = 'date'
              const raw = smartGet(params?.data, def.field!)
              const val = raw ? new Date(raw) : null
              if (val && !Number.isNaN(val.getTime()))
                input.value = `${val.getFullYear()}-${String(val.getMonth() + 1).padStart(2, '0')}-${String(val.getDate()).padStart(2, '0')}`
              return {
                getGui: () => input,
                afterGuiAttached: () => { input.focus() },
                getValue: () => input.value || null,
                isPopup: () => true,
              }
            }
            def.valueSetter = (p: any) => smartSet(p?.data, def.field!, p.newValue || null)
          }
        }
        else if (colType === 'select' || colType === 'dropdown') {
          // 옵션 라벨 포맷팅 (옵션 로드 전/후 모두 동작)
          def.valueFormatter = (p: any) => {
            const v = smartGet(p?.data, def.field!)
            const opts = (p.colDef as any)?.__options
            if (Array.isArray(opts)) {
              const m = opts.find((o: any) => String(o.code) === String(v))
              return m ? (m.code_name ?? m.name ?? m.text ?? v ?? '') : (v ?? '')
            }
            // 옵션이 아직 없으면 원시값 표시
            return v ?? ''
          }
          def.valueGetter = (p: any) => smartGet(p?.data, def.field!)
          // 코드그룹이 있으면 옵션을 서버에서 로드해 __options에 저장
          const codeGroup = toTrimmedString(col.col_code || '')
          if (codeGroup) {
            dropdownPromises.push((async () => {
              try {
                const codeResult = await $fetch<any>('/api/stored-procedure/execute', {
                  method: 'POST',
                  body: {
                    procedureName: 'sp_code_info',
                    parameters: { case: 'search', plant_code: '1000', code_grp: codeGroup },
                  },
                })
                if (codeResult?.success && Array.isArray(codeResult.data)) {
                  def.__options = codeResult.data
                  // 값 -> 라벨 포맷팅
                  def.valueFormatter = (p: any) => {
                    const v = smartGet(p?.data, def.field!)
                    const m = (def.__options || []).find((o: any) => String(o.code) === String(v))
                    return m ? (m.code_name ?? m.name ?? m.text ?? v) : (v ?? '')
                  }
                }
                else {
                  def.__options = []
                }
              }
              catch {
                def.__options = []
              }
            })())
          }
          if (anyEditable) {
            def.editable = editableByPolicy
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
                const cur = smartGet(params?.data, def.field!)
                if (String(cur) === String(o.value))
                  o.selected = true
                select.appendChild(o)
              })
              return {
                getGui: () => select,
                afterGuiAttached: () => { select.focus() },
                getValue: () => select.value || null,
                isPopup: () => true,
              }
            }
            def.valueSetter = (p: any) => smartSet(p?.data, def.field!, p.newValue || null)
          }
        }

        return def
      })

      // 옵션 로드가 끝나면 일괄 반영
      try {
        await Promise.allSettled(dropdownPromises)
      }
      catch { /* ignore */ }
      dynamicColumnDefs.value = tempDefs
      saveParamFields.value = saveFields
    }
    else {
      console.warn('동적 컬럼 정보가 없거나 잘못된 형식입니다:', result)
    }
  }
  catch (error) {
    console.error('동적 컬럼 정보 조회 실패:', error)
    dynamicColumnDefs.value = []
  }
}

// 기본 컬럼 정의 - 모든 컬럼에 적용되는 기본 설정
const defaultColDef = ref<ColDef>({
  resizable: true,
  sortable: true,
  filter: true,
})

// AG Grid 옵션 설정 (트리 데이터가 있을 때만 그룹 관련 설정 적용)
const gridOptions = computed(() => {
  const baseOptions = {
    rowHeight: 28,
    headerHeight: 32,
    animateRows: true,
    enableRangeSelection: true,
    enableRangeHandle: true,
    clipboardDelimiter: '\t',
    suppressScrollOnNewData: true,
    stopEditingWhenCellsLoseFocus: true,
    singleClickEdit: props.editMode === 'singleClick',
  }

  // 트리 데이터가 있을 때만 그룹 관련 설정 추가
  if (props.treeData) {
    return {
      ...baseOptions,
      groupDefaultExpanded: 1,
    }
  }

  return baseOptions
})

// 행 선택 설정
const rowSelection = ref({
  mode: 'multiRow' as const,
  checkboxes: true,
  headerCheckbox: true,
})

// 자동 그룹 컬럼 정의 (트리 데이터용)
const autoGroupColumnDef = ref<ColDef>({
  headerName: props.autoGroupColumnName || '메뉴명',
  cellRendererParams: { suppressCount: true },
})

// 고정 좌측 상태/행번호 컬럼
const rowNumberStatusColDef: ColDef = {
  headerName: ' ',
  field: '__rownum',
  width: 80,
  pinned: 'left',
  editable: false,
  sortable: false,
  filter: false,
  suppressHeaderMenuButton: true,
  cellClass: 'ag-rownum-cell',
  valueGetter: (params: any) => (params?.node?.rowIndex != null ? params.node.rowIndex + 1 : ''),
  cellRenderer: (params: any) => {
    const no = params?.value ?? ''
    const status = params?.data?.__status
    let iconHtml = ''
    if (status === 'N')
      iconHtml = '<i class="pi pi-plus" style="color:#2563eb;font-size:0.9rem"></i>'
    else if (status === 'D')
      iconHtml = '<i class="pi pi-minus" style="color:#dc2626;font-size:0.9rem"></i>'
    else if (status === 'M')
      iconHtml = '<i class="pi pi-pencil" style="color:#d97706;font-size:0.9rem"></i>'
    return iconHtml ? `${iconHtml} <span>${no}</span>` : `<span>${no}</span>`
  },
}

// 최종 컬럼 정의 (동적 컬럼 + props 컬럼 병합 > rowData 자동 생성)
const finalColumnDefs = computed<ColDef[]>(() => {
  const dynamicDefs = dynamicColumnDefs.value || []
  const propDefs = Array.isArray(props.columnDefs) ? props.columnDefs : []

  console.log('AgGrid - 동적 컬럼:', dynamicDefs)
  console.log('AgGrid - Props 컬럼:', propDefs)

  // 동적 컬럼과 props 컬럼을 병합
  if (dynamicDefs.length > 0 || propDefs.length > 0) {
    const mergedDefs = [...dynamicDefs]

    // props 컬럼을 동적 컬럼과 병합 (같은 field가 있으면 props 컬럼으로 덮어쓰기)
    propDefs.forEach((propDef) => {
      const existingIndex = mergedDefs.findIndex(def => def.field === propDef.field)
      if (existingIndex >= 0) {
        console.log(`AgGrid - 컬럼 교체: ${propDef.field}`, propDef)
        mergedDefs[existingIndex] = propDef
      }
      else {
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
const computedColumnDefs = computed<ColDef[]>(() => [rowNumberStatusColDef, ...finalColumnDefs.value])

/**
 * AG Grid 준비 완료 이벤트 핸들러
 */
function onGridReady(params: any): void {
  gridApi.value = params.api
  applyGridFilter()
  updateGridTheme()
  emit('grid-ready', params)
}

/**
 * 셀 더블클릭 이벤트 핸들러
 */
function onCellDoubleClicked(event: any): void {
  try {
    const colDef = event.column?.getColDef ? event.column.getColDef() : event.colDef
    let allowed = false
    if (colDef) {
      if (typeof colDef.editable === 'function') {
        try {
          allowed = !!colDef.editable({
            data: event?.data,
            node: event?.node,
            colDef,
            column: event?.column,
            api: gridApi.value,
            context: undefined,
          })
        }
        catch {
          allowed = false
        }
      }
      else {
        allowed = colDef.editable !== false
      }
    }
    if (allowed) {
      console.log('AgGrid - 더블클릭 편집 시작:', event.column.getColId(), event.column.getColDef())
      gridApi.value?.startEditingCell({
        rowIndex: event.rowIndex,
        colKey: event.column.getColId(),
      })
    }
  }
  catch (error) {
    console.error('AgGrid - 더블클릭 편집 시작 실패:', error)
  }
  emit('cell-double-clicked', event)
}

/**
 * 셀 값 변경 이벤트 핸들러
 */
function onCellValueChanged(event: any): void {
  try {
    const row = event?.data as StatusRow | undefined
    if (row && row.__status !== 'N') {
      row.__status = 'M'
      refreshStatusCells()
    }
  }
  catch { /* ignore */ }
  emit('cell-value-changed', event)
}

/**
 * 행 편집 시작 이벤트 핸들러
 */
function onRowEditingStarted(event: any): void {
  console.log('AgGrid - 행 편집 시작:', event)
  console.log('AgGrid - 편집 시작 컬럼:', event.column?.getColId())
  console.log('AgGrid - 편집 시작 컬럼 정의:', event.column?.getColDef())
  emit('row-editing-started', event)
}

/**
 * 행 편집 종료 이벤트 핸들러
 */
function onRowEditingStopped(event: any): void {
  console.log('AgGrid - 행 편집 종료:', event)
  emit('row-editing-stopped', event)
}

/**
 * 다른 로우로 포커스 이동 시 편집 종료
 */
function tryStopEditingOnRowChange(newRowIndex: number | null | undefined): void {
  try {
    const api = gridApi.value
    if (!api)
      return
    const editingCells = api.getEditingCells?.() || []
    if (editingCells.length === 0)
      return
    const currentRowIndex = editingCells[0]?.rowIndex
    if (newRowIndex != null && currentRowIndex != null && newRowIndex !== currentRowIndex) {
      api.stopEditing?.()
    }
  }
  catch { /* ignore */ }
}

function onCellFocused(event: any): void {
  tryStopEditingOnRowChange(event?.rowIndex)
}

function onRowClicked(event: any): void {
  tryStopEditingOnRowChange(event?.rowIndex)
  emit('row-clicked', event)
}

/**
 * 정렬 또는 필터 변경 시 호출
 */
function onSortOrFilterChanged(): void {
  refreshStatusCells()
}

/**
 * 트리 데이터 경로 계산 함수
 */
function getDataPath(data: any): string[] {
  return data.orgHierarchy || []
}

/**
 * 전체 펼치기
 */
function expandAllGrid(): void {
  if (gridApi.value && props.treeData) {
    gridApi.value.expandAll()
    emit('expand-all')
  }
}

/**
 * 전체 접기
 */
function collapseAllGrid(): void {
  if (gridApi.value && props.treeData) {
    gridApi.value.collapseAll()
    emit('collapse-all')
  }
}

/**
 * AG Grid 테마 업데이트
 */
function updateGridTheme(): void {
  if (import.meta.client) {
    const div = document.querySelector('.ag-grid-menu4')
    if (div) {
      div.classList.remove('ag-theme-quartz', 'ag-theme-quartz-dark')
      div.classList.add(agGridThemeClass.value)
    }
  }
}

/**
 * AG Grid 필터 적용
 */
function applyGridFilter(): void {
  if (!gridApi.value)
    return
  const q = props.searchQuery.toLowerCase().trim()
  gridApi.value.setGridOption('quickFilterText', q)
}

/**
 * 외부에서 필터 적용을 위한 메서드
 */
function applyExternalFilter(): void {
  applyGridFilter()
}

/**
 * 엑셀 내보내기
 */
function exportExcel(): void {
  const api = gridApi.value
  if (api)
    api.exportDataAsExcel({ fileName: 'MenuList', sheetName: 'Menus' })
}

/**
 * 상태 셀 새로고침
 */
function refreshStatusCells(): void {
  const api = gridApi.value
  try {
    api?.refreshCells({ force: true, columns: ['__rownum'] })
  }
  catch { /* ignore */ }
}

// 행 추가 감지 및 상태 관리
const seenRows = shallowRef<WeakSet<StatusRow>>(new WeakSet<StatusRow>())
const newlyAddedRows = shallowRef<Set<StatusRow>>(new Set<StatusRow>())

/**
 * 행 추가
 */
function addRow(): void {
  const fields = finalColumnDefs.value.map((c: ColDef) => c?.field).filter((f): f is string => !!f && f !== '__rownum')
  const newRow: StatusRow = { __status: 'N' }
  fields.forEach((f: string) => { newRow[f] = null })

  const api = gridApi.value
  try {
    if (api?.applyTransaction) {
      api.applyTransaction({ add: [newRow] })
    }
    else {
      (props.rowData as StatusRow[]).push(newRow)
    }
    try {
      newlyAddedRows.value.add(newRow)
    }
    catch { /* ignore */ }
    emit('row-added', newRow)
    nextTick(() => refreshStatusCells())
  }
  catch {
    try {
      (props.rowData as StatusRow[]).push(newRow)
      try {
        newlyAddedRows.value.add(newRow)
      }
      catch { /* ignore */ }
      emit('row-added', newRow)
      nextTick(() => refreshStatusCells())
    }
    catch { /* ignore */ }
  }
}

/**
 * 선택된 행 삭제
 */
function deleteSelectedRows(): void {
  const api = gridApi.value
  if (!api)
    return

  // 삭제 전 포커스/스크롤 위치 보존
  const focusedCell = api.getFocusedCell?.()
  const prevRowIndex: number | null = focusedCell?.rowIndex ?? null
  let prevColId: string | null = null
  try {
    if (focusedCell?.column) {
      prevColId = typeof focusedCell.column === 'string' ? focusedCell.column : (focusedCell.column as any)?.getColId?.() ?? null
    }
  }
  catch {
    prevColId = null
  }

  // 현재 스크롤 위치 및 첫 표시 행 저장
  let prevScrollTop: number | null = null
  let firstDisplayedRow: number | null = null
  try {
    const host = (agGrid as any)?.value?.$el as HTMLElement | undefined
    const viewport = host?.querySelector?.('.ag-body-viewport') as HTMLElement | undefined
    if (viewport)
      prevScrollTop = viewport.scrollTop
  }
  catch { /* ignore */ }
  try {
    firstDisplayedRow = typeof api.getFirstDisplayedRowIndex === 'function' ? api.getFirstDisplayedRowIndex() : null
  }
  catch { /* ignore */ }

  let rows = api.getSelectedRows?.() || []
  // 선택이 없으면 포커스된 셀의 행으로 대체
  if (!rows.length && api.getFocusedCell) {
    const focused = api.getFocusedCell()
    if (focused && focused.rowIndex != null) {
      const node = api.getDisplayedRowAtIndex?.(focused.rowIndex)
      if (node?.data)
        rows = [node.data]
    }
  }
  if (!rows.length)
    return

  const toRemove: StatusRow[] = []
  rows.forEach((r: StatusRow) => {
    if (!r)
      return
    if (r.__status === 'N') {
      toRemove.push(r)
      try {
        newlyAddedRows.value.delete(r)
      }
      catch { /* ignore */ }
    }
    else {
      r.__status = 'D'
    }
  })

  if (toRemove.length) {
    try {
      api.applyTransaction?.({ remove: toRemove })
    }
    catch { /* ignore */ }
  }
  emit('rows-deleted', rows)
  refreshStatusCells()

  // 삭제 후 포커스/스크롤 복원
  nextTick(() => {
    try {
      const host = (agGrid as any)?.value?.$el as HTMLElement | undefined
      const viewport = host?.querySelector?.('.ag-body-viewport') as HTMLElement | undefined
      if (viewport && prevScrollTop != null) {
        viewport.scrollTop = prevScrollTop
      }

      const hadFocus = typeof prevRowIndex === 'number'
      const rowCount = api.getDisplayedRowCount?.() ?? 0
      if (rowCount <= 0)
        return

      if (hadFocus) {
        let targetRowIndex = prevRowIndex as number
        if (targetRowIndex >= rowCount)
          targetRowIndex = rowCount - 1
        api.ensureIndexVisible?.(targetRowIndex)
        if (prevColId != null)
          api.setFocusedCell?.(targetRowIndex, prevColId)
      }
      else if (firstDisplayedRow != null) {
        let target = firstDisplayedRow
        if (target >= rowCount)
          target = rowCount - 1
        api.ensureIndexVisible?.(target)
      }
    }
    catch { /* ignore */ }
  })
}

/**
 * 모든 행 데이터 반환
 */
function getAllRows(): StatusRow[] {
  const api = gridApi.value
  const out: StatusRow[] = []
  try {
    if (api?.forEachNode) {
      api.forEachNode((node: any) => {
        if (node?.data)
          out.push(node.data)
      })
    }
    else if (api?.getDisplayedRowCount && api?.getDisplayedRowAtIndex) {
      const n = api.getDisplayedRowCount()
      for (let i = 0; i < n; i++) {
        const node = api.getDisplayedRowAtIndex(i)
        if (node?.data)
          out.push(node.data)
      }
    }
  }
  catch { /* ignore */ }
  return out
}

/**
 * 변경된 행들만 반환
 */
function getChangedRows(): ChangedRows {
  const all = getAllRows()
  const addedSet = new Set<StatusRow>()

  try {
    newlyAddedRows.value.forEach((r: StatusRow) => {
      if (r && r.__status !== 'D')
        addedSet.add(r)
    })
  }
  catch { /* ignore */ }

  all.forEach((r: StatusRow) => {
    if (r && r.__status === 'N')
      addedSet.add(r)
  })

  const added = Array.from(addedSet)
  const modified = all.filter((r: StatusRow) => r && r.__status === 'M')
  const deleted = all.filter((r: StatusRow) => r && r.__status === 'D')

  return { added, modified, deleted }
}

/**
 * 변경 데이터 저장 실행
 */
async function save(): Promise<SaveResult> {
  const procedureName = String(props.procedureName || '').trim()
  if (!procedureName) {
    const err = new Error('procedureName이 설정되지 않았습니다.')
    emit('save-error', err)
    throw err
  }

  try {
    const changed = getChangedRows()
    const saveFields = saveParamFields.value || []

    const execForRows = async (rows: StatusRow[], rowState: 'A' | 'M' | 'D') => {
      for (const row of rows) {
        const rowParams = pickSaveFields(row, saveFields, dynamicColumnDefs.value)
        const parameters = {
          case: props.saveCase || 'save',
          row_state: rowState,
          ...rowParams,
          ...props.extraSaveParams,
        }
        await $fetch<any>('/api/stored-procedure/execute', {
          method: 'POST',
          body: { procedureName, parameters },
        })
      }
    }

    await execForRows(changed.added, 'A')
    await execForRows(changed.modified, 'M')
    await execForRows(changed.deleted, 'D')

    // 저장 성공 후 상태 초기화
    try {
      const allRows = getAllRows()
      allRows.forEach((r: StatusRow) => {
        if (r && r.__status)
          delete r.__status
      })
      try {
        newlyAddedRows.value?.clear?.()
      }
      catch { /* ignore */ }
      try {
        seenRows.value = new WeakSet<StatusRow>()
        allRows.forEach((r: StatusRow) => {
          if (r && typeof r === 'object')
            seenRows.value.add(r)
        })
      }
      catch { /* ignore */ }
      refreshStatusCells()
    }
    catch { /* ignore */ }

    const summary: SaveResult = {
      added: changed.added.length,
      modified: changed.modified.length,
      deleted: changed.deleted.length,
    }
    emit('saved', summary)
    return summary
  }
  catch (error) {
    emit('save-error', error)
    throw error
  }
}

/**
 * 저장 버튼 클릭 핸들러
 */
async function handleSave(): Promise<void> {
  if (isSaving.value)
    return

  internalSaving.value = true
  try {
    await save()
  }
  finally {
    internalSaving.value = false
  }
}

// 외부에서 호출할 수 있는 메서드들
const exposeMethods = {
  expandAll: expandAllGrid,
  collapseAll: collapseAllGrid,
  exportExcel,
  applyFilter: applyExternalFilter,
  getGridApi: () => gridApi.value,
  loadDynamicColumnDefs,
  getDynamicColumnDefs: () => dynamicColumnDefs.value,
  markDeleted: (row: StatusRow) => {
    if (row) {
      row.__status = 'D'
      refreshStatusCells()
    }
  },
  clearStatuses: () => {
    try {
      const rows = Array.isArray(props.rowData) ? props.rowData : []
      rows.forEach((r: StatusRow) => {
        if (r && r.__status)
          delete r.__status
      })
      refreshStatusCells()
    }
    catch { /* ignore */ }
  },
  addRow,
  deleteSelectedRows,
  stopEditing: () => {
    try {
      gridApi.value?.stopEditing?.()
    }
    catch { /* ignore */ }
  },
  save,
  getAllRows,
  getChangedRows,
  getSaveParamFields: () => saveParamFields.value,
}

defineExpose(exposeMethods)

// Watchers
watch(() => colorMode.value, () => updateGridTheme())

watch(() => props.saveParamFields, (newFields) => {
  if (newFields && Array.isArray(newFields)) {
    saveParamFields.value = [...newFields]
  }
}, { immediate: true })

watch(() => props.searchQuery, () => {
  nextTick(() => applyGridFilter())
})

watch(() => props.rowData, () => {
  if (gridApi.value) {
    nextTick(() => applyGridFilter())
  }
}, { deep: true })

// 배열 레퍼런스가 바뀌면 현재 데이터는 기준선으로 간주
watch(() => props.rowData, (newRows) => {
  const rows = Array.isArray(newRows) ? newRows : []
  try {
    rows.forEach((r: StatusRow) => {
      if (r && typeof r === 'object' && r.__status)
        delete r.__status
    })
  }
  catch { /* ignore */ }
  seenRows.value = new WeakSet<StatusRow>()
  rows.forEach((r: StatusRow) => {
    if (r && typeof r === 'object')
      seenRows.value.add(r)
  })
  refreshStatusCells()
}, { immediate: true })

// push 등으로 기존 배열에 추가된 새 객체만 N 표기
watch(() => props.rowData, (newRows) => {
  const rows = Array.isArray(newRows) ? newRows : []
  let marked = false
  rows.forEach((r: StatusRow) => {
    if (r && typeof r === 'object' && !seenRows.value.has(r)) {
      seenRows.value.add(r)
      if (!r.__status)
        r.__status = 'N'
      marked = true
    }
  })
  if (marked)
    refreshStatusCells()
}, { deep: true })

// grid_id 변경 시 동적 컬럼 정보 다시 로드
watch(() => props.gridId, async (newGridId, oldGridId) => {
  if (newGridId && newGridId !== oldGridId) {
    await loadDynamicColumnDefs()
  }
})

// 컴포넌트 마운트 시 초기화
onMounted(async () => {
  updateGridTheme()
  if (props.gridId) {
    await loadDynamicColumnDefs()
  }
  else {
    console.log('gridId가 없어서 동적 컬럼 정보를 로드하지 않습니다.')
  }
})
</script>

<template>
  <div class="w-full">
    <!-- AG Grid 헤더 영역 - 제목과 컨트롤 버튼들 -->
    <div class="flex items-center gap-2 mb-1">
      <h5 class="m-0">
        {{ title }}
      </h5>
      <!-- 트리 데이터가 있을 때만 펼치기/접기 버튼 표시 -->
      <template v-if="props.treeData">
        <Button icon="pi pi-angle-double-down" text size="small" v-tooltip.bottom="'전체 펼치기'" @click="expandAllGrid" />
        <Button icon="pi pi-angle-double-up" text size="small" v-tooltip.bottom="'전체 접기'" @click="collapseAllGrid" />
      </template>

      <!-- 우측 액션 버튼: 엑셀, 행 추가/행 삭제/저장 -->
      <div class="ml-auto flex items-center gap-1">
        <Button icon="pi pi-file-excel" label="엑셀" size="small" text severity="success" @click="exportExcel" />
        <Button v-if="props.showAddRowButton" icon="pi pi-plus" label="행추가" size="small" text severity="primary" @click="addRow" />
        <Button v-if="props.showDeleteRowButton" icon="pi pi-minus" label="행삭제" size="small" text severity="danger" @click="deleteSelectedRows" />
        <Button v-if="props.showSaveButton" icon="pi pi-save" :label="props.saveButtonLabel" size="small" text severity="info" :loading="isSaving" @click="handleSave" />
      </div>
    </div>

    <!-- AG Grid 컨테이너 - 테마 클래스와 스타일 적용 -->
    <div :class="agGridThemeClass" class="ag-grid-menu4" style="height: 550px; width: 100%;">
      <div class="datatable-header" />
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
