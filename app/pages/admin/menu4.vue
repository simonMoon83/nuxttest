<script setup lang='ts'>
import { AgGridVue } from 'ag-grid-vue3'
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'
import { TreeDataModule, ExcelExportModule, CellSelectionModule, ClipboardModule } from 'ag-grid-enterprise'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'

const { confirmAction } = useConfirmation()
const toast = useToast()

interface MenuItem {
  id: number
  title: string
  href: string
  icon: string
  parent_id: number | null
  sort_order: number
  is_separator: boolean
  is_active: boolean
}

interface TreeNode { key: string; data: MenuItem; children?: TreeNode[] }

definePageMeta({ layout: 'default', middleware: 'auth' })

ModuleRegistry.registerModules([AllCommunityModule, TreeDataModule, ExcelExportModule, CellSelectionModule, ClipboardModule])
const colorMode = useColorMode()
const agGridThemeClass = computed(() => colorMode.value === 'dark' ? 'ag-theme-quartz-dark' : 'ag-theme-quartz')

const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const dialogVisible = ref(false)
const editTarget = ref<MenuItem | null>(null)

// 검색 폼 (departments 디자인 차용)
const filters = ref<any>({ title: '', href: '', activeOnly: null })
const schema = ref<any>([
  { $formkit: 'primeInputText', name: 'title', label: '메뉴명', outerClass: 'col-4' },
  { $formkit: 'primeInputText', name: 'href', label: '링크', outerClass: 'col-4' },
  { $formkit: 'primeSelect', name: 'activeOnly', label: '활성여부', outerClass: 'col-4',
    optionLabel: 'label', optionValue: 'value', placeholder: '전체', showClear: true,
    options: [
      { label: '전체', value: null },
      { label: '활성', value: true },
      { label: '비활성', value: false },
    ],
  },
  { $el: 'div', attrs: { class: 'col-12 w-full flex justify-end items-center gap-x-2 mt-1' }, children: [
    { $cmp: 'Button', props: { label: '검색', severity: 'primary', onClick: () => onSearch() } },
    { $cmp: 'Button', props: { label: '초기화', outlined: true, severity: 'secondary', type: 'reset', onClick: () => onReset() } },
    { $cmp: 'Button', props: { label: '등록', severity: 'secondary', onClick: () => openCreateRoot() } },
    { $cmp: 'Button', props: { label: '엑셀', outlined: true, severity: 'secondary', onClick: () => exportExcel() } },
  ] },
])

const searchQuery = ref('')
const agGrid = ref()
const gridApi = shallowRef<any | null>(null)
const rowData = ref<any[]>([])
const defaultColDef = ref<any>({ resizable: true, sortable: true, filter: true })
const gridOptions = ref<any>({
  rowHeight: 28,
  headerHeight: 32,
  animateRows: true,
  groupDefaultExpanded: 1,
  enableRangeSelection: true,
  enableRangeHandle: true,
  clipboardDelimiter: '\t',
})
const rowSelection = ref({ mode: 'multiRow' as const, checkboxes: true, headerCheckbox: true })
const autoGroupColumnDef = ref<any>({
  headerName: '메뉴명',
  minWidth: 260,
  cellRendererParams: { suppressCount: true },
})
const columnDefs = ref<any[]>([
  { field: 'title', headerName: '메뉴명', minWidth: 200, hide: true },
  { field: 'href', headerName: '링크', minWidth: 220, flex: 1 },
  { field: 'sort_order', headerName: '순서', width: 100 },
  { field: 'is_active', headerName: '활성', width: 100 },
])
function onGridReady(params: any) { gridApi.value = params.api; applyGridFilter(); updateGridTheme() }
function onCellDoubleClicked(event: any) { openEdit(event.data) }
function getDataPath(data: any) { return data.orgHierarchy || [] }
function expandAllGrid() { if (gridApi.value) gridApi.value.expandAll() }
function collapseAllGrid() { if (gridApi.value) gridApi.value.collapseAll() }
function updateGridTheme() { if (import.meta.client) { const div = document.querySelector('.ag-grid-menu4'); if (div) { div.classList.remove('ag-theme-quartz', 'ag-theme-quartz-dark'); div.classList.add(agGridThemeClass.value) } } }
watch(() => colorMode.value, () => updateGridTheme())
function applyGridFilter() { if (!gridApi.value) return; const q = searchQuery.value.toLowerCase().trim(); gridApi.value.setGridOption('quickFilterText', q) }
watch(searchQuery, () => applyGridFilter())
function exportExcel() { const api = gridApi.value; if (api) api.exportDataAsExcel({fileName: 'MenuList', sheetName: 'Menus' }) }

// 메뉴 데이터
const menuData = ref<MenuItem[]>([])

function buildTree(list: MenuItem[]) {
  const map = new Map<number, MenuItem>()
  list.forEach(i => map.set(i.id, i))
  rowData.value = list.map(i => ({ ...i, orgHierarchy: computePath(i, map) }))
}
function computePath(item: MenuItem, all: Map<number, MenuItem>): string[] {
  const path: string[] = []
  let cur: MenuItem | undefined = item
  const guard = new Set<number>()
  while (cur) {
    if (guard.has(cur.id)) break
    guard.add(cur.id)
    path.unshift(cur.title || '')
    cur = cur.parent_id != null ? (all.get(cur.parent_id) || undefined) : undefined
  }
  return path
}

async function loadMenu() {
  try {
    loading.value = true
    const res = await $fetch<{ success: boolean; data: MenuItem[] }>('/api/menu/admin')
    if (res?.success) {
      let rows = res.data || []
      const f = filters.value
      if (f.title) rows = rows.filter(r => r.title?.toLowerCase?.().includes?.(f.title.toLowerCase()))
      if (f.href) rows = rows.filter(r => r.href?.toLowerCase?.().includes?.(f.href.toLowerCase()))
      if (f.activeOnly !== null && f.activeOnly !== undefined) rows = rows.filter(r => r.is_active === f.activeOnly)
      menuData.value = rows as any
      buildTree(menuData.value)
      applyGridFilter()
    }
  } finally { loading.value = false }
}

function onSearch() { loadMenu() }
function onReset() { filters.value = { title: '', href: '', activeOnly: null }; searchQuery.value = ''; loadMenu() }

// CRUD & 정렬 이관
function openCreateRoot() { openCreateWithParent(null) }
function openCreateChild(parent: MenuItem) { openCreateWithParent(parent.id) }
function openCreateWithParent(parentId: number | null) {
  editTarget.value = { id: 0 as any, title: '', href: '', icon: '', parent_id: parentId, sort_order: getNextSortOrder(parentId), is_separator: false, is_active: true }
  dialogVisible.value = true
}
function openEdit(row: MenuItem) { editTarget.value = { ...row }; dialogVisible.value = true }
function closeDialog() { dialogVisible.value = false; editTarget.value = null }

function getNextSortOrder(parentId: number | null): number { const s = menuData.value.filter(m => m.parent_id === parentId); return s.length > 0 ? Math.max(...s.map(x => x.sort_order)) + 1 : 1 }

const parentMenuOptions = computed(() => [{ label: '최상위 메뉴', value: null }, ...menuData.value.filter(m => !m.is_separator && m.parent_id === null).map(m => ({ label: m.title, value: m.id }))])

const editSchema = ref<any>([
  { $formkit: 'primeCheckbox', name: 'is_separator', label: '구분선', outerClass: 'col-12' },
  { $formkit: 'primeInputText', name: 'title', label: '메뉴명', outerClass: 'col-6', validation: 'required', if: "$value.is_separator !== true" },
  { $formkit: 'primeInputText', name: 'href', label: '링크', outerClass: 'col-6', help: '예: /path/to/page', if: "$value.is_separator !== true" },
  { $formkit: 'primeInputText', name: 'icon', label: '아이콘', help: '예: pi pi-home', outerClass: 'col-6', if: "$value.is_separator !== true" },
  { $formkit: 'primeSelect', name: 'parent_id', label: '상위 메뉴', outerClass: 'col-6', options: parentMenuOptions, optionLabel: 'label', optionValue: 'value', placeholder: '상위 메뉴 선택', showClear: true, filter: true, if: "$value.is_separator !== true" },
  { $formkit: 'primeInputNumber', name: 'sort_order', label: '정렬 순서', outerClass: 'col-6', min: 0 },
  { $formkit: 'primeCheckbox', name: 'is_active', label: '활성', outerClass: 'col-6', if: "$value.is_separator !== true" },
])

async function saveMenu() {
  try {
    saving.value = true
    const body = { ...(editTarget.value as any) }
    // 기본 유효성
    const isSeparator = Boolean(body?.is_separator)
    const title = (body?.title ?? '').toString().trim()
    const parentId = body?.parent_id ?? null
    if (!isSeparator && !title) {
      toast.add({ severity: 'warn', summary: '유효성 오류', detail: '메뉴명은 필수입니다.', life: 2500 })
      saving.value = false
      return
    }
    // 동일 부모 내 중복 메뉴명 방지(수정 시 자기 자신 제외)
    const dup = menuData.value.some(m => (m.parent_id ?? null) === parentId && (m.title ?? '').trim().toLowerCase() === title.toLowerCase() && m.id !== (body?.id ?? 0))
    if (!isSeparator && dup) {
      toast.add({ severity: 'warn', summary: '중복 메뉴명', detail: '같은 상위 메뉴에 동일한 이름이 있습니다.', life: 2500 })
      saving.value = false
      return
    }
    // href 형식(선택 입력): 입력 시 /로 시작 권장
    const href = (body?.href ?? '').toString().trim()
    if (!isSeparator && href && !href.startsWith('/')) {
      toast.add({ severity: 'warn', summary: '유효성 안내', detail: '링크는 /로 시작하는 경로 형식을 권장합니다.', life: 2500 })
      saving.value = false
      return
    }

    if ((editTarget.value as any)?.id && (editTarget.value as any).id !== 0) await $fetch(`/api/menu/${(editTarget.value as any).id}`, { method: 'PUT', body })
    else await $fetch('/api/menu/create', { method: 'POST', body })
    dialogVisible.value = false
    await refreshMenuData()
  } finally { saving.value = false }
}

function deleteInDialog() {
  const currentId = (editTarget.value as any)?.id
  if (!currentId) return
  confirmAction(async () => {
    try {
      deleting.value = true
      await $fetch(`/api/menu/${currentId}`, { method: 'DELETE' })
      dialogVisible.value = false
      await refreshMenuData()
    } finally {
      deleting.value = false
    }
  }, '삭제 완료', '메뉴를 삭제했습니다.', '삭제 확인', '해당 메뉴를 삭제하시겠습니까?', { compact: true, acceptLabel: '삭제', rejectLabel: '취소', icon: 'pi pi-exclamation-triangle' })
}

async function onToggleActive(menu: MenuItem, nextValue: boolean) { const prev = menu.is_active; menu.is_active = nextValue; try { await $fetch(`/api/menu/${menu.id}`, { method: 'PUT', body: { is_active: nextValue } }) } catch { menu.is_active = prev } }

async function refreshMenuData() { await loadMenu(); const { refreshMenu } = useNavigationMenu(); await refreshMenu() }

onMounted(() => { loadMenu() })
</script>

<style scoped>
.field { margin-bottom: 1rem; }
</style>

<template>
  <div class="card flex flex-wrap gap-6">
    <!-- 검색 영역 (departments 디자인 차용) -->
    <div class="w-full pb-2 mb-2 border-b border-gray-200 dark:border-gray-700">
      <div class="compact-form">
        <FormKitDataEdit
          v-model="filters"
          :schema="schema"
          :debug-schema="false"
          :debug-data="false"
          form-class="form-horizontal grid-12"
          submit-label=""
          @data-saved="onSearch"
        />
      </div>
    </div>

    <!-- 메뉴 트리 (AG Grid Tree Data) -->
    <div class="w-full">
      <div class="flex items-center gap-2 mb-1">
        <h5 class="m-0">메뉴 관리</h5>
        <Button icon="pi pi-angle-double-down" text size="small" v-tooltip.bottom="'전체 펼치기'" @click="expandAllGrid" />
        <Button icon="pi pi-angle-double-up" text size="small" v-tooltip.bottom="'전체 접기'" @click="collapseAllGrid" />
      </div>

      <div :class="agGridThemeClass" class="ag-grid-menu4" style="height: 550px; width: 100%;">
        <div class="datatable-header"></div>
        <AgGridVue
          ref="agGrid"
          :row-data="rowData"
          :column-defs="columnDefs"
          :default-col-def="defaultColDef"
          :row-selection="rowSelection"
          :tree-data="true"
          :get-data-path="getDataPath"
          :auto-group-column-def="autoGroupColumnDef"
          :grid-options="gridOptions"
          :animate-rows="true"
          theme="legacy"
          style="width: 100%; height: calc(100% - 8px);"
          @grid-ready="onGridReady"
          @cell-double-clicked="onCellDoubleClicked"
        />
      </div>
    </div>

    <!-- 등록/수정 다이얼로그 -->
    <Dialog v-model:visible="dialogVisible" :header="editTarget ? '메뉴 수정' : '메뉴 추가'" :style="{ width: '620px' }" modal>
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
      <template #footer>
        <div class="compact-form flex items-center gap-2">
          <Button v-if="(editTarget as any)?.id && (editTarget as any)?.id !== 0" label="삭제" severity="danger" :loading="deleting" @click="deleteInDialog" />
          <Button label="취소" severity="secondary" @click="closeDialog" />
          <Button label="저장" :loading="saving" @click="saveMenu" />
        </div>
      </template>
    </Dialog>
    
  </div>
</template>

