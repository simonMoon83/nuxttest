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
  showAddRowButton?: boolean // 행 추가 버튼 표시 여부 (기본: editable과 동일)
  showDeleteRowButton?: boolean // 행 삭제 버튼 표시 여부 (기본: editable과 동일)
  editMode?: 'singleClick' | 'doubleClick' | 'enterKey' // 편집 모드
  rowSelect?: boolean // 행 선택 기능 사용 여부
  procedureName?: string // 저장/조회에 사용할 프로시저명
  saveCase?: string // 저장 시 사용할 case (기본: 'save')
  menuId?: string | number // 저장 시 전달할 메뉴 ID
  extraSaveParams?: Record<string, any> // 추가 저장 파라미터
  saveParamFields?: string[] // 저장 시 사용할 필드 목록
  showSaveButton?: boolean // 저장 버튼 표시 여부
  saveButtonLabel?: string // 저장 버튼 레이블
  savingState?: boolean // 외부에서 저장 중 상태 전달
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
  savingState: false
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
  'grid-ready': [params: any] // 그리드 준비 완료 이벤트
  'cell-double-clicked': [event: any] // 셀 더블클릭 이벤트
  'expand-all': [] // 전체 펼치기 이벤트
  'collapse-all': [] // 전체 접기 이벤트
  'cell-value-changed': [event: any] // 셀 값 변경 이벤트
  'row-editing-started': [event: any] // 행 편집 시작 이벤트
  'row-editing-stopped': [event: any] // 행 편집 종료 이벤트
  'row-added': [row: any]
  'rows-deleted': [rows: any[]]
  'row-clicked': [event: any] // 행 클릭 이벤트
  'saved': [result: any]
  'save-error': [error: any]
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
// (필요한 기능만 번들에 포함되도록 명시적으로 모듈 등록)
ModuleRegistry.registerModules([AllCommunityModule, TreeDataModule, ExcelExportModule, CellSelectionModule, ClipboardModule])

// 다크모드/라이트모드 감지
const colorMode = useColorMode()
// AG Grid 테마 클래스 계산 (다크모드에 따라 동적 변경)
const agGridThemeClass = computed(() => colorMode.value === 'dark' ? 'ag-theme-quartz-dark' : 'ag-theme-quartz')

// AG Grid 참조 및 API
const agGrid = ref()
const gridApi = shallowRef<any | null>(null)

// 더블클릭으로 편집 시작할 때의 행 데이터를 임시 저장 (셀 에디터에서 params가 없을 때 사용)
const lastEditingCellData = ref<any>(null)
const lastEditingRowIndex = ref<number | null>(null)

// 동적 컬럼 정보
const dynamicColumnDefs = ref<any[]>([])
// 저장 파라미터로 사용할 필드 목록(col_save=Y) 저장
const saveParamFields = ref<string[]>([])

// 저장 중 상태 관리
const internalSaving = ref(false)
const isSaving = computed(() => props.savingState || internalSaving.value)

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

/**
 * col_edit 정책을 표준화한다.
 * - 'A': Always, 항상 편집 가능
 * - 'F': First/New row only, 신규 행에서만 편집 가능(__status==='N')
 * - 'N': Never, 편집 불가(기본)
 */
function coerceEditPolicy(value: any): 'A' | 'F' | 'N' {
  const s = String(value ?? '').trim().toUpperCase()
  if (s === 'A' || s === 'F') return s
  return 'N'
}
/** 신규 행 여부를 반환한다(__status === 'N'). */
function isNewRowFlag(row: any): boolean {
  try { return !!row && row.__status === 'N' } catch { return false }
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

function coerceCheckboxToBit(field: string, value: any): any {
  try {
    const defs = dynamicColumnDefs.value || []
    const def = defs.find((d: any) => d && d.field === field)
    const t = String(def?.context?.__colType || '').toLowerCase()
    if (t === 'checkbox' || t === 'bool' || t === 'boolean') {
      return coerceBooleanValue(value) ? 1 : 0
    }
  } catch {}
  return value
}

/** 행 객체에서 지정된 필드만 추출한다(col_save 지정 필드). */
function pickSaveFields(row: any, fields: string[]): any {
  if (!row || typeof row !== 'object') return {}
  const out: any = {}
  fields.forEach((f) => {
    const key = findMatchingKey(row, f) || f
    const raw = (row as any)[key]
    out[f] = coerceCheckboxToBit(f, raw)
  })
  return out
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
      // 두 번째 결과셋에서 DROP_로 시작하는 col_code의 코드 리스트 추출
      const codeOptionsMap = new Map<string, any[]>()
      if (Array.isArray(result.recordsets) && result.recordsets.length > 1) {
        const codeList = result.recordsets[1] || []
        console.log(`[AgGrid] 두 번째 결과셋 확인: ${codeList.length}개 항목`)
        codeList.forEach((item: any) => {
          const colCode = String(item?.col_code || '').trim()
          if (colCode) {
            if (!codeOptionsMap.has(colCode)) {
              codeOptionsMap.set(colCode, [])
            }
            codeOptionsMap.get(colCode)!.push({
              code: item.code,
              code_name: item.code_name
            })
          }
        })
        console.log(`[AgGrid] 코드 옵션 맵:`, Array.from(codeOptionsMap.keys()))
      } else {
        console.log(`[AgGrid] 두 번째 결과셋이 없습니다. recordsets:`, result.recordsets)
      }

      // 드롭다운 옵션 사전 로드용 맵
      const dropdownPromises: Promise<void>[] = []
      const saveFields: string[] = []
      const tempDefs: any[] = result.data.map((col: any) => {
        const colType = toLowerTrimmed(col.col_type || '')
        const codeGroup = toTrimmedString(col.col_code || '')
        // col_code가 DROP_로 시작하는 경우 자동으로 select 타입으로 처리
        const isDropCode = codeGroup.toUpperCase().startsWith('DROP_')
        const effectiveColType = isDropCode ? 'select' : colType

        const def: any = {
          field: toTrimmedString(col.col_id || ''),
          headerName: toTrimmedString(col.col_name || ''),
          width: toNumberOrUndefined(col.col_width) ?? 100,
          hide: toHideBoolean(col.col_hide),
          flex: toNumberOrUndefined(col.col_flex) ?? undefined,
          context: {
            __colType: effectiveColType,
            __saveParam: false,
            __options: []
          }
        }
        
        // 편집 정책: 값이 비어있으면 'N'으로 간주 (정책만 사용)
        // col_code가 DROP_로 시작하는 경우 자동으로 편집 가능하도록 설정
        const rawPolicy = col?.col_edit
        const hasPolicy = String(rawPolicy ?? '').trim() !== ''
        const policy = coerceEditPolicy(rawPolicy)
        // DROP_로 시작하는 경우 편집 가능하도록 강제
        const effectivePolicy: 'A' | 'F' | 'N' = isDropCode ? 'A' : (hasPolicy ? policy : 'N')
        const anyEditable = isDropCode || (effectivePolicy === 'A' || effectivePolicy === 'F')
        const editableByPolicy: boolean | ((p: any) => boolean) = isDropCode 
          ? true 
          : (effectivePolicy === 'A' 
            ? true 
            : (effectivePolicy === 'F' ? ((p: any) => isNewRowFlag(p?.data)) : false))
        const isEditableRow = (row: any) => {
          if (effectivePolicy === 'A') return true
          if (effectivePolicy === 'F') return isNewRowFlag(row)
          return false
        }
        const saveParam = coerceBooleanValue(col.col_save)
        if (saveParam) {
          def.context.__saveParam = true
          if (def.field) saveFields.push(def.field)
        }

        if (effectiveColType === 'text' || (effectiveColType === '' && !isDropCode) || (!effectiveColType && !isDropCode)) {
          if (anyEditable) def.cellEditor = 'agTextCellEditor'
          def.editable = editableByPolicy
          def.valueFormatter = (p: any) => (p.value == null ? '' : p.value)
          def.valueGetter = (p: any) => smartGet(p?.data, def.field)
          if (anyEditable) def.valueSetter = (p: any) => smartSet(p?.data, def.field, p.newValue)
        } else if (effectiveColType === 'number') {
          def.filter = 'agNumberColumnFilter'
          def.valueParser = (p: any) => {
            const v = Number(p.newValue)
            return isNaN(v) ? null : v
          }
          if (anyEditable) def.cellEditor = 'agTextCellEditor'
          def.editable = editableByPolicy
          def.valueFormatter = (p: any) => (p.value == null ? '' : p.value)
          def.valueGetter = (p: any) => smartGet(p?.data, def.field)
          if (anyEditable) def.valueSetter = (p: any) => smartSet(p?.data, def.field, (p.newValue == null || p.newValue === '') ? null : Number(p.newValue))
        } else if (effectiveColType === 'checkbox' || effectiveColType === 'bool' || effectiveColType === 'boolean') {
          // 클릭으로 직접 토글되도록 실제 DOM 요소 렌더링
          def.cellRenderer = (p: any) => {
            const input = document.createElement('input')
            input.type = 'checkbox'
            input.checked = coerceBooleanValue(smartGet(p?.data, def.field))
            input.disabled = !isEditableRow(p?.data)
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
          if (anyEditable) {
            def.editable = editableByPolicy
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
        } else if (effectiveColType === 'date' || effectiveColType === 'datetime') {
          def.filter = 'agDateColumnFilter'
          def.valueFormatter = (p: any) => formatDateValue(p.value, effectiveColType === 'datetime' ? 'datetime' : 'date')
          def.valueGetter = (p: any) => smartGet(p?.data, def.field)
          if (anyEditable) {
            def.editable = editableByPolicy
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
        } else if (effectiveColType === 'select' || effectiveColType === 'dropdown' || isDropCode) {
          // 옵션 라벨 포맷팅 (옵션 로드 전/후 모두 동작)
          def.valueFormatter = (p: any) => {
            const v = smartGet(p?.data, def.field)
            const opts = (p.colDef as any)?.context?.__options || []
            if (Array.isArray(opts) && opts.length > 0) {
              const m = opts.find((o: any) => String(o.code) === String(v))
              return m ? (m.code_name ?? m.name ?? m.text ?? v ?? '') : (v ?? '')
            }
            // 옵션이 아직 없으면 원시값 표시
            return v ?? ''
          }
          def.valueGetter = (p: any) => smartGet(p?.data, def.field)
          
          // 드롭다운 가능 표시를 위한 cellRenderer 추가 (우측에 ▽ 아이콘)
          def.cellRenderer = (params: any) => {
            const v = smartGet(params?.data, def.field)
            const opts = (params.colDef as any)?.context?.__options || []
            let displayText = v ?? ''
            
            // 옵션이 있으면 라벨로 변환
            if (Array.isArray(opts) && opts.length > 0) {
              const m = opts.find((o: any) => String(o.code) === String(v))
              displayText = m ? (m.code_name ?? m.name ?? m.text ?? v ?? '') : (v ?? '')
            }
            
            // 다크 테마 감지
            const isDark = document.documentElement.classList.contains('dark') || 
                          document.body.classList.contains('dark')
            const iconColor = isDark ? '#94a3b8' : '#6b7280'
            
            // 셀 내용과 우측 아이콘을 함께 표시
            return `
              <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; padding-right: 4px;">
                <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${displayText}</span>
                <i class="pi pi-chevron-down" style="color: ${iconColor}; font-size: 0.75rem; margin-left: 4px; flex-shrink: 0;"></i>
              </div>
            `
          }
          // 코드그룹이 있으면 옵션을 서버에서 로드해 __options에 저장
          if (codeGroup) {
            // col_code가 DROP_로 시작하는 경우: 프로시저에서 받은 두 번째 결과셋 사용
            if (isDropCode) {
              const options = codeOptionsMap.get(codeGroup) || []
              console.log(`[AgGrid] DROP_ 코드 처리: col_id=${def.field}, col_code=${codeGroup}, options=${options.length}개`)
              if (options.length > 0) {
                def.context.__options = options
                // 값 -> 라벨 포맷팅
                def.valueFormatter = (p: any) => {
                  const v = smartGet(p?.data, def.field)
                  const opts = (p.colDef as any)?.context?.__options || []
                  const m = opts.find((o: any) => String(o.code) === String(v))
                  return m ? (m.code_name ?? m.name ?? m.text ?? v) : (v ?? '')
                }
              } else {
                console.warn(`[AgGrid] DROP_ 코드에 대한 옵션이 없습니다: col_code=${codeGroup}`)
                def.context.__options = []
              }
            } else {
              // 기존 방식: sp_code_info 프로시저 호출
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
                    def.context.__options = codeResult.data
                    // 값 -> 라벨 포맷팅
                    def.valueFormatter = (p: any) => {
                      const v = smartGet(p?.data, def.field)
                      const opts = (p.colDef as any)?.context?.__options || []
                      const m = opts.find((o: any) => String(o.code) === String(v))
                      return m ? (m.code_name ?? m.name ?? m.text ?? v) : (v ?? '')
                    }
                  } else {
                    def.context.__options = []
                  }
                } catch {
                  def.context.__options = []
                }
              })())
            }
          }
          // select/dropdown 타입이거나 DROP_ 코드인 경우 cellEditor 설정
          if (anyEditable || isDropCode) {
            def.editable = isDropCode ? true : editableByPolicy
            def.cellEditorPopup = true
            
            // 커스텀 셀 에디터 팩토리 함수 정의
            // AG Grid가 팩토리 함수로 인식하도록 명시적으로 객체를 반환하는 함수로 정의
            // def를 클로저로 캡처하여 params가 없을 때도 사용 가능하도록 함
            const fieldName = def.field
            const initialOptions = def.context.__options || []
            
            // gridApi와 lastEditingCellData를 클로저로 캡처
            const capturedGridApi = gridApi.value
            const capturedLastEditingCellData = lastEditingCellData
            const capturedLastEditingRowIndex = lastEditingRowIndex
            
            def.cellEditor = function CustomSelectEditor(params: any) {
              // AG Grid가 생성자로 호출하는 경우 처리 (new CustomSelectEditor(params))
              // 또는 팩토리 함수로 호출하는 경우 처리 (CustomSelectEditor(params))
              // params가 없거나 잘못된 경우 빈 객체로 초기화
              if (!params || typeof params !== 'object') {
                params = {}
              }
              
              // 함수가 객체를 반환하면 AG Grid가 팩토리 함수로 인식
              const select = document.createElement('select')
              
              // AG Grid API 참조 (params에서 가져오거나 클로저에서 가져오기)
              const api = params?.api || capturedGridApi
              
              // 편집 중인 셀 정보를 API에서 가져오기 (항상 최신 정보를 가져옴)
              let editingCellInfo: any = null
              if (api) {
                try {
                  const editingCells = api.getEditingCells?.() || []
                  if (editingCells.length > 0) {
                    // 현재 편집 중인 셀 중에서 현재 필드와 일치하는 셀 찾기
                    editingCellInfo = editingCells.find((cell: any) => 
                      cell.column?.getColId?.() === fieldName || cell.colId === fieldName
                    ) || editingCells[0] // 일치하는 셀이 없으면 첫 번째 셀 사용
                    console.log(`[AgGrid] 편집 중인 셀 정보:`, editingCellInfo, `fieldName=${fieldName}`)
                  }
                } catch (e) {
                  console.warn('[AgGrid] 편집 중인 셀 정보 가져오기 실패:', e)
                }
              }
              
              // PrimeVue 스타일 클래스 적용
              select.className = 'p-inputtext p-component'
              
              // 다크 테마 감지
              const isDark = document.documentElement.classList.contains('dark') || 
                            document.body.classList.contains('dark') ||
                            window.getComputedStyle(document.documentElement).colorScheme === 'dark'
              
              // PrimeVue CSS 변수를 사용한 스타일 적용
              select.style.width = '100%'
              select.style.padding = '0.375rem 0.75rem'
              select.style.fontSize = '0.875rem'
              select.style.lineHeight = '1.5'
              select.style.borderRadius = '6px'
              select.style.border = '1px solid'
              select.style.outline = 'none'
              select.style.transition = 'border-color 0.2s, box-shadow 0.2s'
              
              // PrimeVue CSS 변수 사용 (다크/라이트 테마 자동 적용)
              const rootStyle = getComputedStyle(document.documentElement)
              select.style.backgroundColor = rootStyle.getPropertyValue('--p-inputfield-background').trim() || 
                                            (isDark ? '#1e293b' : '#ffffff')
              select.style.color = rootStyle.getPropertyValue('--p-inputfield-text-color').trim() || 
                                  (isDark ? '#e2e8f0' : '#1f2937')
              select.style.borderColor = rootStyle.getPropertyValue('--p-inputfield-border-color').trim() || 
                                        (isDark ? '#475569' : '#d1d5db')
              
              // option 요소 스타일도 적용
              const style = document.createElement('style')
              style.textContent = `
                select.p-inputtext option {
                  background-color: ${isDark ? '#1e293b' : '#ffffff'};
                  color: ${isDark ? '#e2e8f0' : '#1f2937'};
                }
                select.p-inputtext:focus {
                  border-color: ${isDark ? '#60a5fa' : '#3b82f6'};
                  box-shadow: ${isDark 
                    ? '0 0 0 0.2rem rgba(96, 165, 250, 0.2)' 
                    : '0 0 0 0.2rem rgba(59, 130, 246, 0.2)'};
                }
              `
              document.head.appendChild(style)
              
              // params가 없거나 colDef가 없는 경우 def를 사용 (클로저로 캡처됨)
              const colDef = (params?.colDef || def) as any
              const options = colDef?.context?.__options || initialOptions
              
              // AG Grid 셀 에디터 params 구조 확인 (전체 params 출력)
              console.log(`[AgGrid] params 전체 구조:`, params)
              console.log(`[AgGrid] params 주요 속성:`, {
                hasNode: !!params?.node,
                hasData: !!params?.data,
                hasValue: params?.value !== undefined,
                nodeData: params?.node?.data,
                paramData: params?.data,
                value: params?.value,
                rowIndex: params?.rowIndex,
                column: params?.column?.getColId?.(),
                event: params?.event,
                oldValue: params?.oldValue,
                newValue: params?.newValue
              })
              
              // 데이터 소스 우선순위: params.node.data > params.data > editingCellInfo (현재 편집 중인 셀) > api를 통한 행 데이터
              // 주의: lastEditingCellData는 사용하지 않음 (이전 행의 데이터가 남아있을 수 있음)
              let nodeData = params?.node?.data
              let paramData = params?.data
              
              // 편집 중인 셀 정보가 있으면 해당 행 데이터 가져오기 (가장 우선순위가 높음 - 현재 편집 중인 셀의 실제 데이터)
              if (!nodeData && editingCellInfo && editingCellInfo.rowIndex != null && api) {
                try {
                  const editingRowNode = api.getDisplayedRowAtIndex(editingCellInfo.rowIndex)
                  nodeData = editingRowNode?.data
                  console.log(`[AgGrid] editingCellInfo에서 행 데이터 가져옴 (rowIndex=${editingCellInfo.rowIndex}):`, nodeData)
                } catch (e) {
                  console.warn('[AgGrid] editingCellInfo를 통한 행 데이터 가져오기 실패:', e)
                }
              }
              
              // params.node.data가 없으면 api를 통해 행 데이터 가져오기
              const apiToUse = api || params?.api
              if (!nodeData && apiToUse) {
                try {
                  // 방법 1: rowIndex를 통해 가져오기 (editingCellInfo의 rowIndex 우선)
                  const rowIndex = editingCellInfo?.rowIndex ?? params?.rowIndex
                  if (rowIndex != null) {
                    const rowNode = apiToUse.getDisplayedRowAtIndex(rowIndex)
                    nodeData = rowNode?.data
                    console.log(`[AgGrid] api.getDisplayedRowAtIndex(${rowIndex}) 결과:`, nodeData)
                  }
                  
                  // 방법 2: 편집 중인 셀을 통해 가져오기 (editingCellInfo가 없을 때만)
                  if (!nodeData) {
                    const editingCells = apiToUse.getEditingCells?.() || []
                    if (editingCells.length > 0) {
                      // 현재 필드와 일치하는 셀 찾기
                      const matchingCell = editingCells.find((cell: any) => 
                        cell.column?.getColId?.() === fieldName || cell.colId === fieldName
                      ) || editingCells[0]
                      
                      if (matchingCell.rowIndex != null) {
                        const editingRowNode = apiToUse.getDisplayedRowAtIndex(matchingCell.rowIndex)
                        nodeData = editingRowNode?.data
                        console.log(`[AgGrid] 편집 중인 셀에서 행 데이터 가져옴 (rowIndex=${matchingCell.rowIndex}):`, nodeData)
                      }
                    }
                  }
                  
                  // 방법 3: focusedCell을 통해 가져오기
                  if (!nodeData) {
                    const focusedCell = apiToUse.getFocusedCell?.()
                    if (focusedCell?.rowIndex != null) {
                      const focusedRowNode = apiToUse.getDisplayedRowAtIndex(focusedCell.rowIndex)
                      nodeData = focusedRowNode?.data
                      console.log(`[AgGrid] 포커스된 셀에서 행 데이터 가져옴:`, nodeData)
                    }
                  }
                } catch (e) {
                  console.warn('[AgGrid] api를 통한 행 데이터 가져오기 실패:', e)
                }
              }
              
              const cellData = nodeData || paramData || {}
              
              // 현재 선택된 값 가져오기
              let currentValue: any = null
              
              // 방법 1: valueGetter 사용 (실제 데이터가 있을 때만)
              if (colDef?.valueGetter && typeof colDef.valueGetter === 'function' && cellData && Object.keys(cellData).length > 0) {
                try {
                  const getterParams = {
                    data: cellData,
                    node: params?.node || { data: cellData },
                    colDef: colDef,
                    column: params?.column,
                    api: params?.api,
                    context: params?.context
                  }
                  currentValue = colDef.valueGetter(getterParams)
                  if (currentValue != null && currentValue !== '') {
                    console.log(`[AgGrid] valueGetter 결과: ${currentValue}`)
                  }
                } catch (e) {
                  console.warn('[AgGrid] valueGetter 실행 실패:', e)
                }
              }
              
              // 방법 2: params.value (AG Grid가 제공하는 값)
              if ((currentValue == null || currentValue === '') && params?.value != null && params.value !== '') {
                currentValue = params.value
                console.log(`[AgGrid] params.value 사용: ${currentValue}`)
              }
              
              // 방법 3: nodeData에서 직접 가져오기
              if ((currentValue == null || currentValue === '') && nodeData && typeof nodeData === 'object' && fieldName in nodeData) {
                currentValue = nodeData[fieldName]
                console.log(`[AgGrid] nodeData[${fieldName}] 사용: ${currentValue}`)
              }
              
              // 방법 4: paramData에서 직접 가져오기
              if ((currentValue == null || currentValue === '') && paramData && typeof paramData === 'object' && fieldName in paramData) {
                currentValue = paramData[fieldName]
                console.log(`[AgGrid] paramData[${fieldName}] 사용: ${currentValue}`)
              }
              
              // 방법 5: smartGet 사용
              if ((currentValue == null || currentValue === '') && cellData && typeof cellData === 'object') {
                currentValue = smartGet(cellData, fieldName)
                if (currentValue != null && currentValue !== '') {
                  console.log(`[AgGrid] smartGet 사용: ${currentValue}`)
                }
              }
              
              const currentValueStr = (currentValue != null && currentValue !== '' && currentValue !== undefined) 
                ? String(currentValue).trim() 
                : ''
              
              console.log(`[AgGrid] Select Editor 최종: field=${fieldName}, currentValueStr="${currentValueStr}", options=${options.length}개`)
              
              if (options.length > 0) {
                let hasSelected = false
                let selectedOption: HTMLOptionElement | null = null
                
                // 먼저 옵션들을 추가하고 현재 값과 일치하는 옵션 찾기
                options.forEach((opt: any) => {
                  const o = document.createElement('option')
                  o.value = String(opt.code)
                  o.text = String(opt.code_name ?? opt.name ?? opt.text ?? opt.code)
                  o.selected = false // 기본으로 선택하지 않음
                  
                  // 현재 값과 일치하면 선택
                  if (currentValueStr && String(opt.code) === currentValueStr) {
                    o.selected = true
                    hasSelected = true
                    selectedOption = o
                    console.log(`[AgGrid] 현재 값과 일치하는 옵션 선택: ${opt.code} = ${opt.code_name}`)
                  }
                  if (isDark) {
                    o.style.backgroundColor = '#1e293b'
                    o.style.color = '#e2e8f0'
                  }
                  select.appendChild(o)
                })
                
                // 현재 값이 없거나 옵션에 없으면 placeholder를 맨 앞에 추가하고 선택
                if (!currentValueStr || !hasSelected) {
                  const placeholder = document.createElement('option')
                  placeholder.value = ''
                  placeholder.text = '-- 선택 --'
                  placeholder.selected = true
                  if (isDark) {
                    placeholder.style.color = '#94a3b8'
                  }
                  select.insertBefore(placeholder, select.firstChild)
                  console.log(`[AgGrid] Placeholder 추가 및 선택: currentValueStr="${currentValueStr}", hasSelected=${hasSelected}`)
                } else {
                  console.log(`[AgGrid] 현재 값 유지: ${currentValueStr}`)
                }
              } else {
                // 옵션이 없으면 placeholder만 추가하고 선택
                const placeholder = document.createElement('option')
                placeholder.value = ''
                placeholder.text = '-- 옵션 로딩 중 --'
                placeholder.selected = true
                if (isDark) {
                  placeholder.style.color = '#94a3b8'
                }
                select.appendChild(placeholder)
              }
              
              // 포커스/호버 스타일
              select.addEventListener('focus', () => {
                select.style.borderColor = isDark ? '#60a5fa' : '#3b82f6'
                select.style.boxShadow = isDark 
                  ? '0 0 0 0.2rem rgba(96, 165, 250, 0.2)' 
                  : '0 0 0 0.2rem rgba(59, 130, 246, 0.2)'
              })
              select.addEventListener('blur', () => {
                select.style.borderColor = isDark ? '#475569' : '#d1d5db'
                select.style.boxShadow = 'none'
              })
              
              // 셀 크기에 맞게 컨테이너 생성
              const container = document.createElement('div')
              container.style.display = 'flex'
              container.style.alignItems = 'stretch'
              container.style.margin = '0'
              container.style.padding = '0'
              container.appendChild(select)
              
              // select를 컨테이너에 꽉 차게 설정
              select.style.width = '100%'
              select.style.minHeight = '28px' // AG Grid 기본 행 높이
              select.style.boxSizing = 'border-box'
              select.style.margin = '0'
              
              // AG Grid ICellEditor 인터페이스 구현 객체 반환
              return {
                getGui: () => container, // 컨테이너 반환
                afterGuiAttached: () => { 
                  select.focus()
                  
                  // 셀의 실제 크기에 맞게 조정
                  let cellWidth = 200 // 기본값
                  
                  // 방법 1: eGridCell 사용
                  if (params?.eGridCell) {
                    const cellRect = params.eGridCell.getBoundingClientRect()
                    cellWidth = cellRect.width
                  }
                  // 방법 2: column의 실제 너비 사용
                  else if (params?.column) {
                    const columnWidth = params.column.getActualWidth()
                    if (columnWidth && columnWidth > 0) {
                      cellWidth = columnWidth
                    }
                  }
                  // 방법 3: colDef의 width 사용
                  else if (params?.colDef?.width) {
                    cellWidth = params.colDef.width
                  }
                  
                  // 컨테이너와 select의 너비를 셀 크기에 맞게 설정
                  container.style.width = `${cellWidth}px`
                  container.style.minWidth = `${cellWidth}px`
                  container.style.maxWidth = `${cellWidth}px`
                  select.style.width = `${cellWidth}px`
                  select.style.minWidth = `${cellWidth}px`
                  
                  // 셀 높이에 맞게 조정
                  if (params?.eGridCell) {
                    const cellRect = params.eGridCell.getBoundingClientRect()
                    const cellHeight = cellRect.height
                    container.style.height = `${cellHeight}px`
                    select.style.height = `${cellHeight}px`
                    select.style.minHeight = `${cellHeight}px`
                  }
                  
                  // 옵션이 나중에 로드되면 업데이트
                  const currentColDef = (params?.colDef || def) as any
                  const currentOptions = currentColDef?.context?.__options || []
                  const updatedCellData = params?.data || params?.node?.data || cellData
                  
                  if (currentOptions.length > 0 && select.children.length === 1) {
                    // 현재 값 가져오기 (여러 방법 시도)
                    let curValue: any = null
                    
                    // valueGetter 사용
                    if (currentColDef?.valueGetter && typeof currentColDef.valueGetter === 'function') {
                      try {
                        curValue = currentColDef.valueGetter({
                          data: updatedCellData,
                          node: params?.node,
                          colDef: currentColDef,
                          column: params?.column,
                          api: params?.api,
                          context: params?.context
                        })
                      } catch (e) {}
                    }
                    
                    // params.value 사용
                    if ((curValue == null || curValue === '') && params?.value != null && params.value !== '') {
                      curValue = params.value
                    }
                    
                    // cellData에서 직접 가져오기
                    if ((curValue == null || curValue === '') && updatedCellData && fieldName in updatedCellData) {
                      curValue = updatedCellData[fieldName]
                    }
                    
                    // smartGet 사용
                    if ((curValue == null || curValue === '') && updatedCellData) {
                      curValue = smartGet(updatedCellData, fieldName)
                    }
                    
                    const curValueStr = (curValue != null && curValue !== '' && curValue !== undefined) 
                      ? String(curValue).trim() 
                      : ''
                    
                    // 기존 placeholder 제거
                    const oldPlaceholder = select.children[0] as HTMLOptionElement
                    if (oldPlaceholder && oldPlaceholder.value === '') {
                      select.removeChild(oldPlaceholder)
                    }
                    
                    let hasSelected = false
                    // 먼저 모든 옵션을 추가하고 현재 값과 일치하는 옵션 선택
                    currentOptions.forEach((opt: any) => {
                      const o = document.createElement('option')
                      o.value = String(opt.code)
                      o.text = String(opt.code_name ?? opt.name ?? opt.text ?? opt.code)
                      o.selected = false // 기본으로 선택하지 않음
                      // 현재 값과 일치하면 선택
                      if (curValueStr && String(opt.code) === curValueStr) {
                        o.selected = true
                        hasSelected = true
                      }
                      if (isDark) {
                        o.style.backgroundColor = '#1e293b'
                        o.style.color = '#e2e8f0'
                      }
                      select.appendChild(o)
                    })
                    
                    // 현재 값이 없거나 옵션에 없으면 placeholder를 맨 앞에 추가하고 선택
                    if (!curValueStr || !hasSelected) {
                      const newPlaceholder = document.createElement('option')
                      newPlaceholder.value = ''
                      newPlaceholder.text = '-- 선택 --'
                      newPlaceholder.selected = true
                      if (isDark) {
                        newPlaceholder.style.color = '#94a3b8'
                      }
                      select.insertBefore(newPlaceholder, select.firstChild)
                    }
                  }
                },
                getValue: () => {
                  const val = select.value
                  return val === '' ? null : val
                },
                isPopup: () => true,
                isCancelBeforeStart: () => false,
                isCancelAfterEnd: () => false
              }
            }
            def.valueSetter = (p: any) => smartSet(p?.data, def.field, p.newValue || null)
          } else {
            // 편집 불가능한 경우에도 기본 설정
            def.editable = false
          }
        }

        return def
      })
      // 옵션 로드가 끝나면 일괄 반영
      try { await Promise.allSettled(dropdownPromises) } catch {}
      dynamicColumnDefs.value = tempDefs
      saveParamFields.value = saveFields
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
  resizable: true,
  sortable: true,
  filter: true,
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
    // 편집 관련 전역 설정 (컬럼별 editable 정책에 의해 실제 편집 가능 여부가 결정됨)
    stopEditingWhenCellsLoseFocus: true,
    singleClickEdit: props.editMode === 'singleClick',
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
    // 편집 가능한 셀인지 확인 (editable이 함수일 수 있음)
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
            columnApi: gridApi.value?.getColumnApi ? gridApi.value.getColumnApi() : undefined,
            context: undefined
          })
        } catch { allowed = false }
      } else {
        allowed = colDef.editable !== false
      }
    }
    if (allowed) {
      console.log('AgGrid - 더블클릭 편집 시작:', event.column.getColId(), event.column.getColDef())
      // 편집 시작 전에 행 데이터와 rowIndex를 저장 (셀 에디터에서 params가 없을 때 사용)
      lastEditingCellData.value = event?.data || event?.node?.data || null
      lastEditingRowIndex.value = event?.rowIndex ?? null
      console.log('AgGrid - 편집 시작 데이터 저장:', { data: lastEditingCellData.value, rowIndex: lastEditingRowIndex.value })
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
  emit('row-clicked', event)
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

/**
 * 변경 데이터 저장 실행
 * - props.procedureName / props.saveCase / props.extraSaveParams 사용
 * - getChangedRows()로 추가/수정/삭제 행을 수집하고, col_save 지정 필드만 전송
 * - 성공 시 'saved' 이벤트, 실패 시 'save-error' 이벤트 emit
 */
async function save(): Promise<any> {
  const procedureName = String(props.procedureName || '').trim()
  if (!procedureName) {
    const err = new Error('procedureName이 설정되지 않았습니다.')
    emit('save-error', err)
    throw err
  }
  try {
    const changed = (exposeMethods as any)?.getChangedRows?.() as { added: any[]; modified: any[]; deleted: any[] } || { added: [], modified: [], deleted: [] }
    const saveFields = saveParamFields.value || []
    
    // 행 상태별 처리 함수
    const execForRows = async (rows: any[], rowState: 'A' | 'M' | 'D') => {
      for (const row of rows) {
        const rowParams = pickSaveFields(row, saveFields)
        const parameters = {
          case: props.saveCase || 'save',
          row_state: rowState,
          ...rowParams,
          ...props.extraSaveParams,
        }
        await $fetch<any>('/api/stored-procedure/execute', {
          method: 'POST',
          body: { procedureName, parameters }
        })
      }
    }
    
    // 추가/수정/삭제 처리
    await execForRows(changed.added, 'A')
    await execForRows(changed.modified, 'M')
    await execForRows(changed.deleted, 'D')

    // 성공적으로 저장된 후 상태 초기화 (그리드 내부 데이터 기준으로 초기화)
    try {
      const allRows: any[] = (exposeMethods as any)?.getAllRows?.() || []
      allRows.forEach((r: any) => { if (r && r.__status) delete r.__status })
      try { newlyAddedRows.value?.clear?.() } catch {}
      try {
        seenRows.value = new WeakSet<any>()
        allRows.forEach((r: any) => { if (r && typeof r === 'object') seenRows.value.add(r) })
      } catch {}
      refreshStatusCells()
    } catch {}

    const summary = { added: changed.added.length, modified: changed.modified.length, deleted: changed.deleted.length }
    emit('saved', summary)
    return summary
  } catch (error) {
    emit('save-error', error)
    throw error
  }
}

/**
 * 저장 버튼 클릭 핸들러
 * - 내부 저장 중 상태 관리
 * - save() 함수 호출
 */
async function handleSave() {
  if (isSaving.value) return
  
  internalSaving.value = true
  try {
    await save()
  } finally {
    internalSaving.value = false
  }
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

/**
 * 외부 공개 메서드 요약
 * - expandAll/collapseAll: 트리 전체 펼치기/접기
 * - exportExcel: 엑셀 내보내기
 * - applyFilter: Quick Filter 적용
 * - getGridApi: 내부 Grid API 반환
 * - loadDynamicColumnDefs/getDynamicColumnDefs: 동적 컬럼 로드/조회
 * - markDeleted/clearStatuses: 행 상태 관리
 * - addRow/deleteSelectedRows/stopEditing: 행 추가/삭제/편집 종료
 * - getAllRows/getChangedRows: 전체/변경 행 조회(added/modified/deleted 구분)
 */
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
  save, // 저장 메서드 추가
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
  getSaveParamFields: () => saveParamFields.value, // 저장 파라미터 필드 목록
  // save 항목은 위에 이미 포함됨
}

// 부모 컴포넌트에서 메서드 호출 가능하도록 expose
defineExpose(exposeMethods)

// 감시자들 (Watchers)
// 다크모드 변경 시 테마 업데이트
watch(() => colorMode.value, () => updateGridTheme())

// saveParamFields prop 변경 시 ref에 동기화
watch(() => props.saveParamFields, (newFields) => {
  if (newFields && Array.isArray(newFields)) {
    saveParamFields.value = [...newFields]
  }
}, { immediate: true })

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
