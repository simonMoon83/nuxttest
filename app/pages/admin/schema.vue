<script setup lang="ts">
import AgGrid from '~/components/AgGrid.vue'
import type { RowClickedEvent, ValueFormatterParams } from 'ag-grid-community'
import { useStoredProcedure } from '@/composables/useStoredProcedure'
import { useConfirmation } from '@/composables/confirmation'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { useCodeBook } from '@/composables/useCodeBook'
import { useAuthStore } from '@/stores/auth'
import type { CodeGroup, CodeItem, GridDetail, GridMaster, MenuDisplayEntry } from '@/types/schema'

definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

interface DropdownOption<T = string> {
  label: string
  value: T
}

const toast = useToast()
const route = useRoute() // 라우트 추가
const colorMode = useColorMode()
const authStore = useAuthStore()
const { executeProcedure } = useStoredProcedure()
const { confirmAction } = useConfirmation()
const codeBook = useCodeBook()

const agGridThemeClass = computed(() => colorMode.value === 'dark' ? 'ag-theme-quartz-dark' : 'ag-theme-quartz')

const requiredCodeGroups = ['YN_FLAG', 'BINARY_FLAG', 'GRID_TYPE', 'GRID_COLUMN_TYPE', 'GRID_FIELD_SIZE'] as const

const gridSearch = ref('')
const selectedProcedure = ref('sp_grid_master') // 현재 선택된 프로시저

// URL 쿼리 파라미터에 따른 프로시저 자동 설정
// 예: /admin/schema?sp=019 -> sp_adm019 (레거시 지원)
// 예: /admin/schema?procedure=sp_grid_master
const querySp = computed(() => {
  const sp = route.query.sp
  if (sp) return `sp_adm${String(sp).padStart(3, '0')}`
  const proc = route.query.procedure
  if (proc) return String(proc)
  return null
})

const isAutoProcedure = computed(() => !!querySp.value)

watch(() => querySp.value, (newProc) => {
  if (newProc) {
    selectedProcedure.value = newProc
    gridFilterForm.value.procedure = newProc
    
    // availableProcedures에 없으면 임시로 추가 (화면 표시용)
    if (!availableProcedures.some(p => p.value === newProc)) {
      availableProcedures.push({ label: `${newProc} (자동)`, value: newProc })
    }
    // 자동 조회
    refreshGrids()
  }
}, { immediate: true })

const gridsAction = useAsyncAction()
const gridDetailAction = useAsyncAction()
const menuDisplayAction = useAsyncAction()
const codeGroupsAction = useAsyncAction()
const gridMasterSaver = useAsyncAction()
const gridDetailSaver = useAsyncAction()
const menuDisplaySaver = useAsyncAction()

// 사용 가능한 프로시저 목록
const availableProcedures = reactive([
  { label: 'sp_grid_master - 그리드 마스터', value: 'sp_grid_master' },
])

const loadingGrids = gridsAction.loading
const loadingGridDetail = gridDetailAction.loading
const loadingMenuDisplay = menuDisplayAction.loading
const loadingCodeGroups = codeGroupsAction.loading
const savingGridMaster = gridMasterSaver.loading
const savingGridDetail = gridDetailSaver.loading
const savingMenuDisplay = menuDisplaySaver.loading

const gridList = ref<GridMaster[]>([])
const gridDetailList = ref<GridDetail[]>([])
const menuDisplayList = ref<MenuDisplayEntry[]>([])
const availableCodeGroups = ref<CodeGroup[]>([])

const selectedGrid = ref<GridMaster | null>(null)
const selectedGridId = computed(() => selectedGrid.value?.grid_id ?? null)
const selectedMenuId = ref<string | null>(null)
const focusedGridDetail = ref<GridDetail | null>(null)
const focusedMenuDisplay = ref<MenuDisplayEntry | null>(null)

const currentUserId = computed(() => {
  const user = authStore.user
  if (!user) return 'admin'
  return user.username || String(user.id)
})

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
      const result = await $fetch<{ success: boolean, data: GridMaster[] }>(
        `/api/schema/grids?procedureName=${selectedProcedure.value}`
      )
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

const loadMenuDisplay = async (menuId: string | null = null) => {
  const targetMenuId = menuId || selectedMenuId.value
  console.log('🔍 loadMenuDisplay 호출:', { menuId, selectedMenuId: selectedMenuId.value, targetMenuId })
  
  if (!targetMenuId) {
    console.warn('⚠️ targetMenuId가 없어 조회를 건너뜁니다.')
    menuDisplayList.value = []
    return
  }
  
  try {
    const data = await menuDisplayAction.run(async () => {
      console.log('📡 API 호출:', `/api/display/${targetMenuId}`)
      const result = await $fetch<{ success: boolean, data: MenuDisplayEntry[] }>(`/api/display/${targetMenuId}`)
      console.log('✅ API 응답:', result)
      if (!result.success) throw new Error('메뉴 화면 구성을 불러오지 못했습니다.')
      return result.data || []
    })
    console.log('📊 조회된 데이터:', data)
    menuDisplayList.value = data
    focusedMenuDisplay.value = null
    
    if (data.length === 0) {
      toast.add({
        severity: 'info',
        summary: '조회 완료',
        detail: `${targetMenuId}에 대한 메뉴 화면 구성이 없습니다.`,
        life: 3000
      })
    } else {
      toast.add({
        severity: 'success',
        summary: '조회 완료',
        detail: `${data.length}개의 화면 구성을 조회했습니다.`,
        life: 2000
      })
    }
  } catch (error) {
    console.error('❌ 메뉴 화면 구성 로드 실패:', error)
    handleError('메뉴 화면 구성을 불러오는데 실패했습니다.')
    menuDisplayList.value = []
  }
}

// grid_id에서 menu_id 추출 (예: adm019_header -> ADM019)
const extractMenuIdFromGridId = (gridId: string): string => {
  // grid_id 패턴: adm###_* 또는 ADM### 형식
  const match = gridId.match(/^(adm\d{3})/i)
  const captured = match?.[1]
  if (captured) {
    return captured.toUpperCase()
  }
  // 매칭 안 되면 원본 그대로 대문자로 반환
  return gridId.toUpperCase()
}

const handleGridRowClick = (event: RowClickedEvent<GridMaster>) => {
  if (!event.data) return
  console.log('🖱️ 그리드 마스터 클릭:', event.data)
  selectedGrid.value = event.data
  if (event.data.grid_id) {
    console.log('📌 선택된 grid_id:', event.data.grid_id)
    loadGridDetail(event.data.grid_id)
    
    // grid_id에서 menu_id 추출 (adm019_header -> ADM019)
    const menuId = extractMenuIdFromGridId(event.data.grid_id)
    console.log('🔄 추출된 menu_id:', menuId)
    
    selectedMenuId.value = menuId
    loadMenuDisplay(menuId)
  }
}

const handleGridDetailRowClick = (event: RowClickedEvent<GridDetail>) => {
  focusedGridDetail.value = event.data || null
}

const handleMenuDisplayRowClick = (event: RowClickedEvent<MenuDisplayEntry>) => {
  focusedMenuDisplay.value = event.data || null
}

// AgGrid 참조
const gridMasterAgGridRef = ref()
const gridDetailAgGridRef = ref()
const menuDisplayAgGridRef = ref()

// 저장 완료 이벤트 핸들러
const onGridMasterSaved = async (result: any) => {
  console.log('그리드 마스터 저장 완료:', result)
  await loadGrids({ selectGridId: selectedGridId.value })
  toast.add({
    severity: 'success',
    summary: '저장 완료',
    detail: `${result.added + result.modified + result.deleted}건 저장되었습니다.`,
    life: 2000
  })
}

const onGridDetailSaved = async (result: any) => {
  console.log('그리드 상세 저장 완료:', result)
  if (selectedGridId.value) {
    await loadGridDetail(selectedGridId.value)
  }
  toast.add({
    severity: 'success',
    summary: '저장 완료',
    detail: `${result.added + result.modified + result.deleted}건 저장되었습니다.`,
    life: 2000
  })
}

const onMenuDisplaySaved = async (result: any) => {
  console.log('메뉴 화면 구성 저장 완료:', result)
  await loadMenuDisplay()
  toast.add({
    severity: 'success',
    summary: '저장 완료',
    detail: `${result.added + result.modified + result.deleted}건 저장되었습니다.`,
    life: 2000
  })
}

const onSaveError = (error: any) => {
  console.error('저장 실패:', error)
  toast.add({
    severity: 'error',
    summary: '저장 실패',
    detail: error.message || '저장 중 오류가 발생했습니다.',
    life: 3000
  })
}

const refreshGrids = async () => {
  if (selectedGridId.value) {
    await loadGrids({ selectGridId: selectedGridId.value })
  } else {
    await loadGrids()
  }
}

const gridFilterForm = ref({
  procedure: 'sp_grid_master',
  keyword: ''
})

const resetGridFilter = () => {
  gridFilterForm.value.procedure = 'sp_grid_master'
  gridFilterForm.value.keyword = ''
}

const gridFilterSchema = computed(() => {
  const fields = []
  
  // URL 파라미터로 자동 설정된 경우 프로시저 선택 숨김
  if (!isAutoProcedure.value) {
    fields.push({ 
      $formkit: 'primeSelect', 
      name: 'procedure', 
      label: '프로시저 선택', 
      options: availableProcedures,
      optionLabel: 'label',
      optionValue: 'value',
      outerClass: 'col-12 md:col-4' 
    })
  }

  fields.push({ $formkit: 'primeInputText', name: 'keyword', label: '그리드 검색', placeholder: 'ID 또는 이름', outerClass: isAutoProcedure.value ? 'col-12 md:col-8' : 'col-12 md:col-4' })
  
  fields.push({
    $el: 'div',
    attrs: { class: 'col-12 md:col-4 flex justify-end gap-2' },
    children: [
      { $cmp: 'Button', props: { label: '초기화', outlined: true, severity: 'secondary', onClick: () => resetGridFilter() } },
      { $cmp: 'Button', props: { label: '조회', icon: 'pi pi-search', severity: 'secondary', onClick: () => refreshGrids() } }
    ]
  })

  return fields
})


watch(() => gridFilterForm.value.keyword, (keyword) => {
  gridSearch.value = (keyword ?? '').toString()
})

watch(() => gridFilterForm.value.procedure, (procedure) => {
  selectedProcedure.value = procedure || 'sp_adm011'
})

const gridMasterColumnDefs = computed(() => [
  { 
    field: 'grid_id', 
    headerName: '그리드 ID', 
    minWidth: 200, 
    editable: (params: any) => params.data && params.data.__status === 'N',
    cellEditor: 'agTextCellEditor',
    cellEditorPopup: false
  },
  { 
    field: 'grid_name', 
    headerName: '그리드명', 
    minWidth: 200, 
    editable: true, 
    cellEditor: 'agTextCellEditor',
    cellEditorPopup: false
  },
  { 
    field: 'grid_type', 
    headerName: '타입', 
    width: 130, 
    editable: true, 
    cellEditor: 'agSelectCellEditor', 
    cellEditorParams: { values: gridTypeOptions.value.map(opt => opt.value) },
    cellEditorPopup: false
  },
  { 
    field: 'grid_row', 
    headerName: '행 수', 
    width: 110, 
    editable: true, 
    cellEditor: 'agNumberCellEditor', 
    cellEditorParams: { min: 0 },
    cellEditorPopup: false
  },
  { 
    field: 'use_yn', 
    headerName: '사용', 
    width: 110, 
    editable: true,
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: { values: ['Y', 'N'] },
    valueFormatter: (params: ValueFormatterParams) => formatYesNo(params.value as string),
    cellEditorPopup: false
  }
])

const menuDisplayColumnDefs = computed(() => [
  { 
    field: 'menu_id', 
    headerName: '메뉴 ID', 
    width: 130, 
    editable: (params: any) => params.data && params.data.__status === 'N',
    cellEditor: 'agTextCellEditor',
    cellEditorPopup: false
  },
  { 
    field: 'contents_seq', 
    headerName: '순서', 
    width: 80, 
    editable: (params: any) => params.data && params.data.__status === 'N',
    cellEditor: 'agNumberCellEditor',
    cellEditorParams: { min: 0 },
    cellEditorPopup: false
  },
  { 
    field: 'contents_type', 
    headerName: '타입', 
    width: 100, 
    editable: true, 
    cellEditor: 'agSelectCellEditor', 
    cellEditorParams: { values: ['grid', 'card'] },
    cellEditorPopup: false
  },
  { 
    field: 'contents_header', 
    headerName: '제목', 
    minWidth: 150, 
    editable: true, 
    cellEditor: 'agTextCellEditor',
    cellEditorPopup: false
  },
  { 
    field: 'contents_width', 
    headerName: '너비', 
    width: 90, 
    editable: true, 
    cellEditor: 'agNumberCellEditor', 
    cellEditorParams: { min: 0 },
    cellEditorPopup: false
  },
  { 
    field: 'contents_height', 
    headerName: '높이', 
    width: 90, 
    editable: true, 
    cellEditor: 'agNumberCellEditor', 
    cellEditorParams: { min: 0 },
    cellEditorPopup: false
  },
  { 
    field: 'search_case', 
    headerName: '검색 Case', 
    width: 110, 
    editable: true, 
    cellEditor: 'agTextCellEditor',
    cellEditorPopup: false
  },
  { 
    field: 'save_case', 
    headerName: '저장 Case', 
    width: 110, 
    editable: true, 
    cellEditor: 'agTextCellEditor',
    cellEditorPopup: false
  },
  { 
    field: 'row_click_case', 
    headerName: '클릭 Case', 
    width: 110, 
    editable: true, 
    cellEditor: 'agTextCellEditor',
    cellEditorPopup: false
  },
  { 
    field: 'row_click_target', 
    headerName: '클릭 Target', 
    width: 120, 
    editable: true, 
    cellEditor: 'agTextCellEditor',
    cellEditorPopup: false
  }
])

const gridDetailColumnDefs = computed(() => [
  { 
    field: 'col_seq', 
    headerName: '순서', 
    width: 100, 
    editable: true, 
    cellEditor: 'agNumberCellEditor', 
    cellEditorParams: { min: 0 },
    cellEditorPopup: false
  },
  { 
    field: 'col_id', 
    headerName: '컬럼 ID', 
    minWidth: 160, 
    editable: (params: any) => params.data && params.data.__status === 'N',
    cellEditor: 'agTextCellEditor',
    cellEditorPopup: false
  },
  { 
    field: 'col_name', 
    headerName: '컬럼명', 
    minWidth: 160, 
    editable: true, 
    cellEditor: 'agTextCellEditor',
    cellEditorPopup: false
  },
  { 
    field: 'col_type', 
    headerName: '타입', 
    width: 120, 
    editable: true, 
    cellEditor: 'agSelectCellEditor', 
    cellEditorParams: { values: columnTypeOptions.value.map(opt => opt.value) },
    cellEditorPopup: false
  },
  { 
    field: 'col_size', 
    headerName: '크기', 
    width: 110, 
    editable: true, 
    cellEditor: 'agSelectCellEditor', 
    cellEditorParams: { values: fieldSizeOptions.value.map(opt => opt.value) },
    cellEditorPopup: false
  },
  { 
    field: 'col_code', 
    headerName: '코드', 
    width: 140, 
    editable: true, 
    cellEditor: 'agSelectCellEditor', 
    cellEditorParams: { values: codeGroupOptions.value.map(opt => opt.value) },
    cellEditorPopup: false
  },
  { 
    field: 'col_width', 
    headerName: '너비', 
    width: 110, 
    editable: true, 
    cellEditor: 'agNumberCellEditor', 
    cellEditorParams: { min: 0 },
    cellEditorPopup: false
  },
  { 
    field: 'col_hide', 
    headerName: '숨김', 
    width: 100, 
    editable: true,
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: { values: [0, 1] },
    valueFormatter: (params: ValueFormatterParams) => (Number(params.value) === 1 ? '숨김' : '표시'),
    cellEditorPopup: false
  },
  { 
    field: 'use_yn', 
    headerName: '사용', 
    width: 100, 
    editable: true,
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: { values: ['Y', 'N'] },
    valueFormatter: (params: ValueFormatterParams) => formatYesNo(params.value as string),
    cellEditorPopup: false
  },
  { 
    field: 'col_flex', 
    headerName: 'Flex', 
    width: 100, 
    editable: true, 
    cellEditor: 'agNumberCellEditor', 
    cellEditorParams: { min: 0 },
    cellEditorPopup: false
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
      <p class="text-gray-600 dark:text-gray-400">s_grid_master / s_menu_display / s_grid_detail 통합 관리</p>
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

    <!-- 2열 레이아웃: 좌측(Grid Master) / 우측(Menu Display + Grid Detail) -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- 좌측: Grid Master -->
      <Card>
        <template #title>s_grid_master (그리드 기본 정보)</template>
        <template #content>
          <ClientOnly>
            <AgGrid
              ref="gridMasterAgGridRef"
              title="그리드 마스터"
              :row-data="filteredGridList"
              :column-defs="gridMasterColumnDefs"
              :editable="true"
              edit-mode="singleClick"
              :row-select="true"
              grid-id="schema_master"
              :procedure-name="selectedProcedure"
              :save-param-fields="['grid_id', 'grid_name', 'grid_type', 'grid_row', 'use_yn']"
              :extra-save-params="{ user_id: currentUserId }"
              :show-save-button="true"
              save-button-label="저장"
              @row-clicked="handleGridRowClick"
              @saved="onGridMasterSaved"
              @save-error="onSaveError"
            />
            <template #fallback>
              <div class="flex h-36 items-center justify-center text-sm text-gray-500">그리드 로딩 중...</div>
            </template>
          </ClientOnly>
        </template>
      </Card>

      <!-- 우측: Menu Display + Grid Detail (상하 배치) -->
      <div class="space-y-6">
        <!-- 우측 상단: Menu Display -->
        <Card>
          <template #title>s_menu_display (메뉴 화면 구성)</template>
          <template #content>
            <ClientOnly>
              <AgGrid
                ref="menuDisplayAgGridRef"
                title="메뉴 화면 구성"
                :row-data="menuDisplayList"
                :column-defs="menuDisplayColumnDefs"
                :editable="true"
                edit-mode="singleClick"
                :row-select="true"
                grid-id="schema_menu_display"
                procedure-name="sp_menu_display_info"
                :save-param-fields="['menu_id', 'contents_seq', 'contents_type', 'contents_header', 'contents_width', 'contents_height', 'search_case', 'save_case', 'row_click_case', 'row_click_target']"
                :extra-save-params="{ user_id: currentUserId }"
                :show-save-button="true"
                save-button-label="저장"
                @row-clicked="handleMenuDisplayRowClick"
                @saved="onMenuDisplaySaved"
                @save-error="onSaveError"
              />
              <template #fallback>
                <div class="flex h-36 items-center justify-center text-sm text-gray-500">메뉴 화면 구성 로딩 중...</div>
              </template>
            </ClientOnly>
          </template>
        </Card>

        <!-- 우측 하단: Grid Detail -->
        <Card>
          <template #title>s_grid_detail (컬럼 상세)</template>
          <template #content>
            <ClientOnly>
              <AgGrid
                ref="gridDetailAgGridRef"
                title="그리드 상세"
                :row-data="gridDetailList"
                :column-defs="gridDetailColumnDefs"
                :editable="true"
                edit-mode="singleClick"
                :row-select="true"
                grid-id="schema_detail"
                procedure-name="sp_grid_info"
                :save-param-fields="['col_id', 'col_name', 'col_seq', 'col_type', 'col_size', 'col_code', 'col_width', 'col_hide', 'col_flex', 'use_yn']"
                :extra-save-params="{ grid_id: selectedGridId, user_id: currentUserId }"
                :show-save-button="true"
                save-button-label="저장"
                @row-clicked="handleGridDetailRowClick"
                @saved="onGridDetailSaved"
                @save-error="onSaveError"
              />
              <template #fallback>
                <div class="flex h-36 items-center justify-center text-sm text-gray-500">상세 로딩 중...</div>
              </template>
            </ClientOnly>
          </template>
        </Card>
      </div>
    </div>
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

