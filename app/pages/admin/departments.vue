<script setup lang='ts'>
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'
import { AgGridVue } from 'ag-grid-vue3'
import { computed, onMounted, ref, watch } from 'vue'
import { buildDepartmentTypeMap, makeHierarchicalSelectOptions, orderDepartmentsForView } from '@/composables/departments'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'

definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

const { addElement } = useFormKitSchema()
// i18n 미사용 제거
const colorMode = useColorMode()
const toast = useToast()

const agGridThemeClass = computed(() => {
  return colorMode.value === 'dark' ? 'ag-theme-quartz-dark' : 'ag-theme-quartz'
})

const error = ref('')
const filters = ref<any>()

onMounted(() => {
  filters.value = { name: '', code: '', description: '', parentFilterId: null }
})

const parentOptions = ref<{ id: number, label: string }[]>([])

const schema = ref<any>([
  addElement('h5', ['상세검색 조건'], { class: 'col-12 mb-1' }),
  { $formkit: 'primeInputText', name: 'name', label: '부서명', outerClass: 'col-3' },
  { $formkit: 'primeInputText', name: 'code', label: '부서코드', outerClass: 'col-3' },
  { $formkit: 'primeInputText', name: 'description', label: '설명', outerClass: 'col-3' },
  { $formkit: 'primeSelect', name: 'parentFilterId', label: '상위부서(선택)', outerClass: 'col-3', options: parentOptions, optionLabel: 'label', optionValue: 'id', placeholder: '상위부서 선택', showClear: true, filter: true },
  {
    $el: 'div',
    attrs: { class: 'col-12 w-full flex justify-end items-center gap-x-2 mt-1' },
    children: [
      { $cmp: 'Button', props: { label: '검색', severity: 'primary', onClick: () => search() } },
      { $cmp: 'Button', props: { label: '초기화', outlined: true, severity: 'secondary', type: 'reset', onClick: () => resetForm() } },
      { $cmp: 'Button', props: { label: '등록', severity: 'secondary', onClick: () => openCreate() } },
    ],
  },
])

function resetForm() {
  if (filters.value) {
    filters.value = { name: '', code: '', description: '', parentFilterId: null }
    error.value = ''
    loadDepartments()
  }
}

// Ag-Grid
ModuleRegistry.registerModules([AllCommunityModule])

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

const rowData = ref<Department[]>([])
const allDepartments = ref<Department[]>([])

const columnDefs = ref([
  {
    headerName: '부서',
    field: 'name',
    minWidth: 160,
    filter: true,
    cellRenderer: (params: any) => {
      const level = params.data?.orgLevel ?? 0
      const padding = level * 16
      const name = params.data?.name ?? ''
      const parent = params.data?.parent_name ?? ''
      const type = params.data?.dept_type as ('standalone' | 'parent' | 'child' | undefined)
      const badge = type === 'parent'
        ? '<span style="background:#eef2ff;color:#3730a3;border-radius:8px;padding:0 6px;margin-left:6px;font-size:11px;">상위</span>'
        : type === 'child'
          ? '<span style="background:#ecfeff;color:#155e75;border-radius:8px;padding:0 6px;margin-left:6px;font-size:11px;">하위</span>'
          : '<span style="background:#f0fdf4;color:#166534;border-radius:8px;padding:0 6px;margin-left:6px;font-size:11px;">단독</span>'
      const parentLine = parent ? `<div style="color:#6b7280;font-size:12px;">상위: ${parent}</div>` : ''
      return `<div style="padding-left:${padding}px"><div>${name}${badge}</div>${parentLine}</div>`
    },
  },
  { field: 'code', headerName: '코드', filter: true, minWidth: 140 },
  { field: 'parent_name', headerName: '상위부서', minWidth: 140, filter: true },
  { field: 'description', headerName: '설명', minWidth: 200, filter: true },
  { field: 'sort_order', headerName: '순서', width: 100, filter: true },
  { field: 'is_active', headerName: '사용', width: 100, filter: true },
])

const defaultColDef = ref({ flex: 1, minWidth: 100, filter: true })
const gridOptions = ref({ rowHeight: 28, headerHeight: 32 })

const rowSelection = ref({ mode: 'multiRow' as const, checkboxes: true, headerCheckbox: true })

const updateGridTheme = () => {
  if (import.meta.client) {
    const gridDiv = document.querySelector('.ag-grid-dept')
    if (gridDiv) {
      gridDiv.classList.remove('ag-theme-quartz', 'ag-theme-quartz-dark')
      gridDiv.classList.add(agGridThemeClass.value)
    }
  }
}

watch(
  () => colorMode.value,
  () => {
    updateGridTheme()
  }
)

onMounted(() => {
  updateGridTheme()
  loadParentOptions()
  loadDepartments()
})

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

function openCreate() {
  editTarget.value = { name: '', code: '', description: '', is_active: true, sort_order: 0 }
  dialogVisible.value = true
}
function openEdit(row: Department) {
  editTarget.value = { ...row }
  dialogVisible.value = true
}

async function saveDepartment() {
  // validation
  const name = (editTarget.value as any)?.name?.trim?.() || ''
  const code = (editTarget.value as any)?.code?.trim?.() || ''
  if (!name) {
    return toast.add({ severity: 'warn', summary: '유효성 오류', detail: '부서명은 필수입니다.', life: 2500 })
  }
  if (!code) {
    return toast.add({ severity: 'warn', summary: '유효성 오류', detail: '코드는 필수입니다.', life: 2500 })
  }
  if (!editTarget.value?.id) {
    await $fetch('/api/departments/create', { method: 'POST', body: editTarget.value })
  } else {
    await $fetch(`/api/departments/${editTarget.value.id}`, { method: 'PUT', body: editTarget.value })
  }
  dialogVisible.value = false
  await loadDepartments()
}

// 선택삭제 제거 (팝업의 개별 삭제로 대체)

async function deleteInDialog() {
  if (!editTarget.value?.id) return
  try {
    deleting.value = true
    await $fetch(`/api/departments/${editTarget.value.id}`, { method: 'DELETE' })
    dialogVisible.value = false
    await loadDepartments()
  } finally {
    deleting.value = false
  }
}

const agGrid = ref()
function onCellDoubleClicked(event: any) {
  openEdit(event.data)
}

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
    if (guard.has(cur.id)) break
    guard.add(cur.id)
    path.unshift(cur.name)
    cur = cur.parent_id ? parentMap.get(cur.parent_id) : undefined
  }
  return path
}

function addHierarchy(visible: Department[], all: Department[]) {
  const parentMap = buildParentMap(all)
  return visible.map(v => {
    const path = computePath(v, parentMap)
    const level = Math.max(0, path.length - 1)
    const parentName = v.parent_id ? parentMap.get(v.parent_id)?.name ?? '' : ''
    return { ...v, orgHierarchy: path, orgLevel: level, pathText: path.join(' / '), parent_name: parentName }
  })
}

// legacy util removed (replaced by orderDepartmentsForView)

// legacy util removed (replaced by orderDepartmentsForView)

async function loadParentOptions() {
  const res = await $fetch<any>('/api/departments', { params: { search: '' } })
  if (res?.success) {
    parentOptions.value = makeHierarchicalSelectOptions((res.data || []), { includeCode: true })
  }
}
</script>

<template>
  <div class="card flex flex-wrap gap-6">
    <div class="w-full">
      <div class="mb-2 flex items-center justify-between">
        <h2>부서관리</h2>
      </div>

      <div v-if="filters" class="compact-form">
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

    <div class="w-full">
      <div class="mb-2 flex items-center justify-between">
        <h3>부서 목록</h3>
      </div>

      <ClientOnly>
        <div :class="agGridThemeClass" class="ag-grid-dept" style="height: 420px; width: 100%;">
          <AgGridVue
            ref="agGrid"
            :row-data="rowData"
            :column-defs="columnDefs"
            :default-col-def="defaultColDef"
            :grid-options="gridOptions"
            :animate-rows="true"
            :row-selection="rowSelection"
            theme="legacy"
            style="width: 100%; height: 100%;"
            @cell-double-clicked="onCellDoubleClicked"
          />
        </div>
        <template #fallback>
          <p>Loading grid...</p>
        </template>
      </ClientOnly>
    </div>

    <Dialog v-model:visible="dialogVisible" header="부서 등록/수정" :modal="true" :style="{ width: '540px' }">
      <div v-if="editTarget" class="grid grid-cols-12 gap-3">
        <div class="col-span-12 md:col-span-6">
          <label class="block mb-1">부서명 <span class="text-red-500">*</span></label>
          <InputText v-model="(editTarget as any).name" class="w-full" />
        </div>
        <div class="col-span-12 md:col-span-6">
          <label class="block mb-1">코드 <span class="text-red-500">*</span></label>
          <InputText v-model="(editTarget as any).code" class="w-full" />
        </div>
        <div class="col-span-12 md:col-span-12">
          <label class="block mb-1">상위부서</label>
          <Dropdown class="w-full" v-model="(editTarget as any).parent_id" :options="parentOptions" optionValue="id" optionLabel="label" placeholder="상위부서 선택(없으면 루트)" showClear />
        </div>
        <div class="col-span-12">
          <label class="block mb-1">설명</label>
          <Textarea v-model="(editTarget as any).description" class="w-full" rows="3" />
        </div>
        <div class="col-span-6">
          <label class="block mb-1">순서</label>
          <InputNumber v-model="(editTarget as any).sort_order" input-class="w-full" :min="0" />
        </div>
        <div class="col-span-6">
          <label class="block mb-1">사용/미사용</label>
          <div class="flex items-center gap-3">
            <InputSwitch v-model="(editTarget as any).is_active" inputId="isActive" />
            <span class="text-sm">{{ (editTarget as any).is_active ? '사용' : '미사용' }}</span>
          </div>
        </div>
      </div>
      <template #footer>
        <Button v-if="(editTarget as any)?.id" label="삭제" severity="danger" :loading="deleting" @click="deleteInDialog" />
        <Button label="취소" severity="secondary" @click="dialogVisible = false" />
        <Button label="저장" @click="saveDepartment" />
      </template>
    </Dialog>
  </div>
</template>
