<script setup lang='ts'>
import AgGrid from '~/components/AgGrid.vue'

definePageMeta({ layout: 'default', middleware: 'auth' })

// 필터 초기값 (동적으로 설정됨)
const filters = ref<any>({})

// 페이지 제목
const title = ref('메뉴 관리')

// API 엔드포인트
const apiEndpoint = ref('/api/menu/admin')

// 기본 검색 스키마는 sp_grid_info로 동적 생성되므로 빈 배열
const schema = ref<any>([])

// 편집 스키마 (기본값 사용)
const editSchema = ref<any>([])

// 글로벌 타이틀 표시 여부
const showGlobalTitle = ref(true)

// 사용할 저장 프로시저 이름
const procedureName = ref('sp_menu_info999')

// 검색 스키마 grid_id (DefaultPage로 전달)
const searchSchemaGridId = ref('menu5_search')

// DefaultPage와 AgGrid 참조
const defaultPageRef = ref()
const agGridRef = ref()

// AG Grid 이벤트 핸들러
function onGridReady(params: any) {
  console.log('Menu5 - Grid is ready:', params)
  console.log('Menu5 - Grid API:', params.api)
  
  // AgGrid 컴포넌트의 동적 컬럼 정보 확인
  if (agGridRef.value) {
    console.log('Menu5 - AgGrid 동적 컬럼 정보:', agGridRef.value.getDynamicColumnDefs())
  }
}

function onCellDoubleClicked(event: any) {
  // DefaultPage의 openEdit 메서드 호출
  if (defaultPageRef.value) {
    defaultPageRef.value.openEdit(event.data)
  }
}

// 편집 관련 이벤트 핸들러들
function onCellValueChanged(event: any) {
  console.log('셀 값 변경:', event)
  // 여기에 값 변경 처리 로직 추가
}

function onRowEditingStarted(event: any) {
  console.log('행 편집 시작:', event)
  // 여기에 편집 시작 처리 로직 추가
}

function onRowEditingStopped(event: any) {
  console.log('행 편집 종료:', event)
  // 여기에 편집 종료 처리 로직 추가
}

// 검색 이벤트 핸들러
function onSearch(result: any) {
  console.log('검색 완료:', result)
  if (result.error) {
    console.error('검색 오류:', result.error)
    // 여기에 오류 처리 로직 추가 (예: 토스트 메시지)
  } else {
    console.log('검색된 데이터:', result.data)
    // 여기에 검색 결과 처리 로직 추가
  }
}

// AG Grid 메서드들을 DefaultPage에 연결
function expandAllGrid() {
  if (agGridRef.value) agGridRef.value.expandAll()
}

function collapseAllGrid() {
  if (agGridRef.value) agGridRef.value.collapseAll()
}

function applyGridFilter() {
  if (agGridRef.value) agGridRef.value.applyFilter()
}

function exportExcel() {
  if (agGridRef.value) agGridRef.value.exportExcel()
}

// DefaultPage의 메서드들을 오버라이드하여 AgGrid에 연결
onMounted(() => {
  nextTick(() => {
    if (defaultPageRef.value) {
      // DefaultPage의 expose된 메서드들을 AgGrid 메서드로 교체
      defaultPageRef.value.expandAllGrid = expandAllGrid
      defaultPageRef.value.collapseAllGrid = collapseAllGrid
      defaultPageRef.value.applyGridFilter = applyGridFilter
      defaultPageRef.value.exportExcel = exportExcel
      // 변경분 전달 훅 연결: DefaultPage가 저장 시 AgGrid 변경분을 직접 사용
      defaultPageRef.value.setChangedRowsProvider?.(() => {
        try {
          return agGridRef.value?.getChangedRows?.() || { added: [], modified: [], deleted: [] }
        } catch {
          return { added: [], modified: [], deleted: [] }
        }
      })
    }
  })
})
</script>

<template>
        <DefaultPage 
        ref="defaultPageRef"
        :schema="schema"
        :filters="filters"
        :title="title"
        :api-endpoint="apiEndpoint"
        :edit-schema="editSchema"
        :show-global-title="showGlobalTitle"
        :procedure-name="procedureName"
        :search-schema-grid-id="searchSchemaGridId"
        @grid-ready="onGridReady"
        @cell-double-clicked="onCellDoubleClicked"
        @search="onSearch"
      >
    <template #ag-grid="{ rowData, columnDefs, searchQuery }">
       <AgGrid
         ref="agGridRef"
         :title="title"
         :row-data="rowData"
         :search-query="searchQuery"
         grid-id="menu5_header"
         :editable="true"
         edit-mode="doubleClick"
         @grid-ready="onGridReady"
         @cell-value-changed="onCellValueChanged"
         @row-editing-started="onRowEditingStarted"
         @row-editing-stopped="onRowEditingStopped"
       />
       <!--@cell-double-clicked="onCellDoubleClicked"
         주석처리함-->
    </template>
  </DefaultPage>
</template>

