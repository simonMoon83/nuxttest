<script setup lang="ts">
import AgGrid from '~/components/AgGrid.vue'
import type { RowClickedEvent, ValueFormatterParams } from 'ag-grid-community'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { useCodeBook } from '@/composables/useCodeBook'
import { useFormKitSchemaHelpers } from '@/composables/useFormKitSchemaHelpers'
import { useAuthStore } from '@/stores/auth'
import type { CodeItem, GridMaster } from '@/types/schema'
import type { FormKitSchema } from '~/types/formkit-schema'

const emit = defineEmits<{
  (e: 'row-selected', grid: GridMaster): void
}>()

interface DropdownOption<T = string> {
  label: string
  value: T
}

// 헬퍼 함수 사용
const { createButtonGroup } = useFormKitSchemaHelpers()

const toast = useToast()
const route = useRoute()
const authStore = useAuthStore()
const codeBook = useCodeBook()

const gridsAction = useAsyncAction()

const loadingGrids = gridsAction.loading

const gridList = ref<GridMaster[]>([])
const gridSearch = ref('')
const selectedProcedure = ref('sp_grid_master')

// 사용 가능한 프로시저 목록
const availableProcedures = reactive([
  { label: 'sp_grid_master - 그리드 마스터', value: 'sp_grid_master' },
])

const currentUserId = computed(() => {
  const user = authStore.user
  if (!user)
    return 'admin'
  return user.username || String(user.id)
})

const mapStringOptions = (group: string, fallback: DropdownOption[] = []) => computed(() => {
  const codes = codeBook.getOptions(group)
  if (!codes.length)
    return fallback
  return codes.map((code: CodeItem) => ({
    label: code.code_name || code.code,
    value: code.code,
  }))
})

const gridTypeOptions = mapStringOptions('GRID_TYPE')

const formatCodeLabel = (group: string, value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === '')
    return ''
  const match = codeBook.getOptions(group).find((code: CodeItem) => code.code === String(value))
  return match?.code_name || String(value)
}

const formatYesNo = (value: string | null | undefined) => {
  if (!value)
    return ''
  return formatCodeLabel('YN_FLAG', value) || (value === 'Y' ? '사용' : '미사용')
}

const showError = (detail: string) => {
  toast.add({
    severity: 'error',
    summary: '오류',
    detail,
    life: 3000,
  })
}

const showSuccess = (detail: string) => {
  toast.add({
    severity: 'success',
    summary: '저장 완료',
    detail,
    life: 2000,
  })
}

// URL 쿼리 파라미터 처리
const querySp = computed(() => {
  const sp = route.query.sp
  if (sp)
    return `sp_adm${String(sp).padStart(3, '0')}`
  const proc = route.query.procedure
  if (proc)
    return String(proc)
  return null
})

const isAutoProcedure = computed(() => !!querySp.value)

watch(() => querySp.value, (newProc) => {
  if (newProc) {
    selectedProcedure.value = newProc
    gridFilterForm.value.procedure = newProc

    if (!availableProcedures.some(p => p.value === newProc)) {
      availableProcedures.push({ label: `${newProc} (자동)`, value: newProc })
    }
    refreshGrids()
  }
}, { immediate: true })

const loadGrids = async () => {
  try {
    const data = await gridsAction.run(async () => {
      const result = await $fetch<{ success: boolean, data: GridMaster[] }>(
        `/api/schema/grids?procedureName=${selectedProcedure.value}`,
      )
      if (!result.success)
        throw new Error('그리드 목록을 불러오지 못했습니다.')
      return result.data || []
    })
    gridList.value = data
  }
  catch (error) {
    console.error('그리드 목록 로드 실패:', error)
    showError('그리드 목록을 불러오는데 실패했습니다.')
  }
}

const refreshGrids = async () => {
  await loadGrids()
}

const gridFilterForm = ref({
  procedure: 'sp_grid_master',
  keyword: '',
})

const resetGridFilter = () => {
  gridFilterForm.value.procedure = 'sp_grid_master'
  gridFilterForm.value.keyword = ''
}

// 타입 안전한 스키마 정의
const gridFilterSchema = computed<FormKitSchema>(() => {
  const fields: FormKitSchema = []

  // 프로시저 선택 (자동 모드가 아닐 때만)
  if (!isAutoProcedure.value) {
    fields.push({
      $formkit: 'primeSelect',
      name: 'procedure',
      label: '프로시저 선택',
      options: availableProcedures,
      optionLabel: 'label',
      optionValue: 'value',
      outerClass: 'col-12 md:col-4',
    })
  }

  // 검색 필드
  fields.push({
    $formkit: 'primeInputText',
    name: 'keyword',
    label: '그리드 검색',
    placeholder: 'ID 또는 이름',
    outerClass: isAutoProcedure.value ? 'col-12 md:col-8' : 'col-12 md:col-4',
  })

  // 버튼 그룹
  fields.push(createButtonGroup(
    [
      { label: '초기화', onClick: resetGridFilter, outlined: true, severity: 'secondary' },
      { label: '조회', onClick: refreshGrids, severity: 'secondary', icon: 'pi pi-search' },
    ],
    'col-12 md:col-4 flex justify-end gap-2',
  ))

  return fields
})

watch(() => gridFilterForm.value.keyword, (keyword) => {
  gridSearch.value = (keyword ?? '').toString()
})

watch(() => gridFilterForm.value.procedure, (procedure) => {
  selectedProcedure.value = procedure || 'sp_grid_master'
})

const filteredGridList = computed(() => {
  if (!gridSearch.value)
    return gridList.value
  const keyword = gridSearch.value.toLowerCase().trim()
  return gridList.value.filter((grid: GridMaster) =>
    grid.grid_id.toLowerCase().includes(keyword)
    || (grid.grid_name || '').toLowerCase().includes(keyword),
  )
})

const gridMasterColumnDefs = computed(() => [
  {
    field: 'grid_id',
    headerName: '그리드 ID',
    minWidth: 200,
    editable: (params: any) => params.data && params.data.__status === 'N',
    cellEditor: 'agTextCellEditor',
    cellEditorPopup: false,
  },
  {
    field: 'grid_name',
    headerName: '그리드명',
    minWidth: 200,
    editable: true,
    cellEditor: 'agTextCellEditor',
    cellEditorPopup: false,
  },
  {
    field: 'grid_type',
    headerName: '타입',
    width: 130,
    editable: true,
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: { values: gridTypeOptions.value.map(opt => opt.value) },
    cellEditorPopup: false,
  },
  {
    field: 'grid_row',
    headerName: '행 수',
    width: 110,
    editable: true,
    cellEditor: 'agNumberCellEditor',
    cellEditorParams: { min: 0 },
    cellEditorPopup: false,
  },
  {
    field: 'use_yn',
    headerName: '사용',
    width: 110,
    editable: true,
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: { values: ['Y', 'N'] },
    valueFormatter: (params: ValueFormatterParams) => formatYesNo(params.value as string),
    cellEditorPopup: false,
  },
])

const handleGridRowClick = (event: RowClickedEvent<GridMaster>) => {
  if (!event.data)
    return
  emit('row-selected', event.data)
}

const onGridMasterSaved = async (result: any) => {
  await loadGrids()
  showSuccess(`${result.added + result.modified + result.deleted}건 저장되었습니다.`)
}

const onSaveError = (error: any) => {
  showError(error.message || '저장 중 오류가 발생했습니다.')
}

onMounted(() => {
  loadGrids()
})
</script>

<template>
  <div class="space-y-6">
    <Card>
      <template #title>
        그리드 검색 · 현황
      </template>
      <template #content>
        <div class="compact-form">
          <FormKitDataEdit
            v-model="gridFilterForm"
            :schema="gridFilterSchema"
            form-class="form-horizontal grid-12"
            submit-label=""
          />
        </div>
      </template>
    </Card>

    <Card>
      <template #title>
        s_grid_master (그리드 기본 정보)
      </template>
      <template #content>
        <ClientOnly>
          <AgGrid
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
            :show-add-row-button="true"
            :show-delete-row-button="true"
            :show-save-button="true"
            save-button-label="저장"
            @row-clicked="handleGridRowClick"
            @saved="onGridMasterSaved"
            @save-error="onSaveError"
          />
          <template #fallback>
            <div class="flex h-36 items-center justify-center text-sm text-gray-500">
              그리드 로딩 중...
            </div>
          </template>
        </ClientOnly>
      </template>
    </Card>
  </div>
</template>
