<script setup lang='ts'>
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'
import { CellSelectionModule, ClipboardModule, ExcelExportModule, TreeDataModule } from 'ag-grid-enterprise'
import { AgGridVue } from 'ag-grid-vue3'
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import type { FormKitSchema } from '~/types/formkit-schema'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'

definePageMeta({ layout: 'default', middleware: ['auth', 'role'], permission: { resource: 'menu:/admin/roles', action: 'read' } })

// 헬퍼 함수 사용
const {
  createSearchSchema,
  createEditSchema,
  createStandardSearchButtons,
  createStandardEditButtons,
} = useFormKitSchemaHelpers()

const { confirmAction } = useConfirmation()
const colorMode = useColorMode()
const toast = useToast()
const agGridThemeClass = computed(() => colorMode.value === 'dark' ? 'ag-theme-quartz-dark' : 'ag-theme-quartz')

ModuleRegistry.registerModules([AllCommunityModule, TreeDataModule, ExcelExportModule, CellSelectionModule, ClipboardModule])

// 인터페이스 정의
interface RoleRow {
  id: number
  role_name: string
  role_description?: string | null
  is_active: boolean
  created_at?: string
  updated_at?: string
  permissions?: Record<string, 'read' | 'write'>
}

// 상태 관리
const filters = ref<{ q: string }>({ q: '' })

// 검색 스키마 - 타입 안전한 팩토리 함수 사용
const schema = computed<FormKitSchema>(() => createSearchSchema(
  [
    { name: 'q', label: '역할명', width: 'col-6' },
  ],
  createStandardSearchButtons({
    onSearch: search,
    onReset: resetForm,
    onCreate: openCreate,
    onExport: exportExcel,
  }),
))

function resetForm() {
  filters.value = { q: '' }
  loadRoles()
}

// AG Grid 설정
const rowData = ref<RoleRow[]>([])
const columnDefs = ref([
  { field: 'role_name', headerName: '역할명', filter: true, minWidth: 140 },
  { field: 'role_description', headerName: '설명', filter: true },
  { field: 'is_active', headerName: '활성', width: 100 },
])
const defaultColDef = ref({ flex: 1, minWidth: 100, filter: true })
const gridOptions = ref({ rowHeight: 28, headerHeight: 32, enableRangeSelection: true, enableRangeHandle: true })
const cellSelection = ref<boolean | object>({ enableHeaderHighlight: true })
const rowSelection = ref({ mode: 'multiRow' as const, checkboxes: true, headerCheckbox: true })

const agGrid = ref()
const gridApi = shallowRef<any | null>(null)

// 테마 업데이트
const updateGridTheme = () => {
  if (import.meta.client) {
    const gridDiv = document.querySelector('.ag-grid-roles')
    gridDiv?.classList.remove('ag-theme-quartz', 'ag-theme-quartz-dark')
    gridDiv?.classList.add(agGridThemeClass.value)
  }
}

watch(() => colorMode.value, () => updateGridTheme())
onMounted(() => {
  updateGridTheme()
  loadRoles()
  loadMenus()
})

// 데이터 로드
async function loadRoles() {
  const q = filters.value?.q || ''
  const res = await $fetch<any>('/api/roles', { params: { search: q } })
  if (res?.success)
    rowData.value = res.data
}

function search() {
  loadRoles()
}

// 등록/수정 다이얼로그
const dialogVisible = ref(false)
const deleting = ref(false)
const editTarget = ref<Partial<RoleRow> | null>(null)

// 편집 스키마 - computed로 반응형 값 지원
const editSchema = computed<FormKitSchema>(() => createEditSchema(
  [
    { name: 'role_name', label: '역할명', width: 'col-6', required: true },
    { name: 'role_description', label: '설명', width: 'col-6' },
    { name: 'is_active', label: '활성', type: 'primeCheckbox', width: 'col-4' },
  ],
  createStandardEditButtons(
    {
      onSave: saveRole,
      onCancel: () => { dialogVisible.value = false },
      onDelete: deleteInDialog,
    },
    { deleting, showDeleteWhen: '$id' },
  ),
  { includeHiddenId: true },
))

function openCreate() {
  editTarget.value = { role_name: '', role_description: '', is_active: true, permissions: {} }
  selectedRole.value = null
  orgTreeSelection.value = {}
  dialogVisible.value = true
  rebuildMenuRowData()
}

function openEdit(row: RoleRow) {
  editTarget.value = { ...row, permissions: row.permissions || {} }
  selectedRole.value = row
  loadAssignedUsers(row.id)
  loadAssignedDepts(row.id)
  orgTreeSelection.value = {}
  dialogVisible.value = true
  rebuildMenuRowData()
}

async function saveRole() {
  const roleName = editTarget.value?.role_name?.trim() || ''
  if (!roleName) {
    return toast.add({ severity: 'warn', summary: '유효성 오류', detail: '역할명은 필수입니다.', life: 2500 })
  }

  const body = { ...editTarget.value, permissions: editTarget.value?.permissions || {} }

  if (!editTarget.value?.id) {
    const res = await $fetch<any>('/api/roles', { method: 'POST', body })
    if (res?.success && res?.data?.id) {
      editTarget.value = { ...(res.data || {}) }
      toast.add({ severity: 'success', summary: '저장 완료', detail: '역할이 생성되었습니다. 이제 사용자/부서를 추가할 수 있습니다.', life: 2200 })
      try { await loadRoles() }
      catch {}
      try { rebuildMenuRowData() }
      catch {}
    }
  }
  else {
    await $fetch(`/api/roles/${editTarget.value.id}`, { method: 'PUT', body })
    dialogVisible.value = false
    await loadRoles()
  }
}

function deleteInDialog() {
  const currentId = editTarget.value?.id
  if (!currentId)
    return
  deleting.value = true
  $fetch(`/api/roles/${currentId}`, { method: 'DELETE' })
    .then(async () => {
      dialogVisible.value = false
      await loadRoles()
    })
    .finally(() => {
      deleting.value = false
    })
}

function exportExcel() {
  const api = gridApi.value
  if (api)
    api.exportDataAsExcel({ fileName: 'Roles', sheetName: 'Roles' })
}

function onGridReady(params: any) {
  gridApi.value = params.api
}

function onCellDoubleClicked(event: any) {
  openEdit(event.data)
}

// 메뉴 권한 관리
interface MenuItem {
  id: number
  title: string
  href?: string | null
  parent_id?: number | null
  permission_key?: string | null
}

const menuRows = ref<MenuItem[]>([])
const menuRowData = ref<any[]>([])
const menuLoading = ref(false)
const menuGridApi = shallowRef<any | null>(null)
const menuColDefs = ref<any[]>([
  { field: 'title', headerName: '메뉴', minWidth: 160, hide: true },
  { field: 'href', headerName: '경로', minWidth: 160 },
  { field: 'read', headerName: 'READ', colId: 'read', width: 80, cellRenderer: menuCheckboxRenderer },
  { field: 'write', headerName: 'WRITE', colId: 'write', width: 90, cellRenderer: menuCheckboxRenderer },
])
const menuGridOptions = ref<any>({
  rowHeight: 28,
  headerHeight: 30,
  suppressCellFocus: false,
  suppressRowClickSelection: true,
  groupDefaultExpanded: -1,
  getRowId: (p: any) => p?.data?.permission_key || `id:${p?.data?.id}`,
})
const menuAutoGroupColumnDef = ref<any>({
  headerName: '메뉴',
  minWidth: 220,
  cellRendererParams: { suppressCount: true, suppressDoubleClickExpand: true, suppressEnterExpand: true },
})

async function loadMenus() {
  menuLoading.value = true
  try {
    const r = await $fetch<{ success: boolean, data: any[] }>('/api/menu/admin')
    const list = (r.data || []).map(m => ({
      id: m.id,
      title: m.title,
      href: m.href,
      parent_id: m.parent_id,
      permission_key: m.permission_key || (m.href ? `menu:${m.href}` : `menu:id:${m.id}`),
    }))
    menuRows.value = list
    rebuildMenuRowData()
  }
  finally {
    menuLoading.value = false
  }
}

function getPermLevel(pk: string) {
  const p = editTarget.value?.permissions || {}
  return (p as any)[pk] || 'none'
}

function setPermLevel(pk: string, v: 'none' | 'read' | 'write') {
  const p = { ...(editTarget.value?.permissions || {}) } as any
  if (v === 'none')
    delete p[pk]
  else p[pk] = v
  editTarget.value = { ...(editTarget.value || {}), permissions: p }
}

function rebuildMenuRowData() {
  const list = menuRows.value || []
  const map = new Map<number, MenuItem>()
  list.forEach(i => map.set(i.id, i))

  const computePath = (item: MenuItem): string[] => {
    const path: string[] = []
    let cur: MenuItem | undefined = item
    const guard = new Set<number>()
    while (cur) {
      if (guard.has(cur.id))
        break
      guard.add(cur.id)
      path.unshift(cur.title || '')
      const pid = cur.parent_id as any
      cur = pid != null ? (map.get(pid) as any) : undefined
    }
    return path
  }

  menuRowData.value = list.map((r) => {
    const level = getPermLevel(r.permission_key as string)
    return { ...r, orgHierarchy: computePath(r), level, read: level === 'read' || level === 'write', write: level === 'write' }
  })
}

function getMenuDataPath(data: any) {
  return data.orgHierarchy || []
}

function onMenuGridReady(params: any) {
  menuGridApi.value = params.api
  try { menuGridApi.value.expandAll?.() }
  catch {}
}

function onMenuCellValueChanged(event: any) {
  const pk = event?.data?.permission_key as string
  if (!pk)
    return
  const read = !!event?.data?.read
  const write = !!event?.data?.write
  let next: 'none' | 'read' | 'write' = 'none'
  if (write)
    next = 'write'
  else if (read)
    next = 'read'
  setPermLevel(pk, next)
}

function expandAllMenuGrid() {
  const api = menuGridApi.value
  if (api?.expandAll)
    api.expandAll()
}

function collapseAllMenuGrid() {
  const api = menuGridApi.value
  if (api?.collapseAll)
    api.collapseAll()
}

function menuCheckboxRenderer(params: any) {
  const colId = params?.column?.getColId?.()
  const wrapper = document.createElement('div')
  wrapper.style.display = 'flex'
  wrapper.style.width = '100%'
  wrapper.style.height = '100%'
  wrapper.style.alignItems = 'center'
  wrapper.style.justifyContent = 'center'
  const input = document.createElement('input')
  input.type = 'checkbox'
  input.checked = !!params.value
  input.addEventListener('click', ev => ev.stopPropagation())
  input.addEventListener('change', (ev: any) => {
    ev.stopPropagation()
    const checked = ev.target.checked
    if (colId === 'write') {
      params.node.setDataValue('write', checked)
    }
    else if (colId === 'read') {
      params.node.setDataValue('read', checked)
    }
    const pk = params?.data?.permission_key
    if (pk) {
      const read = !!params.node.data.read
      const write = !!params.node.data.write
      let next: 'none' | 'read' | 'write' = 'none'
      if (write)
        next = 'write'
      else if (read)
        next = 'read'
      setPermLevel(pk, next)
    }
  })
  wrapper.appendChild(input)
  return wrapper
}

// 할당된 사용자 관리
const assignedUsers = ref<any[]>([])
const assignedUsersGridApi = shallowRef<any | null>(null)
const assignedUsersColDefs = ref<any[]>([
  { field: 'department_name', headerName: '부서', width: 140, minWidth: 120 },
  { field: 'username', headerName: '아이디', width: 120, minWidth: 100 },
  { field: 'full_name', headerName: '이름', width: 120, minWidth: 100 },
  { headerName: '삭제', colId: 'remove', width: 90, valueGetter: () => '삭제', cellClass: 'action-cell danger' },
])
const compactGridOpts = ref<any>({ rowHeight: 26, headerHeight: 28, rowSelection: 'multiple', defaultColDef: { filter: true } })

async function loadAssignedUsers(roleId: number) {
  const res = await $fetch<any>(`/api/roles/${roleId}/users`)
  assignedUsers.value = res?.success ? (res.data || []) : []
}

function onAssignedUsersGridReady(p: any) {
  assignedUsersGridApi.value = p.api
}

function onAssignedUsersCellClicked(event: any) {
  if (event?.column?.getColId?.() === 'remove')
    removeUserFromRole(event?.data?.id)
}

async function removeUserFromRole(userId: number) {
  const roleId = editTarget.value?.id
  if (!roleId)
    return
  await $fetch(`/api/users/${userId}/roles`, { method: 'DELETE', params: { roleId } })
  await loadAssignedUsers(roleId)
}

async function removeAllUsersFromRole() {
  const roleId = editTarget.value?.id
  if (!roleId)
    return
  const count = assignedUsers.value.length
  if (count === 0)
    return
  confirmAction(
    async () => {
      for (const u of assignedUsers.value) {
        const uid = u?.id
        if (!uid)
          continue
        try { await $fetch(`/api/users/${uid}/roles`, { method: 'DELETE', params: { roleId } }) }
        catch {}
      }
      await loadAssignedUsers(roleId)
    },
    '삭제 완료',
    `사용자 ${count}명 할당을 해제했습니다.`,
    '전체 삭제 확인',
    '선택된 역할에서 모든 사용자를 삭제하시겠습니까?',
    { compact: true, acceptLabel: '삭제', rejectLabel: '취소', icon: 'pi pi-exclamation-triangle' },
  )
}

// 조직/사용자 트리 선택
const orgTreeNodes = ref<any[]>([])
const orgTreeSelection = ref<Record<string, any>>({})
const orgTreeLoading = ref(false)
const orgNodeMap = ref<Record<string, any>>({})

async function loadOrgTree() {
  orgTreeLoading.value = true
  try {
    const res: any = await $fetch('/api/org/tree')
    const nodes = (res?.data || []) as any[]
    orgTreeNodes.value = nodes
    const map: Record<string, any> = {}
    const dfs = (arr: any[]) => {
      for (const n of arr) {
        map[n.key] = n
        if (Array.isArray(n.children) && n.children.length)
          dfs(n.children)
      }
    }
    dfs(nodes)
    orgNodeMap.value = map
  }
  catch {
    orgTreeNodes.value = []
  }
  finally {
    orgTreeLoading.value = false
  }
}

const invitedUserIds = computed(() => {
  const ids: number[] = []
  for (const key of Object.keys(orgTreeSelection.value || {})) {
    const node = (orgTreeSelection.value as any)[key]
    if (!node)
      continue
    if (key.startsWith('u-') && node?.checked) {
      const id = Number(key.slice(2))
      if (Number.isFinite(id) && id > 0)
        ids.push(id)
    }
  }
  return Array.from(new Set(ids))
})

const selectedDeptIds = computed(() => {
  const ids: number[] = []
  for (const key of Object.keys(orgTreeSelection.value || {})) {
    const node = (orgTreeSelection.value as any)[key]
    if (!node)
      continue
    if (key.startsWith('d-') && node?.checked) {
      const id = Number(key.slice(2))
      if (Number.isFinite(id) && id > 0)
        ids.push(id)
    }
  }
  return Array.from(new Set(ids))
})

async function addUsersFromTreeSelection() {
  const roleId = editTarget.value?.id
  if (!roleId) {
    toast.add({ severity: 'warn', summary: '먼저 저장', detail: '역할을 저장한 후 사용자 추가가 가능합니다.', life: 2000 })
    return
  }
  for (const uid of invitedUserIds.value) {
    await $fetch(`/api/users/${uid}/roles`, { method: 'POST', body: { role_id: roleId } })
  }
  await loadAssignedUsers(roleId)
}

async function addSelectedDeptsToRole() {
  const roleId = editTarget.value?.id
  if (!roleId) {
    toast.add({ severity: 'warn', summary: '먼저 저장', detail: '역할을 저장한 후 부서 추가가 가능합니다.', life: 2000 })
    return
  }

  const expandDescendants = (deptId: number): number[] => {
    const key = `d-${deptId}`
    const node = orgNodeMap.value[key]
    const acc: number[] = [deptId]
    const dfs = (n: any) => {
      if (!n)
        return
      if (typeof n.key === 'string' && n.key.startsWith('d-')) {
        const m = n.key.match(/-(\d+)$/)
        const id = m ? Number(m[1]) : null
        if (id)
          acc.push(id)
      }
      for (const c of (n.children || []))
        dfs(c)
    }
    if (node)
      dfs(node)
    return acc
  }

  const targetDeptIds = new Set<number>()
  for (const did of selectedDeptIds.value) {
    for (const x of expandDescendants(did))
      targetDeptIds.add(x)
  }

  for (const id of Array.from(targetDeptIds)) {
    await $fetch(`/api/departments/${id}/roles`, { method: 'POST', body: { role_id: roleId } })
  }
  await loadAssignedDepts(roleId)
}

// 할당된 부서 관리
const assignedDepts = ref<any[]>([])
const assignedDeptsGridApi = shallowRef<any | null>(null)
const assignedDeptsColDefs = ref<any[]>([
  { field: 'name', headerName: '부서', width: 200, minWidth: 140 },
  { headerName: '삭제', colId: 'remove', width: 90, valueGetter: () => '삭제', cellClass: 'action-cell danger' },
])

async function loadAssignedDepts(roleId: number) {
  const res = await $fetch<any>(`/api/roles/${roleId}/departments`)
  assignedDepts.value = res?.success ? (res.data || []) : []
}

function onAssignedDeptsGridReady(p: any) {
  assignedDeptsGridApi.value = p.api
}

function onAssignedDeptsCellClicked(event: any) {
  if (event?.column?.getColId?.() === 'remove')
    removeDeptFromRole(event?.data?.id)
}

async function removeDeptFromRole(deptId: number) {
  const roleId = editTarget.value?.id
  if (!roleId)
    return
  await $fetch(`/api/departments/${deptId}/roles`, { method: 'DELETE', params: { roleId } })
  await loadAssignedDepts(roleId)
}

async function removeAllDeptsFromRole() {
  const roleId = editTarget.value?.id
  if (!roleId)
    return
  const count = assignedDepts.value.length
  if (count === 0)
    return
  confirmAction(
    async () => {
      for (const d of assignedDepts.value) {
        const did = d?.id
        if (!did)
          continue
        try { await $fetch(`/api/departments/${did}/roles`, { method: 'DELETE', params: { roleId } }) }
        catch {}
      }
      await loadAssignedDepts(roleId)
    },
    '삭제 완료',
    `부서 ${count}개 할당을 해제했습니다.`,
    '전체 삭제 확인',
    '선택된 역할에서 모든 부서를 삭제하시겠습니까?',
    { compact: true, acceptLabel: '삭제', rejectLabel: '취소', icon: 'pi pi-exclamation-triangle' },
  )
}

const selectedRole = ref<RoleRow | null>(null)
watch(selectedRole, async (v) => {
  if (v)
    openEdit(v)
})

watch(dialogVisible, async (v) => {
  if (v) {
    orgTreeSelection.value = {}
    await loadOrgTree()
    if (!editTarget.value?.id) {
      assignedUsers.value = []
      assignedDepts.value = []
    }
    rebuildMenuRowData()
  }
  else {
    orgTreeSelection.value = {}
  }
})
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
        역할 목록
      </h5>
      <ClientOnly>
        <div :class="agGridThemeClass" class="ag-grid-roles" style="height: 550px; width: 100%;">
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
            @selection-changed="() => { selectedRole = gridApi?.getSelectedRows?.()?.[0] || null }"
          />
        </div>
        <template #fallback>
          <p>Loading grid...</p>
        </template>
      </ClientOnly>
    </div>

    <!-- 등록/수정 다이얼로그 -->
    <Dialog v-model:visible="dialogVisible" header="권한(역할) 등록/수정" :modal="true" :style="{ width: '1200px' }">
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

      <!-- 메뉴 권한 매핑 -->
      <div class="mt-3">
        <div class="flex items-center gap-2 mb-2 compact-form">
          <h6 class="m-0">
            메뉴 권한 매핑
          </h6>
          <Button icon="pi pi-angle-double-down" text @click="expandAllMenuGrid" />
          <Button icon="pi pi-angle-double-up" text @click="collapseAllMenuGrid" />
        </div>
        <div :class="agGridThemeClass" style="height: 320px; width: 100%;">
          <AgGridVue
            :row-data="menuRowData"
            :column-defs="menuColDefs"
            :grid-options="menuGridOptions"
            :tree-data="true"
            :get-data-path="getMenuDataPath"
            :auto-group-column-def="menuAutoGroupColumnDef"
            :animate-rows="true"
            theme="legacy"
            style="width: 100%; height: 100%;"
            @grid-ready="onMenuGridReady"
            @cell-value-changed="onMenuCellValueChanged"
            @cell-clicked="(e:any) => {
              if (e?.column?.getColId?.() === 'read' || e?.column?.getColId?.() === 'write') {
                try { e.event?.stopPropagation?.() } catch {}
              }
            }"
          />
        </div>
      </div>

      <!-- 사용자/부서 할당 -->
      <div class="mt-4 grid grid-cols-12 gap-4">
        <div class="col-span-12 md:col-span-6">
          <h6 class="mb-2">
            사용자 할당
          </h6>
          <div class="mb-2">
            <label class="text-xs text-gray-500">조직/사용자 선택</label>
            <div class="mt-1 border rounded p-2 max-h-72 overflow-auto">
              <div v-if="orgTreeLoading" class="text-sm text-gray-500">
                로딩중...
              </div>
              <Tree
                v-else
                v-model:selectionKeys="orgTreeSelection"
                :value="orgTreeNodes"
                selection-mode="checkbox"
                :filter="true"
                filter-mode="lenient"
                :meta-key-selection="false"
                class="w-full"
              />
            </div>
            <div class="mt-2 flex items-center justify-between gap-2 compact-form">
              <div class="text-xs text-gray-600">
                <span>부서 선택: {{ selectedDeptIds.length }}개</span>
                <span class="mx-2">|</span>
                <span>사용자 선택: {{ invitedUserIds.length }}명</span>
              </div>
              <div class="flex gap-2">
                <Button label="부서 추가" :disabled="!editTarget?.id || !selectedDeptIds.length" @click="addSelectedDeptsToRole" />
                <Button label="사용자 추가" :disabled="!editTarget?.id || !invitedUserIds.length" @click="addUsersFromTreeSelection" />
              </div>
            </div>
          </div>
        </div>

        <div class="col-span-12 md:col-span-6">
          <div class="mt-3 mb-2 flex items-center justify-between compact-form">
            <h6 class="m-0">
              할당된 부서
            </h6>
            <div class="flex items-center gap-2">
              <Button label="전체 삭제" severity="danger" outlined :disabled="!assignedDepts.length" @click="removeAllDeptsFromRole" />
            </div>
          </div>
          <div :class="agGridThemeClass" style="height: 220px; width: 100%;">
            <AgGridVue
              :row-data="assignedDepts"
              :column-defs="assignedDeptsColDefs"
              :grid-options="compactGridOpts"
              theme="legacy"
              style="width: 100%; height: 100%;"
              @grid-ready="onAssignedDeptsGridReady"
              @cell-clicked="onAssignedDeptsCellClicked"
            />
          </div>
          <div class="mt-3 mb-2 flex items-center justify-between compact-form">
            <h6 class="m-0">
              할당된 사용자 ({{ assignedUsers.length }})
            </h6>
            <div class="flex items-center gap-2">
              <Button label="전체 삭제" severity="danger" outlined :disabled="!assignedUsers.length" @click="removeAllUsersFromRole" />
            </div>
          </div>
          <div :class="agGridThemeClass" style="height: 160px; width: 100%;">
            <AgGridVue
              :row-data="assignedUsers"
              :column-defs="assignedUsersColDefs"
              :grid-options="compactGridOpts"
              theme="legacy"
              style="width: 100%; height: 100%;"
              @grid-ready="onAssignedUsersGridReady"
              @cell-clicked="onAssignedUsersCellClicked"
            />
          </div>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<style lang='scss' scoped>
.action-cell {
  text-align: center;
  cursor: pointer;
  color: var(--p-primary-color);
}
.action-cell.danger {
  color: var(--p-red-500);
}
</style>
