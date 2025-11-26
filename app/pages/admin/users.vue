<script setup lang='ts'>
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'
import { CellSelectionModule, ClipboardModule, ExcelExportModule } from 'ag-grid-enterprise'
import { AgGridVue } from 'ag-grid-vue3'
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { useConfirmation } from '@/composables/confirmation'
import { makeHierarchicalSelectOptions } from '@/composables/departments'
import type { FormKitSchema } from '~/types/formkit-schema'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'

definePageMeta({ layout: 'default', middleware: 'auth' })

// 헬퍼 함수 사용
const {
  createSearchSchema,
  createEditSchema,
  createStandardSearchButtons,
  createStandardEditButtons,
} = useFormKitSchemaHelpers()

const colorMode = useColorMode()
const toast = useToast()
const agGridThemeClass = computed(() => colorMode.value === 'dark' ? 'ag-theme-quartz-dark' : 'ag-theme-quartz')

ModuleRegistry.registerModules([AllCommunityModule, ExcelExportModule, CellSelectionModule, ClipboardModule])

// 인터페이스 정의
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

// 상태 관리
const filters = ref<{
  q: string
  dept: string
  departmentId: number | null
}>({ q: '', dept: '', departmentId: null })

const departmentOptions = ref<{ id: number, name: string }[]>([])

// 검색 스키마 - 타입 안전한 팩토리 함수 사용
const schema = computed<FormKitSchema>(() => createSearchSchema(
  [
    { name: 'q', label: '이름/아이디/이메일', width: 'col-4' },
    { name: 'dept', label: '부서명(직접입력)', width: 'col-4' },
    {
      name: 'departmentId',
      label: '부서(선택)',
      type: 'primeSelect',
      width: 'col-4',
      options: departmentOptions.value,
      optionLabel: 'name',
      optionValue: 'id',
      placeholder: '부서 선택',
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
  filters.value = { q: '', dept: '', departmentId: null }
  loadUsers()
}

// AG Grid 설정
const rowData = ref<AppUser[]>([])
const columnDefs = ref([
  { field: 'username', headerName: '아이디', filter: true, minWidth: 140 },
  { field: 'full_name', headerName: '이름', filter: true },
  { field: 'email', headerName: '이메일', filter: true, minWidth: 200 },
  { field: 'department_name', headerName: '부서', filter: true, minWidth: 140 },
  { field: 'is_active', headerName: '사용', width: 100 },
])
const defaultColDef = ref({ flex: 1, minWidth: 100 })
const gridOptions = ref({
  rowHeight: 28,
  headerHeight: 32,
  enableRangeSelection: true,
  enableRangeHandle: true,
})
const cellSelection = ref<boolean | object>({ enableHeaderHighlight: true })
const rowSelection = ref({ mode: 'multiRow' as const, checkboxes: true, headerCheckbox: true })

const agGrid = ref()
const gridApi = shallowRef<any | null>(null)

// 테마 업데이트
const updateGridTheme = () => {
  if (import.meta.client) {
    const gridDiv = document.querySelector('.ag-grid-users')
    gridDiv?.classList.remove('ag-theme-quartz', 'ag-theme-quartz-dark')
    gridDiv?.classList.add(agGridThemeClass.value)
  }
}

watch(() => colorMode.value, () => updateGridTheme())

onMounted(() => {
  updateGridTheme()
  loadDepartmentsOptions()
  loadUsers()
})

// 데이터 로드
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

// 등록/수정 다이얼로그
const dialogVisible = ref(false)
const deleting = ref(false)
const editTarget = ref<Partial<AppUser & { password?: string, password_confirm?: string }> | null>(null)
const { confirmAction } = useConfirmation()

// 편집 스키마 - computed로 반응형 값 지원
const editSchema = computed<FormKitSchema>(() => createEditSchema(
  [
    { name: 'username', label: '아이디', width: 'col-6', required: true },
    { name: 'full_name', label: '이름', width: 'col-6' },
    { name: 'email', label: '이메일', width: 'col-6', validation: ['required', 'email'] },
    {
      name: 'department_id',
      label: '부서',
      type: 'primeSelect',
      width: 'col-6',
      options: departmentOptions.value,
      optionLabel: 'name',
      optionValue: 'id',
      placeholder: '부서 선택',
      showClear: true,
    },
    {
      name: 'password',
      label: '비밀번호',
      type: 'primePassword',
      width: 'col-6',
      toggleMask: true,
      feedback: false,
      placeholder: '6자 이상',
    },
    {
      name: 'password_confirm',
      label: '비밀번호 확인',
      type: 'primePassword',
      width: 'col-6',
      toggleMask: true,
      feedback: false,
      placeholder: '비밀번호 확인',
    },
    { name: 'is_active', label: '사용', type: 'primeCheckbox', width: 'col-6' },
  ],
  createStandardEditButtons(
    {
      onSave: saveUser,
      onCancel: () => { dialogVisible.value = false },
      onDelete: deleteInDialog,
    },
    { deleting, showDeleteWhen: '$id' },
  ),
  { includeHiddenId: true },
))

function openCreate() {
  editTarget.value = {
    username: '',
    email: '',
    full_name: '',
    is_active: true,
    department_id: null,
    password: '',
    password_confirm: '',
  }
  dialogVisible.value = true
}

function openEdit(row: AppUser) {
  editTarget.value = { ...row, password: '', password_confirm: '' }
  dialogVisible.value = true
}

async function saveUser() {
  const username = editTarget.value?.username?.trim() || ''
  const email = editTarget.value?.email?.trim() || ''
  const password = editTarget.value?.password || ''
  const passwordConfirm = editTarget.value?.password_confirm || ''

  // 유효성 검사
  if (!username) {
    return toast.add({ severity: 'warn', summary: '유효성 오류', detail: '아이디는 필수입니다.', life: 2500 })
  }
  if (!email) {
    return toast.add({ severity: 'warn', summary: '유효성 오류', detail: '이메일은 필수입니다.', life: 2500 })
  }

  // 신규 생성 시 비밀번호 필수
  if (!editTarget.value?.id) {
    if (!password) {
      return toast.add({ severity: 'warn', summary: '유효성 오류', detail: '비밀번호는 필수입니다.', life: 2500 })
    }
    if (password.length < 6) {
      return toast.add({ severity: 'warn', summary: '유효성 오류', detail: '비밀번호는 6자 이상이어야 합니다.', life: 2500 })
    }
    if (password !== passwordConfirm) {
      return toast.add({ severity: 'warn', summary: '유효성 오류', detail: '비밀번호가 일치하지 않습니다.', life: 2500 })
    }
  }
  else {
    // 수정 시 비밀번호 입력된 경우만 검증
    if (password || passwordConfirm) {
      if (password.length < 6) {
        return toast.add({ severity: 'warn', summary: '유효성 오류', detail: '비밀번호는 6자 이상이어야 합니다.', life: 2500 })
      }
      if (password !== passwordConfirm) {
        return toast.add({ severity: 'warn', summary: '유효성 오류', detail: '비밀번호가 일치하지 않습니다.', life: 2500 })
      }
    }
  }

  // API 호출
  if (!editTarget.value?.id) {
    await $fetch('/api/users/create', { method: 'POST', body: editTarget.value })
  }
  else {
    await $fetch(`/api/users/${editTarget.value.id}`, { method: 'PUT', body: editTarget.value })
  }

  dialogVisible.value = false
  await loadUsers()
}

function deleteInDialog() {
  const currentId = editTarget.value?.id
  if (!currentId)
    return

  confirmAction(
    async () => {
      try {
        deleting.value = true
        await $fetch(`/api/users/${currentId}`, { method: 'DELETE' })
        dialogVisible.value = false
        await loadUsers()
      }
      finally {
        deleting.value = false
      }
    },
    '삭제 완료',
    '사용자를 삭제했습니다.',
    '삭제 확인',
    '해당 사용자를 삭제하시겠습니까?',
    { compact: true, acceptLabel: '삭제', rejectLabel: '취소', icon: 'pi pi-exclamation-triangle' },
  )
}

function onCellDoubleClicked(event: any) {
  openEdit(event.data)
}

function exportExcel() {
  const api = gridApi.value
  if (api)
    api.exportDataAsExcel({ fileName: 'UserList', sheetName: 'Users' })
}

function onGridReady(params: any) {
  gridApi.value = params.api
}

async function loadDepartmentsOptions() {
  const res = await $fetch<any>('/api/departments', { params: { search: '' } })
  if (res?.success) {
    departmentOptions.value = makeHierarchicalSelectOptions(res.data || [], { labelKey: 'name', includeCode: true })
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
        사용자 목록
      </h5>

      <ClientOnly>
        <div :class="agGridThemeClass" class="ag-grid-users" style="height: 550px; width: 100%;">
          <AgGridVue
            ref="agGrid"
            :row-data="rowData"
            :column-defs="columnDefs"
            :default-col-def="defaultColDef"
            :cell-selection="cellSelection"
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
    </Dialog>
  </div>
</template>

<style lang='scss' scoped>
</style>
