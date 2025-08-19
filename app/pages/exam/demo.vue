<script setup lang='ts'>
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'
import { AgGridVue } from 'ag-grid-vue3'
import { onMounted, ref, computed, watch } from 'vue'
// Legacy 테마 사용 시 필요한 CSS 파일들 임포트
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'

const { addElement } = useFormKitSchema()
const { t } = useI18n()

// 컬러 모드 감지
const colorMode = useColorMode()

// AG-Grid 테마 클래스 계산
const agGridThemeClass = computed(() => {
  return colorMode.value === 'dark' ? 'ag-theme-quartz-dark' : 'ag-theme-quartz'
})

const error = ref('')
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
        $cmp: 'Button',
        props: {
          label: '데이터 확인',
          severity: 'secondary',
          class: '',
          onClick: () => dataCheck()
        }
      },
      {
        $cmp: 'Button',
        props: {
          label: '초기화',
          outlined: true,
          severity: 'secondary',
          type: 'reset',
          class: '',
          onClick: () => resetForm()
        }
      },
      {
        $cmp: 'Button',
        props: {
          label: t('save'),
          type: 'submit',
          name: 'customSaveButton',
          class: ''
        }
      },
    ],
  },
])

function dataCheck() {
  console.warn(data.value)
}

function resetForm() {
  if (data.value) {
    data.value = { search_condition1: '', search_condition2: '', search_condition3: '', search_condition4: '', search_condition5: '', search_condition6: '', search_condition7: '', search_condition8: '' }
    error.value = ''
  }
}

async function submitHandler() {
  // Lets pretend this is an ajax request:
  alert('submitHandler')
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

const gridOptions = ref({
  rowHeight: 28,
  headerHeight: 32,
})

// 새로운 rowSelection 설정 - 올바른 타입으로 수정
const rowSelection = ref({
  mode: 'multiRow' as const,
  checkboxes: true,
  headerCheckbox: true,
})

// 테마 업데이트 함수
const updateGridTheme = () => {
  // 클라이언트에서만 실행
  if (import.meta.client) {
    const gridDiv = document.querySelector('.ag-grid-demo')
    if (gridDiv) {
      // 기존 테마 클래스 제거
      gridDiv.classList.remove('ag-theme-quartz', 'ag-theme-quartz-dark')
      // 새 테마 클래스 추가
      gridDiv.classList.add(agGridThemeClass.value)
    }
  }
}

// 컬러 모드 변경 감지 - immediate 제거하여 서버에서 실행되지 않도록 함
watch(() => colorMode.value, () => {
  updateGridTheme()
})

// 클라이언트에서만 초기 테마 설정
onMounted(() => {
  updateGridTheme()
})

// 이벤트 핸들러
function onCellClicked(event: any) {
  console.warn('Cell clicked:', event.data)
}
</script>

<template>
  <div class="card flex flex-wrap gap-6">
    <div class="w-full">
      <div class="mb-2 flex items-center justify-between">
        <h2>Basic Demo</h2>
      </div>

      <div v-if="data" class="min-w-25rem compact-form">
        <FormKitDataEdit
          v-model="data"
          :schema="schema"
          :debug-schema="false"
          :debug-data="false"
          form-class="form-horizontal grid-4"
          submit-label=""
          @data-saved="submitHandler"
        />
      </div>
    </div>

    <div class="w-full">
      <div class="mb-2 flex items-center justify-between">
        <h1>Nuxt 3 Ag-Grid Example</h1>
      </div>

      <ClientOnly>
        <div :class="agGridThemeClass" class="ag-grid-demo" style="height: 420px; width: 100%;">
          <AgGridVue
            :row-data="rowData"
            :column-defs="columnDefs"
            :default-col-def="defaultColDef"
            :grid-options="gridOptions"
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
    <div class="mt-6 w-full">
      <h3>현재 데이터 조건</h3>
      <div v-if="data" class="p-3 border border-gray-200 rounded-lg bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
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
