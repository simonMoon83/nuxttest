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
    </div>

    <!-- AG Grid 컨테이너 - 테마 클래스와 스타일 적용 -->
    <div :class="agGridThemeClass" class="ag-grid-menu4" style="height: 550px; width: 100%;">
      <div class="datatable-header"></div>
      <!-- AG Grid Vue 컴포넌트 -->
      <AgGridVue
         ref="agGrid"
         :row-data="rowData"
         :column-defs="finalColumnDefs"
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
       />
    </div>
  </div>
</template>

<script setup lang='ts'>
// AG Grid Vue 3 컴포넌트 import
import { AgGridVue } from 'ag-grid-vue3'
// AG Grid Community 모듈들 import
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'
// AG Grid Enterprise 모듈들 import (트리 데이터, 엑셀 내보내기, 셀 선택, 클립보드)
import { TreeDataModule, ExcelExportModule, CellSelectionModule, ClipboardModule } from 'ag-grid-enterprise'
// AG Grid CSS 스타일 import
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'

// Props 인터페이스 정의
interface Props {
  title?: string        // 그리드 제목
  columnDefs?: any[]    // 컬럼 정의 배열
  rowData?: any[]       // 행 데이터 배열
  searchQuery?: string  // 검색 쿼리 문자열
  gridId?: string       // 그리드 ID (동적 컬럼 정보 조회용)
  treeData?: boolean    // 트리 데이터 사용 여부
  autoGroupColumnName?: string  // 자동 그룹 컬럼 헤더 이름
  editable?: boolean    // 편집 가능 여부
  editMode?: 'singleClick' | 'doubleClick' | 'enterKey'  // 편집 모드
  rowSelect?: boolean   // 행 선택 기능 사용 여부
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
  'grid-ready': [params: any]           // 그리드 준비 완료 이벤트
  'cell-double-clicked': [event: any]   // 셀 더블클릭 이벤트
  'expand-all': []                      // 전체 펼치기 이벤트
  'collapse-all': []                    // 전체 접기 이벤트
  'cell-value-changed': [event: any]    // 셀 값 변경 이벤트
  'row-editing-started': [event: any]   // 행 편집 시작 이벤트
  'row-editing-stopped': [event: any]   // 행 편집 종료 이벤트
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
      // 컬럼 정보를 AG Grid 형식으로 변환
      dynamicColumnDefs.value = result.data.map((col: any) => ({
        field: col.col_id || '',
        headerName: col.col_name || '',
        width: col.col_width || 100,
        hide: col.col_hide === 1,
        flex: col.col_flex || undefined
      }))
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
  resizable: true,    // 컬럼 크기 조절 가능
  sortable: true,     // 정렬 가능
  filter: true,       // 필터링 가능
  editable: props.editable,  // 편집 가능 여부
  // 편집 모드에 따른 설정
  ...(props.editable && {
    cellEditor: 'agTextCellEditor',  // 기본 텍스트 편집기
    cellEditorPopup: false,          // 팝업 편집기 비활성화
  })
})

// AG Grid 옵션 설정 (트리 데이터가 있을 때만 그룹 관련 설정 적용)
const gridOptions = computed(() => {
  const baseOptions = {
    rowHeight: 28,                    // 행 높이
    headerHeight: 32,                 // 헤더 높이
    animateRows: true,                // 행 애니메이션 활성화
    enableRangeSelection: true,       // 범위 선택 활성화
    enableRangeHandle: true,          // 범위 핸들 활성화
    clipboardDelimiter: '\t',         // 클립보드 구분자
    // 편집 관련 설정
    ...(props.editable && {
      editType: 'fullRow' as const,   // 전체 행 편집 모드
      stopEditingWhenCellsLoseFocus: true,  // 포커스 잃을 때 편집 종료
    })
  }
  
  // 트리 데이터가 있을 때만 그룹 관련 설정 추가
  if (props.treeData) {
    return {
      ...baseOptions,
      groupDefaultExpanded: 1,        // 기본적으로 1레벨까지 펼쳐짐
    }
  }
  
  return baseOptions
})

// 행 선택 설정
const rowSelection = ref({ 
  mode: 'multiRow' as const,        // 다중 행 선택 모드
  checkboxes: true,                 // 체크박스 표시
  headerCheckbox: true              // 헤더 체크박스 표시
})

// 자동 그룹 컬럼 정의 (트리 데이터용)
const autoGroupColumnDef = ref<any>({
  headerName: props.autoGroupColumnName || '메뉴명',  // 동적으로 받아온 이름 또는 기본값
  cellRendererParams: { suppressCount: true }, // 카운트 숨김
})

// 최종 컬럼 정의 (동적 컬럼 정보 우선, props 컬럼 정의는 fallback)
const finalColumnDefs = computed(() => {
  if (dynamicColumnDefs.value.length > 0) {
    return dynamicColumnDefs.value
  }
  return props.columnDefs
})

/**
 * AG Grid 준비 완료 이벤트 핸들러
 * @param params AG Grid API 파라미터
 */
function onGridReady(params: any) { 
  gridApi.value = params.api        // Grid API 저장
  applyGridFilter()                 // 초기 필터 적용
  updateGridTheme()                 // 테마 업데이트
  
  emit('grid-ready', params)        // 부모에게 이벤트 전달
}

/**
 * 셀 더블클릭 이벤트 핸들러
 * @param event 더블클릭 이벤트 객체
 */
function onCellDoubleClicked(event: any) { 
  emit('cell-double-clicked', event) // 부모에게 이벤트 전달
}

/**
 * 셀 값 변경 이벤트 핸들러
 * @param event 값 변경 이벤트 객체
 */
function onCellValueChanged(event: any) {
  emit('cell-value-changed', event)
}

/**
 * 행 편집 시작 이벤트 핸들러
 * @param event 편집 시작 이벤트 객체
 */
function onRowEditingStarted(event: any) {
  emit('row-editing-started', event)
}

/**
 * 행 편집 종료 이벤트 핸들러
 * @param event 편집 종료 이벤트 객체
 */
function onRowEditingStopped(event: any) {
  emit('row-editing-stopped', event)
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
  if (api) api.exportDataAsExcel({fileName: 'MenuList', sheetName: 'Menus' }) 
}

// 외부에서 호출할 수 있는 메서드들을 expose
const exposeMethods = {
  expandAll: expandAllGrid,         // 전체 펼치기
  collapseAll: collapseAllGrid,     // 전체 접기
  exportExcel,                      // 엑셀 내보내기
  applyFilter: applyExternalFilter, // 필터 적용
  getGridApi: () => gridApi.value,  // Grid API 반환
  loadDynamicColumnDefs,            // 동적 컬럼 정보 로드
  getDynamicColumnDefs: () => dynamicColumnDefs.value  // 동적 컬럼 정보 반환
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
  } else {
    console.log('gridId가 없어서 동적 컬럼 정보를 로드하지 않습니다.')
  }
})
</script>

<style scoped>
.field { margin-bottom: 1rem; }
</style>
