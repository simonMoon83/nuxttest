<script setup lang='ts'>
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'
import { AgGridVue } from 'ag-grid-vue3'
import { onMounted, ref, computed, watch } from 'vue'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'

definePageMeta({ layout: 'default', middleware: 'auth' })

const { addElement } = useFormKitSchema()
const colorMode = useColorMode()
const agGridThemeClass = computed(() => colorMode.value === 'dark' ? 'ag-theme-quartz-dark' : 'ag-theme-quartz')

ModuleRegistry.registerModules([AllCommunityModule])

type AppUser = { id: number; username: string; email: string; full_name?: string | null; is_active: boolean; created_at?: string; updated_at?: string; department_id?: number | null; department_name?: string | null }

const filters = ref<any>()
onMounted(() => { filters.value = { q: '', dept: '', departmentId: null } })

const departmentOptions = ref<{ id: number; name: string }[]>([])

const schema = ref<any>([
  addElement('h5', ['상세검색 조건'], { class: 'col-12 mb-1' }),
  { $formkit: 'primeInputText', name: 'q', label: '이름/아이디/이메일', outerClass: 'col-4' },
  { $formkit: 'primeInputText', name: 'dept', label: '부서명(직접입력)', outerClass: 'col-4' },
  { $formkit: 'primeSelect', name: 'departmentId', label: '부서(선택)', outerClass: 'col-4', options: departmentOptions, optionLabel: 'name', optionValue: 'id', placeholder: '부서 선택', showClear: true, filter: true },
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

function resetForm() { filters.value = { q: '', dept: '', departmentId: null }; loadUsers() }

const rowData = ref<AppUser[]>([])
const columnDefs = ref([
  { field: 'username', headerName: '아이디', filter: true, minWidth: 140 },
  { field: 'full_name', headerName: '이름', filter: true },
  { field: 'email', headerName: '이메일', filter: true, minWidth: 200 },
  { field: 'department_name', headerName: '부서', filter: true, minWidth: 140 },
  { field: 'is_active', headerName: '사용', width: 100 },
])
const defaultColDef = ref({ flex: 1, minWidth: 100 })
const gridOptions = ref({ rowHeight: 28, headerHeight: 32 })
const rowSelection = ref({ mode: 'multiRow' as const, checkboxes: true, headerCheckbox: true })

const agGrid = ref()
const updateGridTheme = () => {
  if (import.meta.client) {
    const gridDiv = document.querySelector('.ag-grid-users')
    gridDiv?.classList.remove('ag-theme-quartz', 'ag-theme-quartz-dark')
    gridDiv?.classList.add(agGridThemeClass.value)
  }
}
watch(() => colorMode.value, () => { updateGridTheme() })
onMounted(() => { updateGridTheme(); loadDepartmentsOptions(); loadUsers() })

async function loadUsers() {
  const q = filters.value?.q || ''
  const dept = filters.value?.dept || ''
  const departmentId = filters.value?.departmentId || null
  const res = await $fetch<any>('/api/users', { params: { search: q, dept, departmentId } })
  if (res?.success) rowData.value = res.data
}
function search() { loadUsers() }

// 등록/수정
const dialogVisible = ref(false)
const deleting = ref(false)
const editTarget = ref<Partial<AppUser> | null>(null)
function openCreate() { editTarget.value = { username: '', email: '', full_name: '', is_active: true, department_id: null }; dialogVisible.value = true }
function openEdit(row: AppUser) { editTarget.value = { ...row }; dialogVisible.value = true }
async function saveUser() {
  if (!editTarget.value?.id) await $fetch('/api/users/create', { method: 'POST', body: editTarget.value })
  else await $fetch(`/api/users/${editTarget.value.id}`, { method: 'PUT', body: editTarget.value })
  dialogVisible.value = false
  await loadUsers()
}
async function deleteInDialog() {
  if (!editTarget.value?.id) return
  try { deleting.value = true; await $fetch(`/api/users/${editTarget.value.id}`, { method: 'DELETE' }); dialogVisible.value = false; await loadUsers() } finally { deleting.value = false }
}

function onCellDoubleClicked(event: any) { openEdit(event.data) }

async function loadDepartmentsOptions() {
  const res = await $fetch<any>('/api/departments', { params: { search: '' } })
  if (res?.success) {
    departmentOptions.value = (res.data || []).map((d: any) => ({ id: d.id, name: d.name }))
  }
}
</script>

<template>
  <div class="card flex flex-wrap gap-6">
    <div class="w-full">
      <div class="mb-2 flex items-center justify-between">
        <h2>사용자 관리</h2>
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
        <h3>사용자 목록</h3>
      </div>

      <ClientOnly>
        <div :class="agGridThemeClass" class="ag-grid-users" style="height: 420px; width: 100%;">
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

    <Dialog v-model:visible="dialogVisible" header="사용자 등록/수정" :modal="true" :style="{ width: '540px' }">
      <div class="grid grid-cols-12 gap-3">
        <div class="col-span-12 md:col-span-6">
          <label class="block mb-1">아이디</label>
          <InputText v-model="(editTarget as any).username" class="w-full" />
        </div>
        <div class="col-span-12 md:col-span-6">
          <label class="block mb-1">이름</label>
          <InputText v-model="(editTarget as any).full_name" class="w-full" />
        </div>
        <div class="col-span-12">
          <label class="block mb-1">이메일</label>
          <InputText v-model="(editTarget as any).email" class="w-full" />
        </div>
        <div class="col-span-12 md:col-span-6">
          <label class="block mb-1">부서</label>
          <Dropdown class="w-full" v-model="(editTarget as any).department_id" :options="departmentOptions" optionValue="id" optionLabel="name" placeholder="부서 선택" showClear />
        </div>
        <div class="col-span-12 md:col-span-6">
          <label class="block mb-1">사용/미사용</label>
          <div class="flex items-center gap-3">
            <InputSwitch v-model="(editTarget as any).is_active" inputId="isActiveUser" />
            <span class="text-sm">{{ (editTarget as any).is_active ? '사용' : '미사용' }}</span>
          </div>
        </div>
      </div>
      <template #footer>
        <Button v-if="(editTarget as any)?.id" label="삭제" severity="danger" :loading="deleting" @click="deleteInDialog" />
        <Button label="취소" severity="secondary" @click="dialogVisible=false" />
        <Button label="저장" @click="saveUser" />
      </template>
    </Dialog>
  </div>
</template>


