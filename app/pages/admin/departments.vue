<script setup lang='ts'>
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'
import { CellSelectionModule, ClipboardModule, ExcelExportModule, TreeDataModule } from 'ag-grid-enterprise'
import { AgGridVue } from 'ag-grid-vue3'
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { useConfirmation } from '@/composables/confirmation'
import { buildDepartmentTypeMap, makeHierarchicalSelectOptions, orderDepartmentsForView } from '@/composables/departments'
import type { FormKitSchema } from '~/types/formkit-schema'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'

definePageMeta({
  layout: 'default',
  middleware: 'auth',
})

// 헬퍼 함수 사용
const {
  createSearchSchema,
  createEditSchema,
  createStandardSearchButtons,
  createStandardEditButtons,
} = useFormKitSchemaHelpers()

const colorMode = useColorMode()
const toast = useToast()
const { confirmAction } = useConfirmation()

const agGridThemeClass = computed(() => colorMode.value === 'dark' ? 'ag-theme-quartz-dark' : 'ag-theme-quartz')

ModuleRegistry.registerModules([AllCommunityModule, TreeDataModule, ExcelExportModule, CellSelectionModule, ClipboardModule])

// 인터페이스 정의
interface Department {
  id: number
  name: string
  code: string
  description?: string | null
  parent_id?: number | null
  sort_order: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

// 상태 관리
const error = ref('')
const filters = ref<{
  name: string
  code: string
  description: string
  parentFilterId: number | null
}>({ name: '', code: '', description: '', parentFilterId: null })

const parentOptions = ref<{ id: number, label: string }[]>([])

// 검색 스키마 - 타입 안전한 팩토리 함수 사용
const schema = computed<FormKitSchema>(() => createSearchSchema(
  [
    { name: 'name', label: '부서명', width: 'col-3' },
    { name: 'code', label: '부서코드', width: 'col-3' },
    { name: 'description', label: '설명', width: 'col-3' },
    {
      name: 'parentFilterId',
      label: '상위부서(선택)',
      type: 'primeSelect',
      width: 'col-3',
      options: parentOptions.value,
      optionLabel: 'label',
      optionValue: 'id',
      placeholder: '상위부서 선택',
      showClear: true,
      filter: true,
    },
  ],
  createStandardSearchButtons({
    onSearch: search,
    onReset: resetForm,
    onCreate: openCreate,
    onExport: exportExcel,
  }),
))

function resetForm() {
  filters.value = { name: '', code: '', description: '', parentFilterId: null }
  error.value = ''
  loadDepartments()
}

// AG Grid 설정
const rowData = ref<Department[]>([])
const allDepartments = ref<Department[]>([])

const columnDefs = ref([
  { field: 'code', headerName: '코드', filter: true, minWidth: 140 },
  { field: 'parent_name', headerName: '상위부서', minWidth: 140, filter: true },
  { field: 'description', headerName: '설명', minWidth: 200, filter: true },
  { field: 'sort_order', headerName: '순서', width: 100, filter: true },
  { field: 'is_active', headerName: '사용', width: 100, filter: true },
])

const defaultColDef = ref({ flex: 1, minWidth: 100, filter: true })
const gridOptions = ref({ rowHeight: 28, headerHeight: 32, enableRangeSelection: true, enableRangeHandle: true })
const cellSelection = ref<boolean | object>(true)

// Tree Data 설정
const autoGroupColumnDef = ref({
  headerName: '부서',
  minWidth: 200,
  cellRendererParams: { suppressCount: true },
})
const getDataPath = (data: any) => data.orgHierarchy || []

const rowSelection = ref({ mode: 'multiRow' as const, checkboxes: true, headerCheckbox: true })

// 테마 업데이트
const updateGridTheme = () => {
  if (import.meta.client) {
    const gridDiv = document.querySelector('.ag-grid-dept')
    if (gridDiv) {
      gridDiv.classList.remove('ag-theme-quartz', 'ag-theme-quartz-dark')
      gridDiv.classList.add(agGridThemeClass.value)
    }
  }
}

watch(() => colorMode.value, () => updateGridTheme())

onMounted(() => {
  updateGridTheme()
  loadParentOptions()
  loadDepartments()
})

// 데이터 로드
async function loadDepartments() {
  const q = filters.value
  const search = [q?.name, q?.code, q?.description].filter(Boolean).join(' ')
  const res = await $fetch<any>('/api/departments', { params: { search } })
  if (res?.success) {
    allDepartments.value = res.data
    const typedMap = buildDepartmentTypeMap(allDepartments.value as any)
    const ordered = q?.parentFilterId
      ? (orderDepartmentsForView(allDepartments.value as any, q.parentFilterId) as any)
      : (orderDepartmentsForView(allDepartments.value as any) as any)
    rowData.value = addHierarchy(ordered, allDepartments.value).map((d: any) => ({ ...d, dept_type: typedMap.get(d.id) }))
  }
}

function search() {
  loadDepartments()
}

// 등록/수정 다이얼로그
const dialogVisible = ref(false)
const editTarget = ref<Partial<Department> | null>(null)
const deleting = ref(false)

// 편집 스키마 - computed로 반응형 값 지원
const editSchema = computed<FormKitSchema>(() => createEditSchema(
  [
    { name: 'name', label: '부서명', width: 'col-6', required: true },
    { name: 'code', label: '코드', width: 'col-6', required: true },
    {
      name: 'parent_id',
      label: '상위부서',
      type: 'primeSelect',
      width: 'col-6',
      options: parentOptions.value,
      optionLabel: 'label',
      optionValue: 'id',
      placeholder: '상위부서 선택(없으면 루트)',
      showClear: true,
      filter: true,
    },
    { name: 'description', label: '설명', type: 'primeTextarea', width: 'col-12', rows: 3 },
    { name: 'sort_order', label: '순서', type: 'primeInputNumber', width: 'col-6', min: 0 },
    { name: 'is_active', label: '사용', type: 'primeCheckbox', width: 'col-6' },
  ],
  createStandardEditButtons(
    {
      onSave: saveDepartment,
      onCancel: () => { dialogVisible.value = false },
      onDelete: deleteInDialog,
    },
    { deleting, showDeleteWhen: '$id' },
  ),
  { includeHiddenId: true },
))

function openCreate() {
  editTarget.value = { name: '', code: '', description: '', is_active: true, sort_order: 0 }
  dialogVisible.value = true
}

function openEdit(row: Department) {
  editTarget.value = { ...row }
  dialogVisible.value = true
}

async function saveDepartment() {
  const name = editTarget.value?.name?.trim() || ''
  const code = editTarget.value?.code?.trim() || ''

  // 유효성 검사
  if (!name) {
    return toast.add({ severity: 'warn', summary: '유효성 오류', detail: '부서명은 필수입니다.', life: 2500 })
  }
  if (!code) {
    return toast.add({ severity: 'warn', summary: '유효성 오류', detail: '코드는 필수입니다.', life: 2500 })
  }

  // API 호출
  if (!editTarget.value?.id) {
    await $fetch('/api/departments/create', { method: 'POST', body: editTarget.value })
  }
  else {
    await $fetch(`/api/departments/${editTarget.value.id}`, { method: 'PUT', body: editTarget.value })
  }

  dialogVisible.value = false
  await loadDepartments()
}

function deleteInDialog() {
  const currentId = editTarget.value?.id
  if (!currentId)
    return

  confirmAction(
    async () => {
      try {
        deleting.value = true
        await $fetch(`/api/departments/${currentId}`, { method: 'DELETE' })
        dialogVisible.value = false
        await loadDepartments()
      }
      finally {
        deleting.value = false
      }
    },
    '삭제 완료',
    '부서를 삭제했습니다.',
    '삭제 확인',
    '해당 부서를 삭제하시겠습니까?',
    { compact: true, acceptLabel: '삭제', rejectLabel: '취소', icon: 'pi pi-exclamation-triangle' },
  )
}

const agGrid = ref()
const gridApi = shallowRef<any | null>(null)

function onCellDoubleClicked(event: any) {
  openEdit(event.data)
}

function exportExcel() {
  const api = gridApi.value
  if (api)
    api.exportDataAsExcel({ fileName: 'DepartmentList', sheetName: 'Departments' })
}

function onGridReady(params: any) {
  gridApi.value = params.api
}

// 계층 구조 유틸리티 함수
function buildParentMap(items: Department[]): Map<number, Department> {
  const map = new Map<number, Department>()
  items.forEach(d => map.set(d.id, d))
  return map
}

function computePath(item: Department, parentMap: Map<number, Department>): string[] {
  const path: string[] = []
  let cur: Department | undefined = item
  const guard = new Set<number>()
  while (cur) {
    if (guard.has(cur.id))
      break
    guard.add(cur.id)
    path.unshift(cur.name)
    cur = cur.parent_id ? parentMap.get(cur.parent_id) : undefined
  }
  return path
}

function addHierarchy(visible: Department[], all: Department[]) {
  const parentMap = buildParentMap(all)
  return visible.map((v) => {
    const path = computePath(v, parentMap)
    const level = Math.max(0, path.length - 1)
    const parentName = v.parent_id ? parentMap.get(v.parent_id)?.name ?? '' : ''
    return { ...v, orgHierarchy: path, orgLevel: level, pathText: path.join(' / '), parent_name: parentName }
  })
}

async function loadParentOptions() {
  const res = await $fetch<any>('/api/departments', { params: { search: '' } })
  if (res?.success) {
    parentOptions.value = makeHierarchicalSelectOptions(res.data || [], { includeCode: true })
  }
}
</script>

<template>
  <div class="card flex flex-wrap gap-6">
    <!-- 검색 영역 -->
    <div class="w-full pb-2 mb-2 border-b border-gray-200 dark:border-gray-700">
      <div class="compact-form">
        <FormKitDataEdit
          v-model="filters"
          :schema="schema"
          :debug-schema="false"
          :debug-data="false"
          form-class="form-horizontal grid-12"
          submit-label=""
          @data-saved="search"
        />
      </div>
    </div>

    <!-- 그리드 영역 -->
    <div class="w-full">
      <h5 class="mb-2">
        부서 목록
      </h5>

      <ClientOnly>
        <div :class="agGridThemeClass" class="ag-grid-dept" style="height: 550px; width: 100%;">
          <AgGridVue
            ref="agGrid"
            :row-data="rowData"
            :column-defs="columnDefs"
            :default-col-def="defaultColDef"
            :cell-selection="cellSelection"
            :tree-data="true"
            :get-data-path="getDataPath"
            :auto-group-column-def="autoGroupColumnDef"
            :group-default-expanded="1"
            :grid-options="gridOptions"
            :animate-rows="true"
            :row-selection="rowSelection"
            theme="legacy"
            style="width: 100%; height: 100%;"
            @grid-ready="onGridReady"
            @cell-double-clicked="onCellDoubleClicked"
          />
        </div>
        <template #fallback>
          <p>Loading grid...</p>
        </template>
      </ClientOnly>
    </div>

    <!-- 등록/수정 다이얼로그 -->
    <Dialog v-model:visible="dialogVisible" header="부서 등록/수정" :modal="true" :style="{ width: '640px' }">
      <div v-if="editTarget" class="w-full compact-form">
        <FormKitDataEdit
          v-model="editTarget"
          :schema="editSchema"
          :debug-schema="false"
          :debug-data="false"
          form-class="form-horizontal grid-12"
          submit-label=""
        />
      </div>
    </Dialog>
  </div>
</template>
