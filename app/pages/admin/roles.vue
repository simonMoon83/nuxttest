<script setup lang='ts'>
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'
import { TreeDataModule, ExcelExportModule, CellSelectionModule, ClipboardModule } from 'ag-grid-enterprise'
import { makeHierarchicalSelectOptions } from '@/composables/departments'
import { AgGridVue } from 'ag-grid-vue3'
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'

definePageMeta({ layout: 'default', middleware: ['auth', 'role'], permission: { resource: 'menu:/admin/roles', action: 'read' } })

const { addElement } = useFormKitSchema()
const { confirmAction } = useConfirmation()
const colorMode = useColorMode()
const toast = useToast()
const agGridThemeClass = computed(() => colorMode.value === 'dark' ? 'ag-theme-quartz-dark' : 'ag-theme-quartz')

ModuleRegistry.registerModules([AllCommunityModule, TreeDataModule, ExcelExportModule, CellSelectionModule, ClipboardModule])

interface RoleRow {
  id: number
  role_name: string
  role_description?: string | null
  is_active: boolean
  created_at?: string
  updated_at?: string
  permissions?: Record<string, 'read' | 'write'>
}

const filters = ref<any>()
onMounted(() => {
  filters.value = { q: '' }
})

const schema = ref<any>([
  { $formkit: 'primeInputText', name: 'q', label: '역할명', outerClass: 'col-6' },
  {
    $el: 'div',
    attrs: { class: 'col-12 w-full flex justify-end items-center gap-x-2 mt-1' },
    children: [
      { $cmp: 'Button', props: { label: '검색', severity: 'primary', onClick: () => search() } },
      { $cmp: 'Button', props: { label: '초기화', outlined: true, severity: 'secondary', type: 'reset', onClick: () => resetForm() } },
      { $cmp: 'Button', props: { label: '등록', severity: 'secondary', onClick: () => openCreate() } },
      { $cmp: 'Button', props: { label: '엑셀', outlined: true, severity: 'secondary', onClick: () => exportExcel() } },
    ],
  },
])

function resetForm() {
  filters.value = { q: '' }
  loadRoles()
}

const rowData = ref<RoleRow[]>([])
const columnDefs = ref([
  { field: 'role_name', headerName: '역할명', filter: true, minWidth: 140 },
  { field: 'role_description', headerName: '설명', filter: true },
  { field: 'is_active', headerName: '활성', width: 100 },
])
const defaultColDef = ref({ flex: 1, minWidth: 100, filter: true })
const gridOptions = ref({ rowHeight: 28, headerHeight: 32, enableRangeSelection: true, enableRangeHandle: true })
const cellSelection = ref<boolean | any>({ enableHeaderHighlight: true })
const rowSelection = ref({ mode: 'multiRow' as const, checkboxes: true, headerCheckbox: true })

const agGrid = ref()
const gridApi = shallowRef<any | null>(null)
const updateGridTheme = () => {
  if (import.meta.client) {
    const gridDiv = document.querySelector('.ag-grid-roles')
    gridDiv?.classList.remove('ag-theme-quartz', 'ag-theme-quartz-dark')
    gridDiv?.classList.add(agGridThemeClass.value)
  }
}
watch(() => colorMode.value, () => { updateGridTheme() })
onMounted(() => { updateGridTheme(); loadRoles(); loadMenus(); loadDepartments() })

async function loadRoles() {
  const q = filters.value?.q || ''
  const res = await $fetch<any>('/api/roles', { params: { search: q } })
  if (res?.success) rowData.value = res.data
}
function search() { loadRoles() }

const dialogVisible = ref(false)
const deleting = ref(false)
const editTarget = ref<Partial<RoleRow> | null>(null)

const editSchema = ref<any>([
  { $formkit: 'hidden', name: 'id' },
  { $formkit: 'primeInputText', name: 'role_name', label: '역할명', outerClass: 'col-6 md:col-6', validation: 'required' },
  { $formkit: 'primeInputText', name: 'role_description', label: '설명', outerClass: 'col-6 md:col-6' },
  { $formkit: 'primeCheckbox', name: 'is_active', label: '활성', outerClass: 'col-12 md:col-4' },
  { $el: 'div', attrs: { class: 'col-12 w-full flex justify-end items-center gap-x-2 mt-2' }, children: [
    { $cmp: 'Button', if: '$id', props: { label: '삭제', severity: 'danger', loading: deleting.value, onClick: () => deleteInDialog() } },
    { $cmp: 'Button', props: { label: '취소', severity: 'secondary', onClick: () => { dialogVisible.value = false } } },
    { $cmp: 'Button', props: { label: '저장', onClick: () => saveRole() } },
  ]},
])

function openCreate() {
  editTarget.value = { role_name: '', role_description: '', is_active: true, permissions: {} } as any
  selectedRole.value = null
  dialogVisible.value = true
}
function openEdit(row: RoleRow) {
  editTarget.value = { ...row, permissions: row.permissions || {} }
  selectedRole.value = row
  loadAssignedUsers(row.id)
  loadAssignedDepts(row.id)
  dialogVisible.value = true
}

async function saveRole() {
  const roleName = (editTarget.value as any)?.role_name?.trim?.() || ''
  if (!roleName) return toast.add({ severity: 'warn', summary: '유효성 오류', detail: '역할명은 필수입니다.', life: 2500 })
  const body = { ...editTarget.value, permissions: editTarget.value?.permissions || {} }
  if (!editTarget.value?.id) await $fetch('/api/roles', { method: 'POST', body })
  else await $fetch(`/api/roles/${editTarget.value.id}`, { method: 'PUT', body })
  dialogVisible.value = false
  await loadRoles()
}
function deleteInDialog() {
  const currentId = editTarget.value?.id
  if (!currentId) return
  deleting.value = true
  $fetch(`/api/roles/${currentId}`, { method: 'DELETE' })
    .then(async () => { dialogVisible.value = false; await loadRoles() })
    .finally(() => { deleting.value = false })
}
function exportExcel() { const api = gridApi.value; if (api) api.exportDataAsExcel({ fileName: 'Roles', sheetName: 'Roles' }) }
function onGridReady(params: any) { gridApi.value = params.api }
function onCellDoubleClicked(event: any) { openEdit(event.data) }

interface MenuItem { id: number; title: string; href?: string | null; parent_id?: number | null; permission_key?: string | null }
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
const menuAutoGroupColumnDef = ref<any>({ headerName: '메뉴', minWidth: 220, cellRendererParams: { suppressCount: true, suppressDoubleClickExpand: true, suppressEnterExpand: true } })
async function loadMenus() {
  menuLoading.value = true
  try {
    const r = await $fetch<{ success: boolean; data: any[] }>('/api/menu/admin')
    const list = (r.data || []).map(m => ({ id: m.id, title: m.title, href: m.href, parent_id: m.parent_id, permission_key: m.permission_key || (m.href ? `menu:${m.href}` : `menu:id:${m.id}`) }))
    menuRows.value = list
    rebuildMenuRowData()
  } finally { menuLoading.value = false }
}
function getPermLevel(pk: string) { const p = editTarget.value?.permissions || {}; return (p as any)[pk] || 'none' }
function setPermLevel(pk: string, v: 'none' | 'read' | 'write') {
  const p = { ...(editTarget.value?.permissions || {}) } as any
  if (v === 'none') delete p[pk]; else p[pk] = v
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
      if (guard.has(cur.id)) break
      guard.add(cur.id)
      path.unshift(cur.title || '')
      const pid = cur.parent_id as any
      cur = pid != null ? (map.get(pid) as any) : undefined
    }
    return path
  }
  menuRowData.value = list.map(r => {
    const level = getPermLevel(r.permission_key as string)
    return { ...r, orgHierarchy: computePath(r), level, read: level === 'read' || level === 'write', write: level === 'write' }
  })
}
function getMenuDataPath(data: any) { return data.orgHierarchy || [] }
function onMenuGridReady(params: any) { menuGridApi.value = params.api; try { menuGridApi.value.expandAll?.() } catch {} }
function onMenuCellValueChanged(event: any) {
  const pk = event?.data?.permission_key as string
  if (!pk) return
  const read = !!event?.data?.read
  const write = !!event?.data?.write
  let next: 'none' | 'read' | 'write' = 'none'
  if (write) next = 'write'
  else if (read) next = 'read'
  setPermLevel(pk, next)
}
function expandAllMenuGrid() { const api = menuGridApi.value; if (api?.expandAll) api.expandAll() }
function collapseAllMenuGrid() { const api = menuGridApi.value; if (api?.collapseAll) api.collapseAll() }

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
  input.addEventListener('click', (ev) => { ev.stopPropagation() })
  input.addEventListener('change', (ev: any) => {
    ev.stopPropagation()
    const checked = ev.target.checked
    if (colId === 'write') {
      params.node.setDataValue('write', checked)
    } else if (colId === 'read') {
      params.node.setDataValue('read', checked)
      // READ 해제시 WRITE는 그대로 두어 독립 동작
    }
    const pk = params?.data?.permission_key
    if (pk) {
      const read = !!params.node.data.read
      const write = !!params.node.data.write
      let next: 'none' | 'read' | 'write' = 'none'
      if (write) next = 'write'; else if (read) next = 'read'
      setPermLevel(pk, next)
    }
  })
  wrapper.appendChild(input)
  return wrapper
}

const assignedUsers = ref<any[]>([])
const userSearchFilters = ref<any>({ q: '', dept: '', departmentId: null as number | null })
const userSearch = ref<string>('')
const userDepartmentOptions = ref<{ id: number, name: string }[]>([])
const userSearchResult = ref<any[]>([])
const userSearchGridApi = shallowRef<any | null>(null)
const assignedUsersGridApi = shallowRef<any | null>(null)
const userSearchSelection = ref<any[]>([])
const userSearchColDefs = ref<any[]>([
  { headerName: '', colId: 'select', width: 40, checkboxSelection: true, headerCheckboxSelection: true, suppressMenu: true },
  { field: 'department_name', headerName: '부서', minWidth: 160 },
  { field: 'username', headerName: '아이디', minWidth: 120 },
  { field: 'full_name', headerName: '이름', minWidth: 140 },
  { headerName: '추가', colId: 'add', width: 80, valueGetter: () => '추가', cellClass: 'action-cell' },
])
const assignedUsersColDefs = ref<any[]>([
  { field: 'department_name', headerName: '부서', minWidth: 160 },
  { field: 'username', headerName: '아이디', minWidth: 120 },
  { field: 'full_name', headerName: '이름', minWidth: 120 },
  { headerName: '삭제', colId: 'remove', width: 80, valueGetter: () => '삭제', cellClass: 'action-cell danger' },
])
const compactGridOpts = ref<any>({ rowHeight: 26, headerHeight: 28, rowSelection: 'multiple', defaultColDef: { filter: true } })
async function loadUserDepartmentsOptions() {
  const res = await $fetch<any>('/api/departments', { params: { search: '' } })
  if (res?.success) {
    userDepartmentOptions.value = makeHierarchicalSelectOptions((res.data || []), { labelKey: 'name', includeCode: true })
  }
}
async function searchUsers() {
  const f = userSearchFilters.value || {}
  const res = await $fetch<any>('/api/users', { params: { search: (f.q || userSearch.value || ''), dept: f.dept || '', departmentId: f.departmentId || null } })
  userSearchResult.value = res?.success ? (res.data || []) : []
}
async function loadAssignedUsers(roleId: number) {
  const res = await $fetch<any>('/api/roles/' + roleId + '/users')
  assignedUsers.value = res?.success ? (res.data || []) : []
}
async function addUserToRole(userId: number) {
  const roleId = editTarget.value?.id
  if (!roleId) return
  await $fetch(`/api/users/${userId}/roles`, { method: 'POST', body: { role_id: roleId } })
  await loadAssignedUsers(roleId)
}
function onUserSearchGridReady(p: any) { userSearchGridApi.value = p.api }
function onAssignedUsersGridReady(p: any) { assignedUsersGridApi.value = p.api }
function onUserSearchCellClicked(event: any) {
  if (event?.column?.getColId?.() === 'add') addUserToRole(event?.data?.id)
}
function onAssignedUsersCellClicked(event: any) {
  if (event?.column?.getColId?.() === 'remove') removeUserFromRole(event?.data?.id)
}
async function removeUserFromRole(userId: number) {
  const roleId = editTarget.value?.id
  if (!roleId) return
  await $fetch(`/api/users/${userId}/roles`, { method: 'DELETE', params: { roleId } })
  await loadAssignedUsers(roleId)
}
async function removeAllUsersFromRole() {
  const roleId = editTarget.value?.id
  if (!roleId) return
  const count = assignedUsers.value.length
  if (count === 0) return
  confirmAction(async () => {
    for (const u of assignedUsers.value) {
      const uid = u?.id
      if (!uid) continue
      try { await $fetch(`/api/users/${uid}/roles`, { method: 'DELETE', params: { roleId } }) } catch {}
    }
    await loadAssignedUsers(roleId)
  }, '삭제 완료', `사용자 ${count}명 할당을 해제했습니다.`, '전체 삭제 확인', '선택된 역할에서 모든 사용자를 삭제하시겠습니까?', { compact: true, acceptLabel: '삭제', rejectLabel: '취소', icon: 'pi pi-exclamation-triangle' })
}
async function addSelectedUsersToRole() {
  const roleId = editTarget.value?.id
  if (!roleId) return
  const api = userSearchGridApi.value
  const rows = api?.getSelectedRows?.() || []
  for (const r of rows) {
    const uid = r?.id
    if (!uid) continue
    await $fetch(`/api/users/${uid}/roles`, { method: 'POST', body: { role_id: roleId } })
  }
  await loadAssignedUsers(roleId)
}
async function addAllFilteredUsersToRole() {
  const roleId = editTarget.value?.id
  if (!roleId) return
  const list = userSearchResult.value || []
  for (const r of list) {
    const uid = r?.id
    if (!uid) continue
    await $fetch(`/api/users/${uid}/roles`, { method: 'POST', body: { role_id: roleId } })
  }
  await loadAssignedUsers(roleId)
}

// 조직/사용자 트리 선택(채팅 초대와 동일 패턴)
const orgTreeNodes = ref<any[]>([])
const orgTreeSelection = ref<Record<string, any>>({})
const orgTreeLoading = ref(false)
const deptIncludeSub = ref(true)
const orgNodeMap = ref<Record<string, any>>({})

async function loadOrgTree() {
  orgTreeLoading.value = true
  try {
    const res: any = await $fetch('/api/org/tree')
    const nodes = (res?.data || []) as any[]
    orgTreeNodes.value = nodes
    // build flat node map for quick lookup
    const map: Record<string, any> = {}
    const dfs = (arr: any[]) => {
      for (const n of arr) {
        map[n.key] = n
        if (Array.isArray(n.children) && n.children.length) dfs(n.children)
      }
    }
    dfs(nodes)
    orgNodeMap.value = map
  } catch { orgTreeNodes.value = [] }
  finally { orgTreeLoading.value = false }
}

const invitedUserIds = computed(() => {
  const ids: number[] = []
  for (const key of Object.keys(orgTreeSelection.value || {})) {
    const node = (orgTreeSelection.value as any)[key]
    if (!node) continue
    if (key.startsWith('u-') && node?.checked) {
      const id = Number(key.slice(2))
      if (Number.isFinite(id) && id > 0) ids.push(id)
    }
  }
  return Array.from(new Set(ids))
})

const selectedDeptIds = computed(() => {
  const ids: number[] = []
  for (const key of Object.keys(orgTreeSelection.value || {})) {
    const node = (orgTreeSelection.value as any)[key]
    if (!node) continue
    if (key.startsWith('d-') && node?.checked) {
      const id = Number(key.slice(2))
      if (Number.isFinite(id) && id > 0) ids.push(id)
    }
  }
  return Array.from(new Set(ids))
})

async function addUsersFromTreeSelection() {
  const roleId = editTarget.value?.id
  if (!roleId) return
  for (const uid of invitedUserIds.value) {
    await $fetch(`/api/users/${uid}/roles`, { method: 'POST', body: { role_id: roleId } })
  }
  await loadAssignedUsers(roleId)
}

async function addSelectedDeptsToRole() {
  const roleId = editTarget.value?.id
  if (!roleId) return
  // expand with descendants if option enabled
  const expandDescendants = (deptId: number): number[] => {
    const key = `d-${deptId}`
    const node = orgNodeMap.value[key]
    const acc: number[] = []
    const dfs = (n: any) => {
      if (!n) return
      if (typeof n.key === 'string' && n.key.startsWith('d-')) {
        const m = n.key.match(/-(\d+)$/)
        const id = m ? Number(m[1]) : null
        if (id) acc.push(id)
      }
      for (const c of (n.children || [])) dfs(c)
    }
    // include self and descendants
    dfs(node)
    return acc
  }
  const targetDeptIds = new Set<number>()
  for (const did of selectedDeptIds.value) {
    if (deptIncludeSub.value) {
      for (const x of expandDescendants(did)) targetDeptIds.add(x)
    } else {
      targetDeptIds.add(did)
    }
  }
  for (const id of Array.from(targetDeptIds)) {
    await $fetch(`/api/departments/${id}/roles`, { method: 'POST', body: { role_id: roleId } })
  }
  await loadAssignedDepts(roleId)
}

async function addFromTreeSelection() {
  // 부서가 선택된 경우 부서 할당, 사용자 선택된 경우 사용자 할당
  if (selectedDeptIds.value.length > 0) await addSelectedDeptsToRole()
  if (invitedUserIds.value.length > 0) await addUsersFromTreeSelection()
}

const departments = ref<{ id: number; name: string }[]>([])
const departmentSelectOptions = ref<Array<{ id: number; label: string; flatLabel: string }>>([])
const assignedDepts = ref<any[]>([])
const selectedDeptId = ref<number | null>(null)
const departmentTreeOptions = ref<any[]>([])
const selectedDeptKey = ref<string | null>(null)
const deptSearchFilters = ref<any>({ name: '', departmentId: null as number | null })
const assignedDeptsGridApi = shallowRef<any | null>(null)
const assignedDeptsQuick = ref('')
const assignedDeptsColDefs = ref<any[]>([
  { field: 'name', headerName: '부서', minWidth: 140 },
  { headerName: '삭제', colId: 'remove', width: 80, valueGetter: () => '삭제', cellClass: 'action-cell danger' },
])
async function loadDepartments() {
  const res = await $fetch<any>('/api/departments', { params: { search: '' } })
  if (res?.success) {
    const rows = (res.data || [])
    departments.value = rows.map((d: any) => ({ id: d.id, name: d.name }))
    // 검색 가능한 드롭다운 옵션 (코드 + 부서명, 계층 포함)
    const hierarchical = makeHierarchicalSelectOptions(rows, { labelKey: 'label', includeCode: true }) as any[]
    departmentSelectOptions.value = hierarchical.map((o: any) => ({ id: o.id, label: o.label, flatLabel: o.label.replace(/^[\s\u2000-\u200F\u202F\u205F\u3000]+/, '') }))
  }
}
async function searchDepartments() {
  const f = deptSearchFilters.value || {}
  const res = await $fetch<any>('/api/departments', { params: { search: f.name || '' } })
  if (res?.success) departments.value = (res.data || []).map((d: any) => ({ id: d.id, name: d.name }))
}
async function loadDepartmentTree() {
  // 조직 트리 API에서 부서 노드만 추출해 TreeSelect 옵션으로 변환
  const res = await $fetch<any>('/api/org/tree')
  const nodes = res as any
  function pruneDeptOnly(list: any[]): any[] {
    const acc: any[] = []
    for (const n of (list || [])) {
      if (n?.type === 'dept' || (n?.data?.type === 'dept')) {
        const children = pruneDeptOnly(n.children || [])
        acc.push({ key: n.key, label: n.label, data: n.data, children })
      } else {
        const children = pruneDeptOnly(n.children || [])
        if (children.length > 0) {
          acc.push({ key: n.key, label: n.label, data: n.data, children })
        }
      }
    }
    return acc
  }
  departmentTreeOptions.value = pruneDeptOnly(nodes || [])
}
function getDeptIdFromKey(key: string | null): number | null {
  if (!key) return null
  // 예상 형태: d-123
  const m = key.match(/-(\d+)$/)
  return m ? Number(m[1]) : null
}
async function loadAssignedDepts(roleId: number) {
  const res = await $fetch<any>('/api/roles/' + roleId + '/departments')
  assignedDepts.value = res?.success ? (res.data || []) : []
}
async function addDeptToRole() {
  const roleId = editTarget.value?.id
  const deptId = selectedDeptId.value ?? getDeptIdFromKey(selectedDeptKey.value)
  if (!roleId || !deptId) return
  await $fetch(`/api/departments/${deptId}/roles`, { method: 'POST', body: { role_id: roleId } })
  await loadAssignedDepts(roleId)
}
function onAssignedDeptsGridReady(p: any) { assignedDeptsGridApi.value = p.api }
function onAssignedDeptsCellClicked(event: any) {
  if (event?.column?.getColId?.() === 'remove') removeDeptFromRole(event?.data?.id)
}
async function removeDeptFromRole(deptId: number) {
  const roleId = editTarget.value?.id
  if (!roleId) return
  await $fetch(`/api/departments/${deptId}/roles`, { method: 'DELETE', params: { roleId } })
  await loadAssignedDepts(roleId)
}
async function removeAllDeptsFromRole() {
  const roleId = editTarget.value?.id
  if (!roleId) return
  const count = assignedDepts.value.length
  if (count === 0) return
  confirmAction(async () => {
    for (const d of assignedDepts.value) {
      const did = d?.id
      if (!did) continue
      try { await $fetch(`/api/departments/${did}/roles`, { method: 'DELETE', params: { roleId } }) } catch {}
    }
    await loadAssignedDepts(roleId)
  }, '삭제 완료', `부서 ${count}개 할당을 해제했습니다.`, '전체 삭제 확인', '선택된 역할에서 모든 부서를 삭제하시겠습니까?', { compact: true, acceptLabel: '삭제', rejectLabel: '취소', icon: 'pi pi-exclamation-triangle' })
}

const selectedRole = ref<RoleRow | null>(null)
watch(selectedRole, async (v) => { if (v) openEdit(v) })
onMounted(async () => { await loadUserDepartmentsOptions(); await loadDepartmentTree() })
watch(dialogVisible, async (v) => { if (v) await loadOrgTree() })
</script>

<template>
  <div class="card flex flex-wrap gap-6">
    <div class="w-full pb-2 mb-2 border-b border-gray-200 dark:border-gray-700">
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
      <h5 class="mb-2">역할 목록</h5>
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

      <div class="mt-3">
        <div class="flex items-center gap-2 mb-2 compact-form">
          <h6 class="m-0">메뉴 권한 매핑</h6>
          <Button icon="pi pi-angle-double-down" text v-tooltip.bottom="'전체 펼치기'" @click="expandAllMenuGrid" />
          <Button icon="pi pi-angle-double-up" text v-tooltip.bottom="'전체 접기'" @click="collapseAllMenuGrid" />
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
            @cell-clicked="(e:any)=>{ if(e?.column?.getColId?.()=='read'||e?.column?.getColId?.()=='write'){ try{ e.event?.stopPropagation?.() } catch{} } }"
          />
        </div>
      </div>

      <div class="mt-4 grid grid-cols-12 gap-4">
        <div class="col-span-12 md:col-span-6">
          <h6 class="mb-2">사용자 할당</h6>
          <div class="mb-2">
            <label class="text-xs text-gray-500">조직/사용자 선택</label>
            <div class="mt-1 border rounded p-2 max-h-72 overflow-auto">
              <div v-if="orgTreeLoading" class="text-sm text-gray-500">로딩중...</div>
              <Tree v-else
                :value="orgTreeNodes"
                selectionMode="checkbox"
                v-model:selectionKeys="orgTreeSelection"
                :filter="true"
                filterMode="lenient"
                :metaKeySelection="false"
                class="w-full"
              />
            </div>
            <div class="mt-2 flex items-center justify-between gap-2 compact-form">
              <div class="text-xs text-gray-600">
                <span>부서 선택: {{ selectedDeptIds.length }}개</span>
                <span class="mx-2">|</span>
                <span>사용자 선택: {{ invitedUserIds.length }}명</span>
                <span class="mx-2">|</span>
                <Checkbox v-model="deptIncludeSub" :binary="true" inputId="inclSubAssign" />
                <label for="inclSubAssign" class="ml-1">하위부서 포함</label>
              </div>
              <div class="flex gap-2">
                <Button label="부서 추가" :disabled="!selectedDeptIds.length" @click="addSelectedDeptsToRole" />
                <Button label="사용자 추가" :disabled="!invitedUserIds.length" @click="addUsersFromTreeSelection" />
              </div>
            </div>
          </div>


        </div>

        <div class="col-span-12 md:col-span-6">
          <div class="mt-3 mb-2 flex items-center justify-between compact-form">
            <h6 class="m-0">할당된 부서</h6>
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
            <h6 class="m-0">할당된 사용자 ({{ assignedUsers.length }})</h6>
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


