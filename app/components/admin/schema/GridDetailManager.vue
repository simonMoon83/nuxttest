<script setup lang="ts">
import AgGrid from '~/components/AgGrid.vue'
import type { ValueFormatterParams } from 'ag-grid-community'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { useCodeBook } from '@/composables/useCodeBook'
import { useAuthStore } from '@/stores/auth'
import type { CodeGroup, CodeItem, GridDetail } from '@/types/schema'

const props = defineProps<{
  gridId: string | null
}>()

interface DropdownOption<T = string> {
  label: string
  value: T
}

const toast = useToast()
const authStore = useAuthStore()
const codeBook = useCodeBook()

const gridDetailAction = useAsyncAction()

const loadingGridDetail = gridDetailAction.loading

const gridDetailList = ref<GridDetail[]>([])
const availableCodeGroups = ref<CodeGroup[]>([])

const currentUserId = computed(() => {
  const user = authStore.user
  if (!user)
    return 'admin'
  return user.username || String(user.id)
})

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

const mapStringOptions = (group: string, fallback: DropdownOption[] = []) => computed(() => {
  const codes = codeBook.getOptions(group)
  if (!codes.length)
    return fallback
  return codes.map((code: CodeItem) => ({
    label: code.code_name || code.code,
    value: code.code,
  }))
})

const columnTypeOptions = mapStringOptions('GRID_COLUMN_TYPE')
const fieldSizeOptions = mapStringOptions('GRID_FIELD_SIZE')

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

const loadCodeGroups = async () => {
  try {
    const result = await $fetch<{ success: boolean, data: CodeGroup[] }>('/api/code/groups')
    if (result.success) {
      availableCodeGroups.value = result.data || []
    }
  }
  catch (error) {
    console.error('코드 그룹 로드 실패:', error)
  }
}

const codeGroupOptions = computed(() => availableCodeGroups.value.map((group: CodeGroup) => ({
  label: group.code_grp_name ? `${group.code_grp} - ${group.code_grp_name}` : group.code_grp,
  value: group.code_grp,
})))

const loadGridDetail = async () => {
  if (!props.gridId) {
    gridDetailList.value = []
    return
  }

  try {
    const data = await gridDetailAction.run(async () => {
      const result = await $fetch<{ success: boolean, data: GridDetail[] }>(`/api/schema/grids/${props.gridId}`)
      if (!result.success)
        throw new Error('그리드 상세 정보를 불러오지 못했습니다.')
      return result.data || []
    })
    gridDetailList.value = data
  }
  catch (error) {
    console.error('그리드 상세 로드 실패:', error)
    showError('그리드 상세 정보를 불러오는데 실패했습니다.')
  }
}

watch(() => props.gridId, () => {
  loadGridDetail()
}, { immediate: true })

onMounted(() => {
  loadCodeGroups()
})

const gridDetailColumnDefs = computed(() => [
  {
    field: 'col_seq',
    headerName: '순서',
    width: 100,
    editable: true,
    cellEditor: 'agNumberCellEditor',
    cellEditorParams: { min: 0 },
    cellEditorPopup: false,
  },
  {
    field: 'col_id',
    headerName: '컬럼 ID',
    minWidth: 160,
    editable: (params: any) => params.data && params.data.__status === 'N',
    cellEditor: 'agTextCellEditor',
    cellEditorPopup: false,
  },
  {
    field: 'col_name',
    headerName: '컬럼명',
    minWidth: 160,
    editable: true,
    cellEditor: 'agTextCellEditor',
    cellEditorPopup: false,
  },
  {
    field: 'col_type',
    headerName: '타입',
    width: 120,
    editable: true,
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: { values: columnTypeOptions.value.map(opt => opt.value) },
    cellEditorPopup: false,
  },
  {
    field: 'col_size',
    headerName: '크기',
    width: 110,
    editable: true,
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: { values: fieldSizeOptions.value.map(opt => opt.value) },
    cellEditorPopup: false,
  },
  {
    field: 'col_code',
    headerName: '코드',
    width: 140,
    editable: true,
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: { values: codeGroupOptions.value.map(opt => opt.value) },
    cellEditorPopup: false,
  },
  {
    field: 'col_width',
    headerName: '너비',
    width: 110,
    editable: true,
    cellEditor: 'agNumberCellEditor',
    cellEditorParams: { min: 0 },
    cellEditorPopup: false,
  },
  {
    field: 'col_hide',
    headerName: '숨김',
    width: 100,
    editable: true,
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: { values: [0, 1] },
    valueFormatter: (params: ValueFormatterParams) => (Number(params.value) === 1 ? '숨김' : '표시'),
    cellEditorPopup: false,
  },
  {
    field: 'use_yn',
    headerName: '사용',
    width: 100,
    editable: true,
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: { values: ['Y', 'N'] },
    valueFormatter: (params: ValueFormatterParams) => formatYesNo(params.value as string),
    cellEditorPopup: false,
  },
  {
    field: 'col_flex',
    headerName: 'Flex',
    width: 100,
    editable: true,
    cellEditor: 'agNumberCellEditor',
    cellEditorParams: { min: 0 },
    cellEditorPopup: false,
  },
])

const onGridDetailSaved = async (result: any) => {
  await loadGridDetail()
  showSuccess(`${result.added + result.modified + result.deleted}건 저장되었습니다.`)
}

const onSaveError = (error: any) => {
  showError(error.message || '저장 중 오류가 발생했습니다.')
}
</script>

<template>
  <Card>
    <template #title>
      s_grid_detail (컬럼 상세)
    </template>
    <template #content>
      <ClientOnly>
        <AgGrid
          title="그리드 상세"
          :row-data="gridDetailList"
          :column-defs="gridDetailColumnDefs"
          :editable="true"
          edit-mode="singleClick"
          :row-select="true"
          grid-id="schema_detail"
          procedure-name="sp_grid_info"
          :save-param-fields="['col_id', 'col_name', 'col_seq', 'col_type', 'col_size', 'col_code', 'col_width', 'col_hide', 'col_flex', 'use_yn']"
          :extra-save-params="{ grid_id: props.gridId, user_id: currentUserId }"
          :show-add-row-button="true"
          :show-delete-row-button="true"
          :show-save-button="true"
          save-button-label="저장"
          @saved="onGridDetailSaved"
          @save-error="onSaveError"
        />
        <template #fallback>
          <div class="flex h-36 items-center justify-center text-sm text-gray-500">
            상세 로딩 중...
          </div>
        </template>
      </ClientOnly>
    </template>
  </Card>
</template>
