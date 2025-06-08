<script setup>
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'
import { AgGridVue } from 'ag-grid-vue3' // AgGridVue 컴포넌트 임포트
import { ref } from 'vue'
// Legacy 테마 사용 시 필요한 CSS 파일들 임포트
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'

ModuleRegistry.registerModules([AllCommunityModule])

// 예시 데이터 정의
const rowData = ref([
  { make: 'Toyota', model: 'Celica', price: 35000 },
  { make: 'Ford', model: 'Mondeo', price: 32000 },
  { make: 'Porsche', model: 'Boxster', price: 72000 },
])

// 예시 컬럼 정의
const columnDefs = ref([
  { field: 'make', filter: true }, // filter: true를 추가하여 필터링 가능하게 함
  { field: 'model' },
  { field: 'price', sortable: true }, // sortable: true를 추가하여 정렬 가능하게 함
])

// 기본 컬럼 설정 (선택 사항)
const defaultColDef = ref({
  flex: 1, // 모든 컬럼이 남은 공간을 채우도록 설정
  minWidth: 100,
})

// 새로운 rowSelection 설정
const rowSelection = ref({
  mode: 'multiRow',
  checkboxes: true,
  headerCheckbox: true,
})

// 이벤트 핸들러 예시 (선택 사항)
function onCellClicked(event) {
  console.warn('Cell clicked:', event.data)
}

// 기타 Ag-Grid 설정이나 이벤트는 Ag-Grid 문서를 참고하여 추가할 수 있습니다.
</script>

<template>
  <div>
    <h1>Nuxt 3 Ag-Grid Example</h1>

    <!-- Ag-Grid는 SSR을 지원하지 않으므로 ClientOnly로 감싸줍니다. -->
    <ClientOnly>
      <div class="ag-theme-quartz" style="height: 500px; width: 100%;">
        <AgGridVue
          :row-data="rowData"
          style="width: 100%; height: 100%;"
          :column-defs="columnDefs"
          :default-col-def="defaultColDef"
          :animate-rows="true"
          :row-selection="rowSelection"
          theme="legacy"
          @cell-clicked="onCellClicked"
        />
      </div>
      <template #fallback>
        <!-- 클라이언트 렌더링 대기 중에 보여줄 내용 (선택 사항) -->
        <p>Loading grid...</p>
      </template>
    </ClientOnly>
  </div>
</template>

<style scoped>
/* 커스텀 스타일링이 필요한 경우에만 사용 */
</style>
