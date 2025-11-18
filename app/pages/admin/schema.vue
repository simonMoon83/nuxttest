<script setup lang="ts">
import { AgGridVue } from 'ag-grid-vue3'
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'
import type { RowClickedEvent, ValueFormatterParams } from 'ag-grid-community'
import { CellSelectionModule, ClipboardModule, ExcelExportModule } from 'ag-grid-enterprise'
import { useStoredProcedure } from '@/composables/useStoredProcedure'
import { useConfirmation } from '@/composables/confirmation'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { useCodeBook } from '@/composables/useCodeBook'
import { useAuthStore } from '@/stores/auth'
import type { CodeGroup, CodeItem, GridDetail, GridMaster } from '@/types/schema'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'

definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

ModuleRegistry.registerModules([AllCommunityModule, ExcelExportModule, CellSelectionModule, ClipboardModule])

interface DropdownOption<T = string> {
  label: string
  value: T
}

const toast = useToast()
const colorMode = useColorMode()
const authStore = useAuthStore()
const { executeProcedure } = useStoredProcedure()
const { confirmAction } = useConfirmation()
const codeBook = useCodeBook()

const agGridThemeClass = computed(() => colorMode.value === 'dark' ? 'ag-theme-quartz-dark' : 'ag-theme-quartz')

const requiredCodeGroups = ['YN_FLAG', 'BINARY_FLAG', 'GRID_TYPE', 'GRID_COLUMN_TYPE', 'GRID_FIELD_SIZE'] as const

const gridSearch = ref('')

const gridsAction = useAsyncAction()
const gridDetailAction = useAsyncAction()
const codeGroupsAction = useAsyncAction()
const gridMasterSaver = useAsyncAction()
const gridDetailSaver = useAsyncAction()

const loadingGrids = gridsAction.loading
const loadingGridDetail = gridDetailAction.loading
const loadingCodeGroups = codeGroupsAction.loading
const savingGridMaster = gridMasterSaver.loading
const savingGridDetail = gridDetailSaver.loading

const gridList = ref<GridMaster[]>([])
const gridDetailList = ref<GridDetail[]>([])
const availableCodeGroups = ref<CodeGroup[]>([])

const selectedGrid = ref<GridMaster | null>(null)
const selectedGridId = computed(() => selectedGrid.value?.grid_id ?? null)
const focusedGridDetail = ref<GridDetail | null>(null)

const currentUserId = computed(() => {
  const user = authStore.user
  if (!user) return 'admin'
  return user.username || String(user.id)
})

const showGridMasterEditor = ref(false)
const showGridDetailEditor = ref(false)

const gridMasterForm = ref({
  grid_id: '',
  grid_name: '',
  grid_type: '',
  grid_row: 0,
  use_yn: 'Y' as 'Y' | 'N'
})
const editingGridMaster = ref<GridMaster | null>(null)

const gridDetailForm = ref({
  col_id: '',
  col_name: '',
  col_seq: 0,
  col_type: '',
  col_size: '',
  col_code: '',
  col_width: 0,
  col_hide: 0,
  col_flex: 0,
  use_yn: 'Y' as 'Y' | 'N'
})
const editingGridDetail = ref<GridDetail | null>(null)

const mapStringOptions = (group: string, fallback: DropdownOption[] = []) => computed(() => {
  const codes = codeBook.getOptions(group)
  if (!codes.length) return fallback
  return codes.map((code: CodeItem) => ({
    label: code.code_name || code.code,
    value: code.code
  }))
})

const mapNumberOptions = (group: string, fallback: DropdownOption<number>[] = []) => computed(() => {
  const codes = codeBook.getOptions(group)
  if (!codes.length) return fallback
  return codes.map((code: CodeItem) => ({
    label: code.code_name || code.code,
    value: Number(code.code)
  }))
})

const ynOptions = mapStringOptions('YN_FLAG', [
  { label: '사용', value: 'Y' },
  { label: '미사용', value: 'N' }
])
const gridTypeOptions = mapStringOptions('GRID_TYPE')
const columnTypeOptions = mapStringOptions('GRID_COLUMN_TYPE')
const fieldSizeOptions = mapStringOptions('GRID_FIELD_SIZE')
const binaryOptions = mapNumberOptions('BINARY_FLAG', [
  { label: '표시', value: 0 },
  { label: '숨김', value: 1 }
])

const codeGroupOptions = computed(() => availableCodeGroups.value.map((group: CodeGroup) => ({
  label: group.code_grp_name ? `${group.code_grp} - ${group.code_grp_name}` : group.code_grp,
  value: group.code_grp
})))

const filteredGridList = computed(() => {
  if (!gridSearch.value) return gridList.value
  const keyword = gridSearch.value.toLowerCase().trim()
  return gridList.value.filter((grid: GridMaster) =>
    grid.grid_id.toLowerCase().includes(keyword) ||
    (grid.grid_name || '').toLowerCase().includes(keyword)
  )
})

const formatCodeLabel = (group: string, value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === '') return ''
  const match = codeBook.getOptions(group).find((code: CodeItem) => code.code === String(value))
  return match?.code_name || String(value)
}

const formatYesNo = (value: string | null | undefined) => {
  if (!value) return ''
  return formatCodeLabel('YN_FLAG', value) || (value === 'Y' ? '사용' : '미사용')
}

const agDefaultColDef = {
  sortable: true,
  filter: true,
  resizable: true,
  flex: 1,
  minWidth: 120
}

const agNoRowsTemplate = '<span class="text-sm text-gray-500">데이터가 없습니다.</span>'

const handleError = (detail: string) => {
  toast.add({
    severity: 'error',
    summary: '오류',
    detail,
    life: 3000
  })
}

interface GridLoadOptions {
  selectGridId?: string | null
  autoSelectFirst?: boolean
}

const loadGrids = async (options: GridLoadOptions = {}) => {
  const { selectGridId, autoSelectFirst = true } = options
  try {
    const data = await gridsAction.run(async () => {
      const result = await $fetch<{ success: boolean, data: GridMaster[] }>('/api/schema/grids')
      if (!result.success) throw new Error('그리드 목록을 불러오지 못했습니다.')
      return result.data || []
    })
    gridList.value = data

    let targetGridId = selectGridId ?? null

    if (!targetGridId && selectedGridId.value) {
      const exists = data.some((grid) => grid.grid_id === selectedGridId.value)
      if (exists) targetGridId = selectedGridId.value
    }

    if (!targetGridId && autoSelectFirst) {
      const firstGrid = data[0]
      if (firstGrid?.grid_id) targetGridId = firstGrid.grid_id
    }

    if (targetGridId) {
      const match = data.find((grid) => grid.grid_id === targetGridId) || null
      selectedGrid.value = match
      if (match) {
        await loadGridDetail(match.grid_id)
      } else {
        gridDetailList.value = []
      }
    } else {
      selectedGrid.value = null
      gridDetailList.value = []
    }
  } catch (error) {
    console.error('그리드 목록 로드 실패:', error)
    handleError('그리드 목록을 불러오는데 실패했습니다.')
  }
}

const ensureSelectedGrid = (gridId: string) => {
  if (selectedGrid.value?.grid_id === gridId) return
  const match = gridList.value.find((grid: GridMaster) => grid.grid_id === gridId)
  if (match) selectedGrid.value = match
}

const loadGridDetail = async (gridId: string) => {
  if (!gridId) return
  ensureSelectedGrid(gridId)
  try {
    const data = await gridDetailAction.run(async () => {
      const result = await $fetch<{ success: boolean, data: GridDetail[] }>(`/api/schema/grids/${gridId}`)
      if (!result.success) throw new Error('그리드 상세 정보를 불러오지 못했습니다.')
      return result.data || []
    })
    gridDetailList.value = data
    focusedGridDetail.value = null
    showGridDetailEditor.value = false
  } catch (error) {
    console.error('그리드 상세 로드 실패:', error)
    handleError('그리드 상세 정보를 불러오는데 실패했습니다.')
  }
}

const loadCodeGroups = async () => {
  try {
    const data = await codeGroupsAction.run(async () => {
      const result = await $fetch<{ success: boolean, data: CodeGroup[] }>('/api/code/groups')
      if (!result.success) throw new Error('코드 그룹을 불러오지 못했습니다.')
      return result.data || []
    })
    availableCodeGroups.value = data
  } catch (error) {
    console.error('코드 그룹 로드 실패:', error)
    handleError('코드 그룹 정보를 불러오는데 실패했습니다.')
  }
}

const openAddGridMaster = () => {
  editingGridMaster.value = null
  gridMasterForm.value = {
    grid_id: '',
    grid_name: '',
    grid_type: '',
    grid_row: 0,
    use_yn: 'Y'
  }
  showGridMasterEditor.value = true
}

const openEditGridMaster = (grid: GridMaster) => {
  editingGridMaster.value = grid
  gridMasterForm.value = {
    grid_id: grid.grid_id || '',
    grid_name: grid.grid_name || '',
    grid_type: grid.grid_type || '',
    grid_row: grid.grid_row ?? 0,
    use_yn: grid.use_yn || 'Y'
  }
  showGridMasterEditor.value = true
}

const saveGridMaster = async () => {
  if (!gridMasterForm.value.grid_id || !gridMasterForm.value.grid_name) {
    toast.add({
      severity: 'warn',
      summary: '경고',
      detail: '그리드 ID와 그리드명은 필수입니다.',
      life: 3000
    })
    return
  }

  try {
    await gridMasterSaver.run(async () => {
      const result = await executeProcedure('sp_adm011', {
        case: 'save',
        grid_id: gridMasterForm.value.grid_id,
        grid_name: gridMasterForm.value.grid_name,
        grid_type: gridMasterForm.value.grid_type || null,
        grid_row: gridMasterForm.value.grid_row || null,
        use_yn: gridMasterForm.value.use_yn || 'Y',
        user_id: currentUserId.value
      })
      if (!result.success) throw new Error(result.error || '그리드 마스터 저장 실패')
    })

    const savedGridId = gridMasterForm.value.grid_id

    toast.add({
      severity: 'success',
      summary: '성공',
      detail: '그리드 마스터를 저장했습니다.',
      life: 3000
    })
    showGridMasterEditor.value = false
    await loadGrids({ selectGridId: savedGridId })
  } catch (error) {
    console.error('그리드 마스터 저장 실패:', error)
    handleError(error instanceof Error ? error.message : '그리드 마스터 저장에 실패했습니다.')
  }
}

const deleteGridMaster = (grid: GridMaster) => {
  confirmAction(async () => {
    try {
      await gridMasterSaver.run(async () => {
        const result = await executeProcedure('sp_adm011', {
          case: 'delete',
          grid_id: grid.grid_id
        })
        if (!result.success) throw new Error(result.error || '그리드 마스터 삭제 실패')
      })

      toast.add({
        severity: 'success',
        summary: '성공',
        detail: '그리드 마스터를 삭제했습니다.',
        life: 3000
      })
      await loadGrids()
    } catch (error) {
      console.error('그리드 마스터 삭제 실패:', error)
      handleError(error instanceof Error ? error.message : '그리드 마스터 삭제에 실패했습니다.')
    }
  }, '그리드 마스터 삭제', `정말로 "${grid.grid_name}" 그리드를 삭제하시겠습니까?`, '확인')
}

const openAddGridDetail = () => {
  if (!selectedGridId.value) {
    toast.add({
      severity: 'warn',
      summary: '경고',
      detail: '그리드를 먼저 선택해주세요.',
      life: 3000
    })
    return
  }

  editingGridDetail.value = null
  gridDetailForm.value = {
    col_id: '',
    col_name: '',
    col_seq: gridDetailList.value.length + 1,
    col_type: '',
    col_size: '',
    col_code: '',
    col_width: 0,
    col_hide: 0,
    col_flex: 0,
    use_yn: 'Y'
  }
  showGridDetailEditor.value = true
}

const openEditGridDetail = (detail: GridDetail) => {
  editingGridDetail.value = detail
  gridDetailForm.value = {
    col_id: detail.col_id || '',
    col_name: detail.col_name || '',
    col_seq: detail.col_seq || 0,
    col_type: detail.col_type || '',
    col_size: detail.col_size || '',
    col_code: detail.col_code || '',
    col_width: detail.col_width || 0,
    col_hide: detail.col_hide || 0,
    col_flex: detail.col_flex || 0,
    use_yn: detail.use_yn || 'Y'
  }
  showGridDetailEditor.value = true
}

const closeGridDetailEditor = () => {
  showGridDetailEditor.value = false
  editingGridDetail.value = null
}

const saveGridDetail = async () => {
  if (!selectedGridId.value || !gridDetailForm.value.col_id || !gridDetailForm.value.col_name) {
    toast.add({
      severity: 'warn',
      summary: '경고',
      detail: '그리드 ID, 컬럼 ID, 컬럼명은 필수입니다.',
      life: 3000
    })
    return
  }

  try {
    await gridDetailSaver.run(async () => {
      const result = await executeProcedure('sp_grid_info', {
        case: 'save',
        grid_id: selectedGridId.value,
        col_id: gridDetailForm.value.col_id,
        col_name: gridDetailForm.value.col_name,
        col_seq: gridDetailForm.value.col_seq || null,
        col_type: gridDetailForm.value.col_type || null,
        col_size: gridDetailForm.value.col_size || null,
        col_code: gridDetailForm.value.col_code || null,
        col_width: gridDetailForm.value.col_width || null,
        col_hide: gridDetailForm.value.col_hide ?? null,
        col_flex: gridDetailForm.value.col_flex || null,
        use_yn: gridDetailForm.value.use_yn || 'Y',
        user_id: currentUserId.value
      })

      if (!result.success) throw new Error(result.error || '그리드 상세 저장 실패')
    })

    toast.add({
      severity: 'success',
      summary: '성공',
      detail: '그리드 상세를 저장했습니다.',
      life: 3000
    })
    if (selectedGridId.value) await loadGridDetail(selectedGridId.value)
    closeGridDetailEditor()
  } catch (error) {
    console.error('그리드 상세 저장 실패:', error)
    handleError(error instanceof Error ? error.message : '그리드 상세 저장에 실패했습니다.')
  }
}

const deleteGridDetail = (detail: GridDetail) => {
  if (!selectedGridId.value) return

  confirmAction(async () => {
    try {
      await gridDetailSaver.run(async () => {
        const result = await executeProcedure('sp_grid_info', {
          case: 'delete',
          grid_id: selectedGridId.value,
          col_id: detail.col_id
        })
        if (!result.success) throw new Error(result.error || '그리드 상세 삭제 실패')
      })

      toast.add({
        severity: 'success',
        summary: '성공',
        detail: '그리드 상세를 삭제했습니다.',
        life: 3000
      })
      focusedGridDetail.value = null
      if (selectedGridId.value) await loadGridDetail(selectedGridId.value)
    } catch (error) {
      console.error('그리드 상세 삭제 실패:', error)
      handleError(error instanceof Error ? error.message : '그리드 상세 삭제에 실패했습니다.')
    }
  }, '그리드 상세 삭제', `정말로 "${detail.col_name}" 컬럼을 삭제하시겠습니까?`, '확인')
}

const handleGridRowClick = (event: RowClickedEvent<GridMaster>) => {
  if (!event.data) return
  selectedGrid.value = event.data
  if (event.data.grid_id) loadGridDetail(event.data.grid_id)
}

const handleGridDetailRowClick = (event: RowClickedEvent<GridDetail>) => {
  focusedGridDetail.value = event.data || null
}

const handleGridMasterCellValueChanged = async (event: any) => {
  if (!event.data) return
  
  try {
    await gridMasterSaver.run(async () => {
      const result = await executeProcedure('sp_adm011', {
        case: 'save',
        grid_id: event.data.grid_id,
        grid_name: event.data.grid_name,
        grid_type: event.data.grid_type || null,
        grid_row: event.data.grid_row || null,
        use_yn: event.data.use_yn || 'Y',
        user_id: currentUserId.value
      })
      if (!result.success) throw new Error(result.error || '그리드 마스터 저장 실패')
    })
    
    toast.add({
      severity: 'success',
      summary: '저장 완료',
      detail: '변경사항이 저장되었습니다.',
      life: 2000
    })
  } catch (error) {
    console.error('그리드 마스터 저장 실패:', error)
    handleError(error instanceof Error ? error.message : '저장에 실패했습니다.')
    await loadGrids({ selectGridId: event.data.grid_id })
  }
}

const handleGridDetailCellValueChanged = async (event: any) => {
  if (!event.data || !selectedGridId.value) return
  
  try {
    await gridDetailSaver.run(async () => {
      const result = await executeProcedure('sp_grid_info', {
        case: 'save',
        grid_id: selectedGridId.value,
        col_id: event.data.col_id,
        col_name: event.data.col_name,
        col_seq: event.data.col_seq || null,
        col_type: event.data.col_type || null,
        col_size: event.data.col_size || null,
        col_code: event.data.col_code || null,
        col_width: event.data.col_width || null,
        col_hide: event.data.col_hide ?? null,
        col_flex: event.data.col_flex || null,
        use_yn: event.data.use_yn || 'Y',
        user_id: currentUserId.value
      })
      
      if (!result.success) throw new Error(result.error || '그리드 상세 저장 실패')
    })
    
    toast.add({
      severity: 'success',
      summary: '저장 완료',
      detail: '변경사항이 저장되었습니다.',
      life: 2000
    })
  } catch (error) {
    console.error('그리드 상세 저장 실패:', error)
    handleError(error instanceof Error ? error.message : '저장에 실패했습니다.')
    if (selectedGridId.value) await loadGridDetail(selectedGridId.value)
  }
}

const editSelectedGridMaster = () => {
  if (selectedGrid.value) openEditGridMaster(selectedGrid.value)
}

const deleteSelectedGridMaster = () => {
  if (selectedGrid.value) deleteGridMaster(selectedGrid.value)
}

const editFocusedGridDetail = () => {
  if (focusedGridDetail.value) openEditGridDetail(focusedGridDetail.value)
}

const deleteFocusedGridDetail = () => {
  if (focusedGridDetail.value) deleteGridDetail(focusedGridDetail.value)
}

const refreshGrids = async () => {
  if (selectedGridId.value) {
    await loadGrids({ selectGridId: selectedGridId.value })
  } else {
    await loadGrids()
  }
}

const gridFilterForm = ref({
  keyword: ''
})

const resetGridFilter = () => {
  gridFilterForm.value.keyword = ''
}

const gridFilterSchema = computed(() => [
  { $formkit: 'primeInputText', name: 'keyword', label: '그리드 검색', placeholder: 'ID 또는 이름', outerClass: 'col-12 md:col-8' },
  {
    $el: 'div',
    attrs: { class: 'col-12 md:col-4 flex justify-end gap-2' },
    children: [
      { $cmp: 'Button', props: { label: '초기화', outlined: true, severity: 'secondary', onClick: () => resetGridFilter() } },
      { $cmp: 'Button', props: { label: '조회', icon: 'pi pi-search', severity: 'secondary', onClick: () => refreshGrids() } }
    ]
  }
])

const gridMasterActionsForm = ref({})
const gridMasterActionsSchema = computed(() => [
  {
    $el: 'div',
    attrs: { class: 'col-12 flex flex-wrap items-center justify-between gap-2' },
    children: [
      {
        $el: 'span',
        attrs: { class: 'text-sm text-gray-500' },
        children: `선택된 그리드: ${selectedGridId.value ?? '-'}`
      },
      {
        $el: 'div',
        attrs: { class: 'flex flex-wrap gap-2' },
        children: [
          { $cmp: 'Button', props: { label: '추가', icon: 'pi pi-plus', severity: 'primary', onClick: () => openAddGridMaster() } },
          { $cmp: 'Button', props: { label: '수정', icon: 'pi pi-pencil', severity: 'secondary', disabled: !selectedGrid.value, onClick: () => editSelectedGridMaster() } },
          { $cmp: 'Button', props: { label: '삭제', icon: 'pi pi-trash', outlined: true, severity: 'secondary', disabled: !selectedGrid.value, onClick: () => deleteSelectedGridMaster() } }
        ]
      }
    ]
  }
])

const gridDetailActionsForm = ref({})
const gridDetailActionsSchema = computed(() => [
  {
    $el: 'div',
    attrs: { class: 'col-12 flex flex-wrap items-center justify-between gap-2' },
    children: [
      {
        $el: 'span',
        attrs: { class: 'text-sm text-gray-500' },
        children: `선택된 그리드: ${selectedGridId.value ?? '-'}`
      },
      {
        $el: 'div',
        attrs: { class: 'flex flex-wrap gap-2' },
        children: [
          { $cmp: 'Button', props: { label: '추가', icon: 'pi pi-plus', severity: 'primary', disabled: !selectedGridId.value, onClick: () => openAddGridDetail() } },
          { $cmp: 'Button', props: { label: '수정', icon: 'pi pi-pencil', severity: 'secondary', disabled: !focusedGridDetail.value, onClick: () => editFocusedGridDetail() } },
          { $cmp: 'Button', props: { label: '삭제', icon: 'pi pi-trash', outlined: true, severity: 'secondary', disabled: !focusedGridDetail.value, onClick: () => deleteFocusedGridDetail() } }
        ]
      }
    ]
  }
])

watch(() => gridFilterForm.value.keyword, (keyword) => {
  gridSearch.value = (keyword ?? '').toString()
})

const gridMasterColumnDefs = computed(() => [
  { field: 'grid_id', headerName: '그리드 ID', minWidth: 200, editable: false },
  { field: 'grid_name', headerName: '그리드명', minWidth: 200, editable: true, cellEditor: 'agTextCellEditor' },
  { 
    field: 'grid_type', 
    headerName: '타입', 
    width: 130, 
    editable: true, 
    cellEditor: 'agSelectCellEditor', 
    cellEditorParams: { values: gridTypeOptions.value.map(opt => opt.value) } 
  },
  { field: 'grid_row', headerName: '행 수', width: 110, editable: true, cellEditor: 'agNumberCellEditor', cellEditorParams: { min: 0 } },
  { 
    field: 'use_yn', 
    headerName: '사용', 
    width: 110, 
    editable: true,
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: { values: ['Y', 'N'] },
    valueFormatter: (params: ValueFormatterParams) => formatYesNo(params.value as string) 
  }
])

const gridDetailColumnDefs = computed(() => [
  { field: 'col_seq', headerName: '순서', width: 100, editable: true, cellEditor: 'agNumberCellEditor', cellEditorParams: { min: 0 } },
  { field: 'col_id', headerName: '컬럼 ID', minWidth: 160, editable: false },
  { field: 'col_name', headerName: '컬럼명', minWidth: 160, editable: true, cellEditor: 'agTextCellEditor' },
  { 
    field: 'col_type', 
    headerName: '타입', 
    width: 120, 
    editable: true, 
    cellEditor: 'agSelectCellEditor', 
    cellEditorParams: { values: columnTypeOptions.value.map(opt => opt.value) } 
  },
  { 
    field: 'col_size', 
    headerName: '크기', 
    width: 110, 
    editable: true, 
    cellEditor: 'agSelectCellEditor', 
    cellEditorParams: { values: fieldSizeOptions.value.map(opt => opt.value) } 
  },
  { 
    field: 'col_code', 
    headerName: '코드', 
    width: 140, 
    editable: true, 
    cellEditor: 'agSelectCellEditor', 
    cellEditorParams: { values: codeGroupOptions.value.map(opt => opt.value) } 
  },
  { field: 'col_width', headerName: '너비', width: 110, editable: true, cellEditor: 'agNumberCellEditor', cellEditorParams: { min: 0 } },
  { 
    field: 'col_hide', 
    headerName: '숨김', 
    width: 100, 
    editable: true,
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: { values: [0, 1] },
    valueFormatter: (params: ValueFormatterParams) => (Number(params.value) === 1 ? '숨김' : '표시') 
  },
  { 
    field: 'use_yn', 
    headerName: '사용', 
    width: 100, 
    editable: true,
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: { values: ['Y', 'N'] },
    valueFormatter: (params: ValueFormatterParams) => formatYesNo(params.value as string) 
  },
  { field: 'col_flex', headerName: 'Flex', width: 100, editable: true, cellEditor: 'agNumberCellEditor', cellEditorParams: { min: 0 } }
])

const gridMasterSchema = computed(() => [
  { $formkit: 'primeInputText', name: 'grid_id', label: '그리드 ID', validation: 'required', outerClass: 'col-12', disabled: !!editingGridMaster.value, help: editingGridMaster.value ? '그리드 ID는 수정할 수 없습니다.' : '' },
  { $formkit: 'primeInputText', name: 'grid_name', label: '그리드명', validation: 'required', outerClass: 'col-12' },
  { $formkit: 'primeSelect', name: 'grid_type', label: '그리드 타입', outerClass: 'col-12 md:col-6', options: gridTypeOptions.value, optionLabel: 'label', optionValue: 'value', placeholder: '선택하세요', showClear: true },
  { $formkit: 'primeInputNumber', name: 'grid_row', label: '행 수', outerClass: 'col-12 md:col-6', min: 0, placeholder: '0' },
  { $formkit: 'primeSelect', name: 'use_yn', label: '사용 여부', outerClass: 'col-12 md:col-6', options: ynOptions.value, optionLabel: 'label', optionValue: 'value' },
  {
    $el: 'div',
    attrs: { class: 'col-12 flex justify-end gap-2 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700' },
    children: [
      { $cmp: 'Button', props: { label: '취소', outlined: true, severity: 'secondary', onClick: () => { showGridMasterEditor.value = false } } },
      { $cmp: 'Button', props: { label: '저장', icon: 'pi pi-check', severity: 'primary', loading: savingGridMaster.value, onClick: () => saveGridMaster() } }
    ]
  }
])

const gridDetailSchema = computed(() => [
  { $formkit: 'primeInputText', name: 'col_id', label: '컬럼 ID', validation: 'required', outerClass: 'col-12 md:col-6', disabled: !!editingGridDetail.value, help: editingGridDetail.value ? '컬럼 ID는 수정할 수 없습니다.' : '' },
  { $formkit: 'primeInputText', name: 'col_name', label: '컬럼명', validation: 'required', outerClass: 'col-12 md:col-6' },
  { $formkit: 'primeInputNumber', name: 'col_seq', label: '표시 순서', outerClass: 'col-12 md:col-4', min: 0, placeholder: '1' },
  { $formkit: 'primeSelect', name: 'col_type', label: '컬럼 타입', outerClass: 'col-12 md:col-4', options: columnTypeOptions.value, optionLabel: 'label', optionValue: 'value', placeholder: '선택하세요', showClear: true, filter: true },
  { $formkit: 'primeSelect', name: 'col_size', label: '필드 폭', outerClass: 'col-12 md:col-4', options: fieldSizeOptions.value, optionLabel: 'label', optionValue: 'value', placeholder: '선택하세요', showClear: true },
  { $formkit: 'primeSelect', name: 'col_code', label: '코드 그룹', outerClass: 'col-12 md:col-6', options: codeGroupOptions.value, optionLabel: 'label', optionValue: 'value', placeholder: '선택하세요', showClear: true, filter: true, loading: loadingCodeGroups.value },
  { $formkit: 'primeInputNumber', name: 'col_width', label: '너비(px)', outerClass: 'col-12 md:col-3', min: 0, placeholder: '200' },
  { $formkit: 'primeSelect', name: 'col_hide', label: '표시 여부', outerClass: 'col-12 md:col-3', options: binaryOptions.value, optionLabel: 'label', optionValue: 'value' },
  { $formkit: 'primeInputNumber', name: 'col_flex', label: 'Flex', outerClass: 'col-12 md:col-3', min: 0, placeholder: '0' },
  { $formkit: 'primeSelect', name: 'use_yn', label: '사용 여부', outerClass: 'col-12 md:col-3', options: ynOptions.value, optionLabel: 'label', optionValue: 'value' },
  {
    $el: 'div',
    attrs: { class: 'col-12 flex justify-end gap-2 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700' },
    children: [
      { $cmp: 'Button', props: { label: '취소', outlined: true, severity: 'secondary', onClick: () => closeGridDetailEditor() } },
      { $cmp: 'Button', props: { label: '저장', icon: 'pi pi-check', severity: 'primary', loading: savingGridDetail.value, onClick: () => saveGridDetail() } }
    ]
  }
])

const gridFilterStats = computed(() => ([
  { label: '등록된 그리드', value: gridList.value.length },
  { label: '선택된 그리드', value: selectedGridId.value ?? '-' },
  { label: '선택된 그리드 컬럼', value: gridDetailList.value.length }
]))

const loadInitialCodes = async () => {
  try {
    await codeBook.fetchGroups([...requiredCodeGroups])
  } catch (error) {
    console.error('코드 데이터 로드 실패:', error)
    handleError('코드 목록을 불러오는데 실패했습니다.')
  }
}

onMounted(async () => {
  await loadInitialCodes()
  await loadCodeGroups()
  loadGrids()
})
</script>

<template>
  <div class="space-y-6 p-6">
    <div class="space-y-2">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">그리드 스키마 관리</h1>
      <p class="text-gray-600 dark:text-gray-400">s_grid_master / s_grid_detail 두 테이블만 빠르게 정비할 수 있도록 재구성했습니다.</p>
    </div>

    <Card>
      <template #title>그리드 검색 · 현황</template>
      <template #content>
        <div class="compact-form">
          <FormKitDataEdit
            v-model="gridFilterForm"
            :schema="gridFilterSchema"
            form-class="form-horizontal grid-12"
            submit-label=""
          />
        </div>
        <div class="mt-4 grid gap-4 md:grid-cols-3">
          <div
            v-for="stat in gridFilterStats"
            :key="stat.label"
            class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm"
          >
            <p class="text-sm text-gray-500">{{ stat.label }}</p>
            <p class="text-2xl font-semibold text-gray-900 dark:text-gray-100">{{ stat.value }}</p>
          </div>
        </div>
      </template>
    </Card>

    <Card>
      <template #title>s_grid_master (그리드 기본 정보)</template>
      <template #content>
        <div class="compact-form mb-3">
          <FormKitDataEdit
            :key="`grid-master-actions-${selectedGridId}`"
            v-model="gridMasterActionsForm"
            :schema="gridMasterActionsSchema"
            form-class="form-horizontal grid-12"
            submit-label=""
          />
        </div>
        <ClientOnly>
          <div :class="agGridThemeClass" class="w-full" style="height: 450px;">
            <AgGridVue
              style="width: 100%; height: 100%;"
              :row-data="filteredGridList"
              :column-defs="gridMasterColumnDefs"
              :default-col-def="agDefaultColDef"
              row-selection="single"
              :overlay-no-rows-template="agNoRowsTemplate"
              single-click-edit
              @row-clicked="handleGridRowClick"
              @cell-value-changed="handleGridMasterCellValueChanged"
            />
          </div>
          <template #fallback>
            <div class="flex h-36 items-center justify-center text-sm text-gray-500">그리드 로딩 중...</div>
          </template>
        </ClientOnly>
        
        <Transition name="fade">
          <div v-if="showGridMasterEditor" class="mt-4 rounded-lg border border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-950 p-4">
            <div class="mb-2 flex items-center justify-between">
              <h3 class="text-lg font-semibold text-primary-900 dark:text-primary-100">
                {{ editingGridMaster ? '그리드 마스터 수정' : '그리드 마스터 추가' }}
              </h3>
            </div>
            <div class="compact-form">
              <FormKitDataEdit
                v-model="gridMasterForm"
                :schema="gridMasterSchema"
                form-class="form-horizontal grid-12"
                submit-label=""
              />
            </div>
          </div>
        </Transition>
      </template>
    </Card>

    <Card>
      <template #title>s_grid_detail (컬럼 상세)</template>
      <template #content>
        <div class="compact-form mb-3">
          <FormKitDataEdit
            :key="`grid-detail-actions-${selectedGridId}-${focusedGridDetail?.col_id}`"
            v-model="gridDetailActionsForm"
            :schema="gridDetailActionsSchema"
            form-class="form-horizontal grid-12"
            submit-label=""
          />
        </div>
        <ClientOnly>
          <div :class="agGridThemeClass" class="w-full" style="height: 450px;">
            <AgGridVue
              style="width: 100%; height: 100%;"
              :row-data="gridDetailList"
              :column-defs="gridDetailColumnDefs"
              :default-col-def="agDefaultColDef"
              row-selection="single"
              :overlay-no-rows-template="agNoRowsTemplate"
              single-click-edit
              @row-clicked="handleGridDetailRowClick"
              @cell-value-changed="handleGridDetailCellValueChanged"
            />
          </div>
          <template #fallback>
            <div class="flex h-36 items-center justify-center text-sm text-gray-500">상세 로딩 중...</div>
          </template>
        </ClientOnly>
        
        <Transition name="fade">
          <div v-if="showGridDetailEditor" class="mt-4 rounded-lg border border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-950 p-4">
            <div class="mb-2 flex items-center justify-between">
              <h3 class="text-lg font-semibold text-primary-900 dark:text-primary-100">
                {{ editingGridDetail ? '컬럼 수정' : '컬럼 추가' }}
              </h3>
            </div>
            <div class="compact-form">
              <FormKitDataEdit
                v-model="gridDetailForm"
                :schema="gridDetailSchema"
                form-class="form-horizontal grid-12"
                submit-label=""
              />
            </div>
          </div>
        </Transition>
      </template>
    </Card>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

