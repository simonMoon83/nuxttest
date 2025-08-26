<script setup lang='ts'>
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'
import { AgGridVue } from 'ag-grid-vue3'
import { computed, onMounted, ref, watch } from 'vue'
import { makeHierarchicalSelectOptions } from '@/composables/departments'
import { useConfirmation } from '@/composables/confirmation'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'

definePageMeta({ layout: 'default', middleware: 'auth' })

const { addElement } = useFormKitSchema()
const colorMode = useColorMode()
const toast = useToast()
const agGridThemeClass = computed(() => colorMode.value === 'dark' ? 'ag-theme-quartz-dark' : 'ag-theme-quartz')

ModuleRegistry.registerModules([AllCommunityModule])

interface AppUser {
  id: number
  username: string
  email: string
  full_name?: string | null
  is_active: boolean
  created_at?: string
  updated_at?: string
  department_id?: number | null
  department_name?: string | null
}

const filters = ref<any>()
onMounted(() => {
  filters.value = { q: '', dept: '', departmentId: null }
})

const departmentOptions = ref<{ id: number, name: string }[]>([])

const schema = ref<any>([
  addElement('h5', ['상세검색 조건']),
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

function resetForm() {
  filters.value = { q: '', dept: '', departmentId: null }
  loadUsers()
}

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
watch(
  () => colorMode.value,
  () => {
    updateGridTheme()
  }
)
onMounted(() => {
  updateGridTheme()
  loadDepartmentsOptions()
  loadUsers()
})

async function loadUsers() {
  const q = filters.value?.q || ''
  const dept = filters.value?.dept || ''
  const departmentId = filters.value?.departmentId || null
  const res = await $fetch<any>('/api/users', { params: { search: q, dept, departmentId } })
  if (res?.success) {
    rowData.value = res.data
  }
}
function search() {
  loadUsers()
}

// 등록/수정
const dialogVisible = ref(false)
const deleting = ref(false)
const editTarget = ref<Partial<AppUser> | null>(null)
const { confirmAction } = useConfirmation()

// FormKit PrimeVue 다이얼로그 스키마
const editSchema = ref<any>([
  { $formkit: 'primeInputText', name: 'username', label: '아이디', outerClass: 'col-6 md:col-6', validation: 'required' },
  { $formkit: 'primeInputText', name: 'full_name', label: '이름', outerClass: 'col-6 md:col-6' },
  { $formkit: 'primeInputText', name: 'email', label: '이메일', outerClass: 'col-12 md:col-6', validation: 'required|email' },
  { $formkit: 'primeSelect', name: 'department_id', label: '부서', outerClass: 'col-12 md:col-6', options: departmentOptions, optionLabel: 'name', optionValue: 'id', placeholder: '부서 선택', showClear: true },
  { $formkit: 'primePassword', name: 'password', label: '비밀번호', outerClass: 'col-6 md:col-6', toggleMask: true, feedback: false, inputProps: { placeholder: '6자 이상' } },
  { $formkit: 'primePassword', name: 'password_confirm', label: '비밀번호 확인', outerClass: 'col-6 md:col-6', toggleMask: true, feedback: false, inputProps: { placeholder: '비밀번호 확인' } },
  { $formkit: 'primeCheckbox', name: 'is_active', label: '사용', outerClass: 'col-12 md:col-6' },
])
function openCreate() {
  editTarget.value = { username: '', email: '', full_name: '', is_active: true, department_id: null, password: '', password_confirm: '' } as any
  dialogVisible.value = true
}
function openEdit(row: AppUser) {
  editTarget.value = { ...row, password: '', password_confirm: '' } as any
  dialogVisible.value = true
}
async function saveUser() {
  const username = (editTarget.value as any)?.username?.trim?.() || ''
  const email = (editTarget.value as any)?.email?.trim?.() || ''
  const password = (editTarget.value as any)?.password || ''
  const passwordConfirm = (editTarget.value as any)?.password_confirm || ''
  if (!username) {
    return toast.add({ severity: 'warn', summary: '유효성 오류', detail: '아이디는 필수입니다.', life: 2500 })
  }
  if (!email) {
    return toast.add({ severity: 'warn', summary: '유효성 오류', detail: '이메일은 필수입니다.', life: 2500 })
  }
  if (!editTarget.value?.id) {
    if (!password) return toast.add({ severity: 'warn', summary: '유효성 오류', detail: '비밀번호는 필수입니다.', life: 2500 })
    if (password.length < 6) return toast.add({ severity: 'warn', summary: '유효성 오류', detail: '비밀번호는 6자 이상이어야 합니다.', life: 2500 })
    if (password !== passwordConfirm) return toast.add({ severity: 'warn', summary: '유효성 오류', detail: '비밀번호가 일치하지 않습니다.', life: 2500 })
  } else {
    if (password || passwordConfirm) {
      if (password.length < 6) return toast.add({ severity: 'warn', summary: '유효성 오류', detail: '비밀번호는 6자 이상이어야 합니다.', life: 2500 })
      if (password !== passwordConfirm) return toast.add({ severity: 'warn', summary: '유효성 오류', detail: '비밀번호가 일치하지 않습니다.', life: 2500 })
    }
  }
  if (!editTarget.value?.id) await $fetch('/api/users/create', { method: 'POST', body: editTarget.value })
  else await $fetch(`/api/users/${editTarget.value.id}`, { method: 'PUT', body: editTarget.value })
  dialogVisible.value = false
  await loadUsers()
}
function deleteInDialog() {
  const currentId = editTarget.value?.id
  if (!currentId) return
  confirmAction(async () => {
    try {
      deleting.value = true
      await $fetch(`/api/users/${currentId}`, { method: 'DELETE' })
      dialogVisible.value = false
      await loadUsers()
    } finally {
      deleting.value = false
    }
  }, '삭제 완료', '사용자를 삭제했습니다.', '삭제 확인', '해당 사용자를 삭제하시겠습니까?', { compact: true, acceptLabel: '삭제', rejectLabel: '취소', icon: 'pi pi-exclamation-triangle' })
}

function onCellDoubleClicked(event: any) {
  openEdit(event.data)
}

async function loadDepartmentsOptions() {
  const res = await $fetch<any>('/api/departments', { params: { search: '' } })
  if (res?.success) {
    departmentOptions.value = makeHierarchicalSelectOptions((res.data || []), { labelKey: 'name', includeCode: true })
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

    <Dialog v-model:visible="dialogVisible" header="사용자 등록/수정" :modal="true" :style="{ width: '640px' }">
      <div class="w-full compact-form">
        <FormKitDataEdit
          v-model="editTarget"
          :schema="editSchema"
          :debug-schema="false"
          :debug-data="false"
          form-class="form-horizontal grid-12"
          submit-label=""
        />
      </div>
      <template #footer>
        <div class="compact-form flex items-center gap-2">
          <Button v-if="(editTarget as any)?.id" label="삭제" severity="danger" :loading="deleting" @click="deleteInDialog" />
          <Button label="취소" severity="secondary" @click="dialogVisible = false" />
          <Button label="저장" @click="saveUser" />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<style lang='scss' scoped>
</style>
