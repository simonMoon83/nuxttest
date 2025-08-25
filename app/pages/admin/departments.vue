<script setup lang='ts'>
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'
import { AgGridVue } from 'ag-grid-vue3'
import { onMounted, ref, computed, watch } from 'vue'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'

definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

const { addElement } = useFormKitSchema()
const { t } = useI18n()
const colorMode = useColorMode()

const agGridThemeClass = computed(() => {
  return colorMode.value === 'dark' ? 'ag-theme-quartz-dark' : 'ag-theme-quartz'
})

const error = ref('')
const filters = ref<any>()

onMounted(() => {
  filters.value = { name: '', code: '', description: '', parentFilterId: null }
})

const parentOptions = ref<{ id: number; label: string }[]>([])

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

type Department = {
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
    cellRenderer: (params: any) => {
      const level = params.data?.orgLevel ?? 0
      const padding = level * 16
      const name = params.data?.name ?? ''
      return `<span style="display:inline-block;padding-left:${padding}px">${name}</span>`
    },
  },
  { field: 'code', headerName: '코드', filter: true, minWidth: 140 },
  { field: 'parent_name', headerName: '상위부서', minWidth: 140 },
  { field: 'description', headerName: '설명', minWidth: 200 },
  { field: 'sort_order', headerName: '순서', width: 100 },
  { field: 'is_active', headerName: '사용', width: 100 },
])

const defaultColDef = ref({ flex: 1, minWidth: 100 })
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

watch(() => colorMode.value, () => { updateGridTheme() })
onMounted(() => { updateGridTheme(); loadParentOptions(); loadDepartments() })

async function loadDepartments() {
  const q = filters.value
  const search = [q?.name, q?.code, q?.description].filter(Boolean).join(' ')
  const res = await $fetch<any>('/api/departments', { params: { search } })
  if (res?.success) {
    allDepartments.value = res.data
    const visible = filterByParent(allDepartments.value, q?.parentFilterId)
    rowData.value = addHierarchy(visible, allDepartments.value)
  }
}

function search() { loadDepartments() }

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
function onCellDoubleClicked(event: any) { openEdit(event.data) }

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

function collectDescendants(all: Department[], rootId: number): Set<number> {
  const byParent = new Map<number | null, Department[]>()
  all.forEach(d => {
    const key = d.parent_id ?? null
    const arr = byParent.get(key) || []
    arr.push(d)
    byParent.set(key, arr)
  })
  const result = new Set<number>([rootId])
  const stack: number[] = [rootId]
  while (stack.length) {
    const pid = stack.pop()!
    const children = byParent.get(pid) || []
    for (const child of children) {
      if (!result.has(child.id)) {
        result.add(child.id)
        stack.push(child.id)
      }
    }
  }
  return result
}

function filterByParent(all: Department[], parentId?: number | null) {
  if (!parentId) return all
  const ids = collectDescendants(all, parentId)
  return all.filter(d => ids.has(d.id))
}

async function loadParentOptions() {
  const res = await $fetch<any>('/api/departments', { params: { search: '' } })
  if (res?.success) {
    parentOptions.value = (res.data || []).map((d: any) => ({ id: d.id, label: `${d.code ? d.code + ' - ' : ''}${d.name}` }))
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
          <label class="block mb-1">부서명</label>
          <InputText v-model="(editTarget as any).name" class="w-full" />
        </div>
        <div class="col-span-12 md:col-span-6">
          <label class="block mb-1">코드</label>
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
        <Button label="취소" severity="secondary" @click="dialogVisible=false" />
        <Button label="저장" @click="saveDepartment" />
      </template>
    </Dialog>
  </div>
  
</template>

