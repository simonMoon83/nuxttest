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

// 아이콘 선택 편집기 클래스
class IconSelectEditor {
  private container: HTMLElement
  private selectedValue: string
  private params: any

  constructor() {
    this.container = document.createElement('div')
    this.selectedValue = ''
  }

  init(params: any) {
    this.params = params
    this.selectedValue = params.value || ''
    
    this.container.className = 'icon-select-editor'
    this.container.style.width = '300px'
    this.container.style.height = '200px'
    this.container.style.padding = '10px'
    this.container.style.backgroundColor = 'white'
    this.container.style.border = '1px solid #ccc'
    this.container.style.borderRadius = '4px'
    this.container.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
    
    // 헤더 영역 (닫기 버튼)
    const header = document.createElement('div')
    header.style.display = 'flex'
    header.style.justifyContent = 'space-between'
    header.style.alignItems = 'center'
    header.style.marginBottom = '10px'
    header.style.paddingBottom = '8px'
    header.style.borderBottom = '1px solid #eee'
    
    const title = document.createElement('div')
    title.textContent = '아이콘 선택'
    title.style.fontWeight = 'bold'
    title.style.fontSize = '14px'
    
    const closeButton = document.createElement('button')
    closeButton.innerHTML = '✕'
    closeButton.style.background = 'none'
    closeButton.style.border = 'none'
    closeButton.style.fontSize = '16px'
    closeButton.style.cursor = 'pointer'
    closeButton.style.padding = '4px 8px'
    closeButton.style.borderRadius = '4px'
    closeButton.style.color = '#666'
    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.backgroundColor = '#f5f5f5'
    })
    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.backgroundColor = 'transparent'
    })
    closeButton.addEventListener('click', () => {
      this.params.stopEditing()
    })
    
    header.appendChild(title)
    header.appendChild(closeButton)
    this.container.appendChild(header)
    
    const iconOptions = [
      '', // 빈 아이콘 옵션 (첫 번째)
      'pi pi-home', 
'pi pi-check-square', 
'pi pi-list', 
'pi pi-image', 
'pi pi-server',
      'pi pi-book', 
'pi pi-user', 
'pi pi-cog', 
'pi pi-search', 
'pi pi-pencil',
      'pi pi-trash', 
'pi pi-plus', 
'pi pi-save', 
'pi pi-times', 
'pi pi-check',
      'pi pi-info-circle', 
'pi pi-exclamation-triangle', 
'pi pi-times-circle', 
'pi pi-check-circle',
      'pi pi-folder', 
'pi pi-file', 
'pi pi-download', 
'pi pi-upload', 
'pi pi-print',
      'pi pi-refresh', 
'pi pi-bell', 
'pi pi-envelope', 
'pi pi-phone', 
'pi pi-map-marker',
      'pi pi-clock', 
'pi pi-calendar', 
'pi pi-chart-bar', 
'pi pi-chart-line', 
'pi pi-table',
      'pi pi-database', 
'pi pi-globe', 
'pi pi-shield', 
'pi pi-key', 
'pi pi-lock',
      'pi pi-unlock', 
'pi pi-arrow-up', 
'pi pi-arrow-down', 
'pi pi-arrow-left', 
'pi pi-arrow-right',
      'pi pi-star', 
'pi pi-heart', 
'pi pi-thumbs-up', 
'pi pi-thumbs-down'
    ]
    
    // 아이콘 그리드 생성
    const grid = document.createElement('div')
    grid.style.display = 'grid'
    grid.style.gridTemplateColumns = 'repeat(6, 1fr)'
    grid.style.gap = '8px'
    grid.style.maxHeight = '150px'
    grid.style.overflowY = 'auto'
    
    iconOptions.forEach(iconClass => {
      const iconDiv = document.createElement('div')
      iconDiv.style.display = 'flex'
      iconDiv.style.flexDirection = 'column'
      iconDiv.style.alignItems = 'center'
      iconDiv.style.padding = '8px'
      iconDiv.style.border = '1px solid #ddd'
      iconDiv.style.borderRadius = '4px'
      iconDiv.style.cursor = 'pointer'
      iconDiv.style.transition = 'all 0.2s'
      
      if (iconClass === this.selectedValue) {
        iconDiv.style.backgroundColor = '#e3f2fd'
        iconDiv.style.borderColor = '#2196f3'
      }
      
      if (iconClass === '') {
        // 빈 아이콘 옵션 (네모박스)
        iconDiv.innerHTML = `<div style="width: 18px; height: 18px; border: 2px solid #2196f3; border-radius: 2px; margin-bottom: 4px;"></div>`
      } else {
        iconDiv.innerHTML = `<i class="${iconClass}" style="font-size: 18px; color: #2196f3; margin-bottom: 4px;"></i>`
      }
      
      iconDiv.addEventListener('mouseenter', () => {
        if (iconClass !== this.selectedValue) {
          iconDiv.style.backgroundColor = '#f5f5f5'
        }
      })
      
      iconDiv.addEventListener('mouseleave', () => {
        if (iconClass !== this.selectedValue) {
          iconDiv.style.backgroundColor = 'white'
        }
      })
      
      iconDiv.addEventListener('click', () => {
        // 이전 선택 해제
        grid.querySelectorAll('div').forEach(el => {
          el.style.backgroundColor = 'white'
          el.style.borderColor = '#ddd'
        })
        // 새 선택 적용
        iconDiv.style.backgroundColor = '#e3f2fd'
        iconDiv.style.borderColor = '#2196f3'
        this.selectedValue = iconClass
      })
      
      grid.appendChild(iconDiv)
    })
    
    this.container.appendChild(grid)
  }

  getGui() {
    return this.container
  }

  getValue() {
    return this.selectedValue
  }

  isPopup() {
    return true
  }
}

// 아이콘 컬럼 정의
const iconColumnDef = ref<any>({
  field: 'menu_icon',
  headerName: '아이콘',
  width: 200,
  editable: true,
  cellRenderer: (params: any) => {
    const iconValue = params.value
    if (!iconValue) {
      // 빈 아이콘 표시 (네모박스)
      const div = document.createElement('div')
      div.className = 'flex items-center justify-center'
      div.innerHTML = `<div style="width: 20px; height: 20px; border: 2px solid #2196f3; border-radius: 2px;"></div>`
      return div
    }
    
    const div = document.createElement('div')
    div.className = 'flex items-center justify-center'
    div.innerHTML = `<i class="${iconValue} text-primary text-lg"></i>`
    return div
  },
  cellEditor: IconSelectEditor,
  cellEditorPopup: true,
  singleClickEdit: false
})

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
  
  // 아이콘 컬럼 정보 확인
  const iconColumn = params.api.getColumn('menu_icon')
  if (iconColumn) {
    console.log('Menu5 - 아이콘 컬럼 정보:', iconColumn.getColDef())
  } else {
    console.log('Menu5 - 아이콘 컬럼을 찾을 수 없습니다')
  }
  
  // AgGrid 컴포넌트의 동적 컬럼 정보 확인
  if (agGridRef.value) {
    console.log('Menu5 - AgGrid 동적 컬럼 정보:', agGridRef.value.getDynamicColumnDefs())
  }
}

function onCellDoubleClicked(event: any) {
  console.log('Menu5 - Cell double clicked:', event)
  console.log('Menu5 - Column:', event.column?.getColId())
  console.log('Menu5 - Column definition:', event.column?.getColDef())
  
  // 아이콘 컬럼인 경우 특별 처리
  if (event.column?.getColId() === 'menu_icon') {
    console.log('Menu5 - 아이콘 컬럼 더블클릭 감지')
    console.log('Menu5 - 아이콘 컬럼 정의:', event.column?.getColDef())
    
    // 아이콘 컬럼의 편집을 강제로 시작
    try {
      const result = event.api.startEditingCell({
        rowIndex: event.rowIndex,
        colKey: 'menu_icon'
      })
      console.log('Menu5 - 아이콘 컬럼 편집 시작 시도, 결과:', result)
      
      // 편집 상태 확인
      setTimeout(() => {
        const editingCells = event.api.getEditingCells()
        console.log('Menu5 - 현재 편집 중인 셀들:', editingCells)
      }, 100)
    } catch (error) {
      console.error('Menu5 - 아이콘 컬럼 편집 시작 실패:', error)
    }
  }
}

// 편집 관련 이벤트 핸들러들
function onCellValueChanged(event: any) {
  console.log('셀 값 변경:', event)
  // 여기에 값 변경 처리 로직 추가
}

function onRowEditingStarted(event: any) {
  console.log('Menu5 - 행 편집 시작:', event)
  console.log('Menu5 - 편집 시작 컬럼:', event.column?.getColId())
  // 여기에 편집 시작 처리 로직 추가
}

function onRowEditingStopped(event: any) {
  console.log('Menu5 - 행 편집 종료:', event)
  console.log('Menu5 - 편집 종료 컬럼:', event.column?.getColId())
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
        :procedure-name="procedureName"
        :search-schema-grid-id="searchSchemaGridId"
        @grid-ready="onGridReady"
        @search="onSearch"
      >
    <template #ag-grid="{ rowData, columnDefs, searchQuery }">
       <AgGrid
         ref="agGridRef"
         :title="title"
         :row-data="rowData"
         :search-query="searchQuery"
         :column-defs="[iconColumnDef]"
         grid-id="menu5_header"
         :editable="true"
         edit-mode="doubleClick"
         @grid-ready="onGridReady"
         @cell-double-clicked="onCellDoubleClicked"
         @cell-value-changed="onCellValueChanged"
         @row-editing-started="onRowEditingStarted"
         @row-editing-stopped="onRowEditingStopped"
       />
       <!-- @cell-double-clicked="onCellDoubleClicked"
         주석처리함 -->
    </template>
  </DefaultPage>
</template>
