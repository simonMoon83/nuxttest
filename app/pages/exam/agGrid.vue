<script setup>
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'
import { AgGridVue } from 'ag-grid-vue3'
import { ref, computed, watch, onMounted } from 'vue'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'

ModuleRegistry.registerModules([AllCommunityModule])

// 컬러 모드 감지
const colorMode = useColorMode()

// AG-Grid 테마 클래스 계산
const agGridThemeClass = computed(() => {
  return colorMode.value === 'dark' ? 'ag-theme-quartz-dark' : 'ag-theme-quartz'
})

// 예시 데이터 정의
const rowData = ref([
  { make: 'Toyota', model: 'Celica', price: 35000, year: 2020, category: 'Sedan' },
  { make: 'Ford', model: 'Mondeo', price: 32000, year: 2019, category: 'Sedan' },
  { make: 'Porsche', model: 'Boxster', price: 72000, year: 2021, category: 'Sports' },
  { make: 'BMW', model: 'X5', price: 65000, year: 2022, category: 'SUV' },
  { make: 'Mercedes', model: 'C-Class', price: 55000, year: 2020, category: 'Sedan' },
  { make: 'Audi', model: 'A4', price: 48000, year: 2021, category: 'Sedan' },
  { make: 'Honda', model: 'Civic', price: 28000, year: 2022, category: 'Compact' },
  { make: 'Tesla', model: 'Model 3', price: 58000, year: 2023, category: 'Electric' },
])

// 예시 컬럼 정의
const columnDefs = ref([
  { 
    field: 'make', 
    headerName: '제조사',
    filter: true,
    sortable: true,
    width: 120
  },
  { 
    field: 'model', 
    headerName: '모델',
    filter: true,
    sortable: true,
    width: 150
  },
  { 
    field: 'price', 
    headerName: '가격',
    sortable: true,
    filter: 'agNumberColumnFilter',
    valueFormatter: (params) => {
      return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW'
      }).format(params.value)
    },
    width: 150
  },
  { 
    field: 'year', 
    headerName: '연도',
    filter: 'agNumberColumnFilter',
    sortable: true,
    width: 100
  },
  { 
    field: 'category', 
    headerName: '카테고리',
    filter: true,
    sortable: true,
    width: 120
  }
])

// 기본 컬럼 설정
const defaultColDef = ref({
  flex: 1,
  minWidth: 100,
  resizable: true,
  sortable: true,
  filter: true
})

// Grid API 참조
const gridApi = ref(null)

// 이벤트 핸들러
function onCellClicked(event) {
  console.warn('Cell clicked:', event.data)
}

// Grid 준비 완료 이벤트
function onGridReady(params) {
  gridApi.value = params.api
}

// 메서드들
const onSelectionChanged = () => {
  if (gridApi.value) {
    const selectedRows = gridApi.value.getSelectedRows()
    alert(`선택된 행: ${selectedRows.length}개`)
  }
}

const resetFilters = () => {
  if (gridApi.value) {
    gridApi.value.setFilterModel(null)
  }
}

// 테마 업데이트 함수
const updateGridTheme = () => {
  const gridDiv = document.querySelector('#myGrid')
  if (gridDiv) {
    // 기존 테마 클래스 제거
    gridDiv.classList.remove('ag-theme-quartz', 'ag-theme-quartz-dark')
    // 새 테마 클래스 추가
    gridDiv.classList.add(agGridThemeClass.value)
  }
}

// 컬러 모드 변경 감지
watch(() => colorMode.value, () => {
  updateGridTheme()
})

// 그리드 초기화
onMounted(() => {
  if (typeof window !== 'undefined') {
    import('ag-grid-community').then(({ createGrid }) => {
      const gridOptions = {
        theme: 'legacy', // v33 호환성을 위해 legacy 테마 사용
        columnDefs: columnDefs.value,
        rowData: rowData.value,
        defaultColDef: defaultColDef.value,
        animateRows: true,
        rowSelection: { mode: 'multiRow' }, // v32.2+ 새로운 문법
        pagination: true,
        paginationPageSize: 10,
        paginationPageSizeSelector: [10, 20, 50, 100],
        onGridReady: (params) => {
          gridApi.value = params.api
          // 초기 테마 적용
          updateGridTheme()
        },
        onCellClicked: onCellClicked,
        onSelectionChanged: () => {
          if (gridApi.value) {
            const selectedRows = gridApi.value.getSelectedRows()
            console.log('선택된 행들:', selectedRows)
          }
        }
      }
      
      const gridDiv = document.querySelector('#myGrid')
      if (gridDiv) {
        createGrid(gridDiv, gridOptions)
      }
    })
  }
})
</script>

<template>
  <div class="ag-grid-page">
    <!-- 페이지 헤더 -->
    <div class="page-header">
      <h1 class="page-title">
        <i class="pi pi-table"></i>
        AG-Grid 데모
      </h1>
      <p class="page-description">고성능 데이터 그리드 컴포넌트 예제</p>
    </div>

    <!-- 그리드 컨트롤 패널 -->
    <Card class="mb-6">
      <template #content>
        <div class="controls">
          <Button
            label="선택한 행 보기"
            icon="pi pi-search"
            severity="info"
            size="small"
            @click="onSelectionChanged"
          />
          <Button
            label="필터 초기화"
            icon="pi pi-refresh"
            severity="warning"
            size="small"
            @click="resetFilters"
            outlined
          />
        </div>
      </template>
    </Card>

    <!-- AG-Grid 데이터 그리드 -->
    <Card>
      <template #content>
        <div 
          id="myGrid" 
          :class="agGridThemeClass"
          class="ag-grid-container">
        </div>
      </template>
    </Card>
  </div>
</template>

<style scoped>
.ag-grid-page {
  padding: 1.5rem;
  width: 100%;
}

.page-header {
  margin-bottom: 2rem;
}

.page-title {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.page-description {
  color: var(--p-text-secondary-color);
}

.controls {
  display: flex;
  gap: 1rem;
}

.ag-grid-container {
  height: 500px;
  width: 100%;
}
</style>
