<script setup lang='ts'>
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'
import { AgGridVue } from 'ag-grid-vue3'
import { onMounted, ref } from 'vue'
// Legacy 테마 사용 시 필요한 CSS 파일들 임포트
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'

const { addElement } = useFormKitSchema()
const { t } = useI18n()

const data = ref()

onMounted(() => {
  const defaultData = { search_condition1: '1', search_condition2: '2', search_condition3: '3', search_condition4: '4', search_condition5: '5', search_condition6: '6', search_condition7: '7', search_condition8: '8' }
  data.value = defaultData
})

const schema = ref<any>([
  addElement('h5', ['상세검색 조건']),
  {
    $formkit: 'primeInputText',
    name: 'search_condition1',
    label: '상세검색 조건',
    outerClass: 'col-3',
  },
  {
    $formkit: 'primeInputText',
    name: 'search_condition2',
    label: '상세검색 조건',
    outerClass: 'col-3',
  },
  {
    $formkit: 'primeInputText',
    name: 'search_condition3',
    label: '상세검색 조건',
    outerClass: 'col-3',
  },
  {
    $formkit: 'primeInputText',
    name: 'search_condition4',
    label: '상세검색 조건',
    outerClass: 'col-3',
  },
  {
    $formkit: 'primeInputText',
    name: 'search_condition5',
    label: '상세검색 조건',
    outerClass: 'col-3',
  },
  {
    $formkit: 'primeInputText',
    name: 'search_condition6',
    label: '상세검색 조건',
    outerClass: 'col-3',
  },
  {
    $formkit: 'primeInputText',
    name: 'search_condition7',
    label: '상세검색 조건',
    outerClass: 'col-3',
  },
  {
    $formkit: 'primeInputText',
    name: 'search_condition8',
    label: '상세검색 조건',
    outerClass: 'col-3',
  },
  // --- 모든 버튼을 포함하는 그룹 ---
  {
    $el: 'div',
    attrs: {
      class: 'col-12 w-full flex justify-end items-center gap-x-2 mt-4',
    },
    children: [
      {
        $formkit: 'button',
        name: 'customDataCheckButton',
        label: '데이터 확인',
        inputClass: 'p-button p-component p-button-secondary',
        outerClass: '',
        wrapperClass: '',
        on: {
          click: () => dataCheck(),
        },
      },
      {
        $formkit: 'button',
        name: 'customResetButton',
        label: '초기화',
        type: 'reset',
        inputClass: 'p-button p-component p-button-outlined p-button-secondary',
        outerClass: '',
        wrapperClass: '',
      },
      {
        $formkit: 'button',
        name: 'customSaveButton',
        label: t('save'),
        type: 'submit',
        inputClass: 'p-button p-component',
        outerClass: '',
        wrapperClass: '',
      },
    ],
  },
])

function dataCheck() {
  console.warn(data.value)
}

async function submitHandler() {
  // Lets pretend this is an ajax request:
  await new Promise(resolve => setTimeout(resolve, 1000))
}

// Ag-Grid
ModuleRegistry.registerModules([AllCommunityModule])

// 예시 데이터 정의
const rowData = ref([
  { make: 'Toyota', model: 'Celica', price: 35000 },
  { make: 'Ford', model: 'Mondeo', price: 32000 },
  { make: 'Porsche', model: 'Boxster', price: 72000 },
])

// 예시 컬럼 정의
const columnDefs = ref([
  { field: 'make', filter: true },
  { field: 'model' },
  { field: 'price', sortable: true },
])

// 기본 컬럼 설정
const defaultColDef = ref({
  flex: 1,
  minWidth: 100,
})

// 새로운 rowSelection 설정 - 올바른 타입으로 수정
const rowSelection = ref({
  mode: 'multiRow' as const,
  checkboxes: true,
  headerCheckbox: true,
})

// 이벤트 핸들러
function onCellClicked(event: any) {
  console.warn('Cell clicked:', event.data)
}
</script>

<template>
  <div class="card flex flex-wrap gap-10">
    <div class="w-full">
      <div class="mb-4 flex items-center justify-between">
        <h2>Basic Demo</h2>
      </div>

      <div v-if="data" class="min-w-25rem">
        <FormKitDataEdit
          v-model="data"
          :schema="schema"
          :debug-schema="false"
          :debug-data="false"
          submit-label=""
          @data-saved="submitHandler"
        />
      </div>
    </div>

    <div class="w-full">
      <div class="mb-4 flex items-center justify-between">
        <h1>Nuxt 3 Ag-Grid Example</h1>
      </div>

      <ClientOnly>
        <div class="ag-theme-quartz" style="height: 500px; width: 100%;">
          <AgGridVue
            :row-data="rowData"
            :column-defs="columnDefs"
            :default-col-def="defaultColDef"
            :animate-rows="true"
            :row-selection="rowSelection"
            theme="legacy"
            style="width: 100%; height: 100%;"
            @cell-clicked="onCellClicked"
          />
        </div>
        <template #fallback>
          <p>Loading grid...</p>
        </template>
      </ClientOnly>
    </div>

    <!-- 데이터 조건 출력 부분을 맨 밑으로 이동 -->
    <div class="mt-8 w-full">
      <h3>현재 데이터 조건</h3>
      <div v-if="data" class="p-4 border border-gray-200 rounded-lg bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
        <pre class="text-sm text-gray-800 dark:text-gray-200">{{ JSON.stringify(data, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>

<style lang='scss' scoped>
:deep(.formkit-actions) {
  display: none !important;
}

:deep(.formkit-outer[data-type='submit']) {
  display: none !important;
}

:deep(button[type='submit']:not([name='customSaveButton'])) {
  display: none !important;
}
</style>
