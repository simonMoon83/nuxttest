<script setup lang="ts">
import AgGrid from '~/components/AgGrid.vue'
import type { RowClickedEvent } from 'ag-grid-community'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { useAuthStore } from '@/stores/auth'
import type { MenuDisplayEntry } from '@/types/schema'

const props = defineProps<{
  menuId: string | null
}>()

const toast = useToast()
const authStore = useAuthStore()

const menuDisplayAction = useAsyncAction()
const menuDisplaySaver = useAsyncAction()

const loadingMenuDisplay = menuDisplayAction.loading
const savingMenuDisplay = menuDisplaySaver.loading

const menuDisplayList = ref<MenuDisplayEntry[]>([])

const currentUserId = computed(() => {
  const user = authStore.user
  if (!user) return 'admin'
  return user.username || String(user.id)
})

const handleError = (detail: string) => {
  toast.add({
    severity: 'error',
    summary: '오류',
    detail,
    life: 3000
  })
}

const loadMenuDisplay = async () => {
  if (!props.menuId) {
    menuDisplayList.value = []
    return
  }
  
  try {
    const data = await menuDisplayAction.run(async () => {
      const result = await $fetch<{ success: boolean, data: MenuDisplayEntry[] }>(`/api/display/${props.menuId}`)
      if (!result.success) throw new Error('메뉴 화면 구성을 불러오지 못했습니다.')
      return result.data || []
    })
    menuDisplayList.value = data
    
    if (data.length === 0) {
      toast.add({
        severity: 'info',
        summary: '조회 완료',
        detail: `${props.menuId}에 대한 메뉴 화면 구성이 없습니다.`,
        life: 3000
      })
    }
  } catch (error) {
    console.error('메뉴 화면 구성 로드 실패:', error)
    handleError('메뉴 화면 구성을 불러오는데 실패했습니다.')
    menuDisplayList.value = []
  }
}

watch(() => props.menuId, () => {
  loadMenuDisplay()
}, { immediate: true })

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

const onMenuDisplaySaved = async (result: any) => {
  await loadMenuDisplay()
  toast.add({
    severity: 'success',
    summary: '저장 완료',
    detail: `${result.added + result.modified + result.deleted}건 저장되었습니다.`,
    life: 2000
  })
}

const onSaveError = (error: any) => {
  toast.add({
    severity: 'error',
    summary: '저장 실패',
    detail: error.message || '저장 중 오류가 발생했습니다.',
    life: 3000
  })
}
</script>

<template>
  <Card>
    <template #title>s_menu_display (메뉴 화면 구성)</template>
    <template #content>
      <ClientOnly>
        <AgGrid
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
          @saved="onMenuDisplaySaved"
          @save-error="onSaveError"
        />
        <template #fallback>
          <div class="flex h-36 items-center justify-center text-sm text-gray-500">메뉴 화면 구성 로딩 중...</div>
        </template>
      </ClientOnly>
    </template>
  </Card>
</template>
