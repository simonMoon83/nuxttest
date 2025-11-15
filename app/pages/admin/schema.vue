<script setup lang="ts">
import { useStoredProcedure } from '@/composables/useStoredProcedure'
import { useConfirmation } from '@/composables/confirmation'

definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

const toast = useToast()
const { executeProcedure } = useStoredProcedure()
const { confirmAction } = useConfirmation()

// 상태 관리
const loading = ref(false)
const selectedTable = ref<string | null>(null)
const tableList = ref<any[]>([])
const columnList = ref<any[]>([])
const gridList = ref<any[]>([])
const selectedGridId = ref<string | null>(null)
const gridDetailList = ref<any[]>([])

// 메뉴 디스플레이 관리
const menuList = ref<any[]>([])
const selectedMenuId = ref<string | null>(null)
const menuDisplayList = ref<any[]>([])

// 다이얼로그 상태
const showGridMasterDialog = ref(false)
const showGridDetailDialog = ref(false)
const showProcedureDialog = ref(false)
const showProcedureResultDialog = ref(false)
const showMenuDisplayDialog = ref(false)

// 그리드 마스터 폼
const gridMasterForm = ref({
  grid_id: '',
  grid_name: '',
  grid_type: '',
  grid_row: 0,
  use_yn: 'Y'
})
const editingGridMaster = ref<any>(null)

// 그리드 상세 폼
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
  use_yn: 'Y'
})
const editingGridDetail = ref<any>(null)

// 프로시저 생성 폼
const procedureForm = ref({
  sp_id: '',
  sp_name: '',
  table_name: ''
})
const procedureResult = ref<string>('')

// 메뉴 디스플레이 폼
const menuDisplayForm = ref({
  menu_id: '',
  contents_seq: 1,
  contents_type: 'grid',
  contents_header: '',
  grid_id: '',
  save_yn: 'N',
  search_case: 'search',
  save_case: 'save',
  contents_width: 3,
  contents_height: null as number | null
})
const editingMenuDisplay = ref<any>(null)

// 테이블 목록 로드
const loadTables = async () => {
  try {
    loading.value = true
    const result = await $fetch('/api/schema/tables')
    if (result.success) {
      tableList.value = result.data || []
    }
  } catch (error) {
    console.error('테이블 목록 로드 실패:', error)
    toast.add({
      severity: 'error',
      summary: '오류',
      detail: '테이블 목록을 불러오는데 실패했습니다.',
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

// 컬럼 정보 로드
const loadColumns = async (tableName: string) => {
  try {
    loading.value = true
    selectedTable.value = tableName
    const result = await $fetch(`/api/schema/columns?table_name=${tableName}`)
    if (result.success) {
      columnList.value = result.data || []
    }
  } catch (error) {
    console.error('컬럼 정보 로드 실패:', error)
    toast.add({
      severity: 'error',
      summary: '오류',
      detail: '컬럼 정보를 불러오는데 실패했습니다.',
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

// 그리드 마스터 목록 로드
const loadGrids = async () => {
  try {
    loading.value = true
    const result: any = await $fetch('/api/schema/grids')
    if (result.success) {
      gridList.value = result.data || []
    }
  } catch (error) {
    console.error('그리드 목록 로드 실패:', error)
    toast.add({
      severity: 'error',
      summary: '오류',
      detail: '그리드 목록을 불러오는데 실패했습니다.',
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

// 그리드 상세 정보 로드
const loadGridDetail = async (gridId: string) => {
  try {
    loading.value = true
    selectedGridId.value = gridId
    const result: any = await $fetch(`/api/schema/grids/${gridId}`)
    if (result.success) {
      gridDetailList.value = result.data || []
      showGridDetailDialog.value = true
    }
  } catch (error) {
    console.error('그리드 상세 로드 실패:', error)
    toast.add({
      severity: 'error',
      summary: '오류',
      detail: '그리드 상세 정보를 불러오는데 실패했습니다.',
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

// 그리드 마스터 추가
const openAddGridMaster = () => {
  editingGridMaster.value = null
  gridMasterForm.value = {
    grid_id: '',
    grid_name: '',
    grid_type: '',
    grid_row: 0,
    use_yn: 'Y'
  }
  showGridMasterDialog.value = true
}

// 그리드 마스터 수정
const openEditGridMaster = (grid: any) => {
  editingGridMaster.value = grid
  gridMasterForm.value = {
    grid_id: grid.grid_id || '',
    grid_name: grid.grid_name || '',
    grid_type: grid.grid_type || '',
    grid_row: grid.grid_row || 0,
    use_yn: grid.use_yn || 'Y'
  }
  showGridMasterDialog.value = true
}

// 그리드 마스터 저장
const saveGridMaster = async () => {
  try {
    if (!gridMasterForm.value.grid_id || !gridMasterForm.value.grid_name) {
      toast.add({
        severity: 'warn',
        summary: '경고',
        detail: '그리드 ID와 그리드명은 필수입니다.',
        life: 3000
      })
      return
    }

    loading.value = true
    const result = await executeProcedure('sp_adm011', {
      case: 'save',
      grid_id: gridMasterForm.value.grid_id,
      grid_name: gridMasterForm.value.grid_name,
      grid_type: gridMasterForm.value.grid_type || null,
      grid_row: gridMasterForm.value.grid_row || null,
      use_yn: gridMasterForm.value.use_yn || 'Y',
      user_id: 'admin' // TODO: 실제 사용자 ID 사용
    })

    if (result.success) {
      toast.add({
        severity: 'success',
        summary: '성공',
        detail: '그리드 마스터를 저장했습니다.',
        life: 3000
      })
      showGridMasterDialog.value = false
      await loadGrids()
    } else {
      throw new Error(result.error || '저장 실패')
    }
  } catch (error) {
    console.error('그리드 마스터 저장 실패:', error)
    toast.add({
      severity: 'error',
      summary: '오류',
      detail: error instanceof Error ? error.message : '그리드 마스터 저장에 실패했습니다.',
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

// 그리드 마스터 삭제
const deleteGridMaster = (grid: any) => {
  confirmAction(async () => {
    try {
      loading.value = true
      const result = await executeProcedure('sp_adm011', {
        case: 'delete',
        grid_id: grid.grid_id
      })

      if (result.success) {
        toast.add({
          severity: 'success',
          summary: '성공',
          detail: '그리드 마스터를 삭제했습니다.',
          life: 3000
        })
        await loadGrids()
      } else {
        throw new Error(result.error || '삭제 실패')
      }
    } catch (error) {
      console.error('그리드 마스터 삭제 실패:', error)
      toast.add({
        severity: 'error',
        summary: '오류',
        detail: error instanceof Error ? error.message : '그리드 마스터 삭제에 실패했습니다.',
        life: 3000
      })
    } finally {
      loading.value = false
    }
  }, '그리드 마스터 삭제', `정말로 "${grid.grid_name}" 그리드를 삭제하시겠습니까?`, '확인')
}

// 그리드 상세 추가
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
  showGridDetailDialog.value = true
}

// 그리드 상세 수정
const openEditGridDetail = (detail: any) => {
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
}

// 그리드 상세 저장
const saveGridDetail = async () => {
  try {
    if (!selectedGridId.value || !gridDetailForm.value.col_id || !gridDetailForm.value.col_name) {
      toast.add({
        severity: 'warn',
        summary: '경고',
        detail: '그리드 ID, 컬럼 ID, 컬럼명은 필수입니다.',
        life: 3000
      })
      return
    }

    loading.value = true
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
      col_hide: gridDetailForm.value.col_hide || null,
      col_flex: gridDetailForm.value.col_flex || null,
      use_yn: gridDetailForm.value.use_yn || 'Y',
      user_id: 'admin' // TODO: 실제 사용자 ID 사용
    })

    if (result.success) {
      toast.add({
        severity: 'success',
        summary: '성공',
        detail: '그리드 상세를 저장했습니다.',
        life: 3000
      })
      await loadGridDetail(selectedGridId.value)
      editingGridDetail.value = null
    } else {
      throw new Error(result.error || '저장 실패')
    }
  } catch (error) {
    console.error('그리드 상세 저장 실패:', error)
    toast.add({
      severity: 'error',
      summary: '오류',
      detail: error instanceof Error ? error.message : '그리드 상세 저장에 실패했습니다.',
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

// 그리드 상세 삭제
const deleteGridDetail = (detail: any) => {
  if (!selectedGridId.value) return

  confirmAction(async () => {
    try {
      loading.value = true
      const result = await executeProcedure('sp_grid_info', {
        case: 'delete',
        grid_id: selectedGridId.value,
        col_id: detail.col_id
      })

      if (result.success) {
        toast.add({
          severity: 'success',
          summary: '성공',
          detail: '그리드 상세를 삭제했습니다.',
          life: 3000
        })
        if (selectedGridId.value) {
          await loadGridDetail(selectedGridId.value)
        }
      } else {
        throw new Error(result.error || '삭제 실패')
      }
    } catch (error) {
      console.error('그리드 상세 삭제 실패:', error)
      toast.add({
        severity: 'error',
        summary: '오류',
        detail: error instanceof Error ? error.message : '그리드 상세 삭제에 실패했습니다.',
        life: 3000
      })
    } finally {
      loading.value = false
    }
  }, '그리드 상세 삭제', `정말로 "${detail.col_name}" 컬럼을 삭제하시겠습니까?`, '확인')
}

// 프로시저 생성 다이얼로그 열기
const openProcedureDialog = () => {
  procedureForm.value = {
    sp_id: '',
    sp_name: '',
    table_name: selectedTable.value || ''
  }
  showProcedureDialog.value = true
}

// 프로시저 생성
const generateProcedure = async () => {
  try {
    if (!procedureForm.value.sp_id || !procedureForm.value.sp_name || !procedureForm.value.table_name) {
      toast.add({
        severity: 'warn',
        summary: '경고',
        detail: '프로시저 ID, 프로시저명, 테이블명은 필수입니다.',
        life: 3000
      })
      return
    }

    loading.value = true
    const result = await executeProcedure('sp_create_proc', {
      sp_id: procedureForm.value.sp_id,
      sp_name: procedureForm.value.sp_name,
      table_name: procedureForm.value.table_name
    })

    if (result.success && result.data) {
      // 결과를 텍스트로 합치기
      const sqlText = Array.isArray(result.data) 
        ? result.data.map((row: any) => row.txt || '').join('\n')
        : ''
      
      procedureResult.value = sqlText
      showProcedureDialog.value = false
      showProcedureResultDialog.value = true
    } else {
      throw new Error(result.error || '프로시저 생성 실패')
    }
  } catch (error) {
    console.error('프로시저 생성 실패:', error)
    toast.add({
      severity: 'error',
      summary: '오류',
      detail: error instanceof Error ? error.message : '프로시저 생성에 실패했습니다.',
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

// 프로시저 결과 복사
const copyProcedureResult = async () => {
  try {
    await navigator.clipboard.writeText(procedureResult.value)
    toast.add({
      severity: 'success',
      summary: '성공',
      detail: 'SQL 코드가 클립보드에 복사되었습니다.',
      life: 2000
    })
  } catch (error) {
    console.error('복사 실패:', error)
    toast.add({
      severity: 'error',
      summary: '오류',
      detail: '복사에 실패했습니다.',
      life: 3000
    })
  }
}

// 테이블 옵션 (프로시저 생성용)
const tableOptions = computed(() => {
  return tableList.value.map(table => ({
    label: table.table_name,
    value: table.table_name
  }))
})

// 그리드 옵션 (메뉴 디스플레이용)
const gridOptions = computed(() => {
  return gridList.value.map(grid => ({
    label: `${grid.grid_id} - ${grid.grid_name}`,
    value: grid.grid_id
  }))
})

// 메뉴 목록 로드
const loadMenus = async () => {
  try {
    loading.value = true
    const result = await $fetch('/api/menu/admin')
    if (result.success) {
      menuList.value = result.data || []
    }
  } catch (error) {
    console.error('메뉴 목록 로드 실패:', error)
    toast.add({
      severity: 'error',
      summary: '오류',
      detail: '메뉴 목록을 불러오는데 실패했습니다.',
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

// 메뉴 디스플레이 목록 로드
const loadMenuDisplay = async (menuId: string | number) => {
  try {
    loading.value = true
    selectedMenuId.value = String(menuId)
    const result: any = await $fetch(`/api/schema/menu-display?menu_id=${menuId}`)
    if (result.success) {
      menuDisplayList.value = result.data || []
    }
  } catch (error) {
    console.error('메뉴 디스플레이 로드 실패:', error)
    toast.add({
      severity: 'error',
      summary: '오류',
      detail: '메뉴 디스플레이 정보를 불러오는데 실패했습니다.',
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

// 메뉴 디스플레이 추가
const openAddMenuDisplay = () => {
  if (!selectedMenuId.value) {
    toast.add({
      severity: 'warn',
      summary: '경고',
      detail: '메뉴를 먼저 선택해주세요.',
      life: 3000
    })
    return
  }

  editingMenuDisplay.value = null
  menuDisplayForm.value = {
    menu_id: selectedMenuId.value,
    contents_seq: menuDisplayList.value.length + 1,
    contents_type: 'grid',
    contents_header: '',
    grid_id: '',
    save_yn: 'N',
    search_case: 'search',
    save_case: 'save',
    contents_width: 3,
    contents_height: null
  }
  showMenuDisplayDialog.value = true
}

// 메뉴 디스플레이 수정
const openEditMenuDisplay = (display: any) => {
  editingMenuDisplay.value = display
  menuDisplayForm.value = {
    menu_id: display.menu_id || '',
    contents_seq: display.contents_seq || 1,
    contents_type: display.contents_type || 'grid',
    contents_header: display.contents_header || '',
    grid_id: display.grid_id || '',
    save_yn: display.save_yn || 'N',
    search_case: display.search_case || 'search',
    save_case: display.save_case || 'save',
    contents_width: display.contents_width || 3,
    contents_height: display.contents_height || null
  }
  showMenuDisplayDialog.value = true
}

// 메뉴 디스플레이 저장
const saveMenuDisplay = async () => {
  try {
    if (!menuDisplayForm.value.menu_id || !menuDisplayForm.value.contents_seq) {
      toast.add({
        severity: 'warn',
        summary: '경고',
        detail: '메뉴 ID와 표시 순서는 필수입니다.',
        life: 3000
      })
      return
    }

    loading.value = true
    const result = await $fetch('/api/schema/menu-display', {
      method: 'POST',
      body: menuDisplayForm.value
    })

    if (result.success) {
      toast.add({
        severity: 'success',
        summary: '성공',
        detail: result.message || '메뉴 디스플레이를 저장했습니다.',
        life: 3000
      })
      showMenuDisplayDialog.value = false
      await loadMenuDisplay(menuDisplayForm.value.menu_id)
    } else {
      throw new Error('저장 실패')
    }
  } catch (error) {
    console.error('메뉴 디스플레이 저장 실패:', error)
    toast.add({
      severity: 'error',
      summary: '오류',
      detail: error instanceof Error ? error.message : '메뉴 디스플레이 저장에 실패했습니다.',
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

// 메뉴 디스플레이 삭제
const deleteMenuDisplay = (display: any) => {
  confirmAction(async () => {
    try {
      loading.value = true
      const result = await $fetch(`/api/schema/menu-display?menu_id=${display.menu_id}&contents_seq=${display.contents_seq}`, {
        method: 'DELETE'
      })

      if (result.success) {
        toast.add({
          severity: 'success',
          summary: '성공',
          detail: '메뉴 디스플레이를 삭제했습니다.',
          life: 3000
        })
        await loadMenuDisplay(display.menu_id)
      } else {
        throw new Error('삭제 실패')
      }
    } catch (error) {
      console.error('메뉴 디스플레이 삭제 실패:', error)
      toast.add({
        severity: 'error',
        summary: '오류',
        detail: error instanceof Error ? error.message : '메뉴 디스플레이 삭제에 실패했습니다.',
        life: 3000
      })
    } finally {
      loading.value = false
    }
  }, '메뉴 디스플레이 삭제', `정말로 이 구성을 삭제하시겠습니까?`, '확인')
}

onMounted(() => {
  loadTables()
  loadGrids()
  loadMenus()
})
</script>

<template>
  <div class="p-6">
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">스키마 관리</h1>
      <p class="text-gray-600 dark:text-gray-400">데이터베이스 테이블 스키마를 조회하고 그리드 스키마를 관리합니다.</p>
    </div>

    <!-- 테이블 및 컬럼 정보 섹션 -->
    <div class="grid grid-cols-2 gap-4 mb-6">
      <!-- 테이블 목록 -->
      <Card>
        <template #title>테이블 목록</template>
        <template #content>
          <DataTable 
            :value="tableList" 
            :loading="loading"
            selection-mode="single"
            v-model:selection="selectedTable"
            @row-select="(e) => loadColumns(e.data.table_name)"
            class="p-datatable-sm"
            :paginator="true"
            :rows="20"
          >
            <Column field="table_name" header="테이블명" sortable />
            <Column field="table_schema" header="스키마" sortable />
          </DataTable>
        </template>
      </Card>

      <!-- 컬럼 정보 -->
      <Card>
        <template #title>
          컬럼 정보 
          <span v-if="selectedTable" class="text-sm text-gray-500">({{ selectedTable }})</span>
        </template>
        <template #content>
          <DataTable 
            :value="columnList" 
            :loading="loading"
            class="p-datatable-sm"
            :paginator="true"
            :rows="20"
          >
            <Column field="column_name" header="컬럼명" sortable />
            <Column field="data_type" header="타입" sortable />
            <Column field="is_nullable" header="NULL" sortable>
              <template #body="slotProps">
                <Tag :value="slotProps.data.is_nullable === 'YES' ? 'Y' : 'N'" 
                     :severity="slotProps.data.is_nullable === 'YES' ? 'info' : 'secondary'" />
              </template>
            </Column>
            <Column field="is_primary_key" header="PK">
              <template #body="slotProps">
                <Tag v-if="slotProps.data.is_primary_key" value="PK" severity="success" />
              </template>
            </Column>
            <Column field="is_identity" header="Identity">
              <template #body="slotProps">
                <Tag v-if="slotProps.data.is_identity" value="ID" severity="info" />
              </template>
            </Column>
          </DataTable>
        </template>
      </Card>
    </div>

    <!-- 그리드 관리 섹션 -->
    <Card>
      <template #title>그리드 스키마 관리</template>
      <template #content>
        <div class="mb-4 flex gap-2">
          <Button label="그리드 추가" icon="pi pi-plus" @click="openAddGridMaster" />
          <Button label="프로시저 생성" icon="pi pi-code" @click="openProcedureDialog" 
                  :disabled="!selectedTable" />
        </div>

        <DataTable 
          :value="gridList" 
          :loading="loading"
          class="p-datatable-sm"
          selection-mode="single"
          v-model:selection="selectedGridId"
          @row-select="(e) => loadGridDetail(e.data.grid_id)"
        >
          <Column field="grid_id" header="그리드 ID" sortable />
          <Column field="grid_name" header="그리드명" sortable />
          <Column field="grid_type" header="타입" sortable />
          <Column field="grid_row" header="행 수" sortable />
          <Column field="use_yn" header="사용" sortable>
            <template #body="slotProps">
              <Tag :value="slotProps.data.use_yn === 'Y' ? '사용' : '미사용'" 
                   :severity="slotProps.data.use_yn === 'Y' ? 'success' : 'danger'" />
            </template>
          </Column>
          <Column header="작업">
            <template #body="slotProps">
              <div class="flex gap-2">
                <Button 
                  icon="pi pi-pencil" 
                  size="small"
                  severity="info"
                  @click="openEditGridMaster(slotProps.data)"
                  v-tooltip.top="'수정'"
                />
                <Button 
                  icon="pi pi-eye" 
                  size="small"
                  severity="secondary"
                  @click="loadGridDetail(slotProps.data.grid_id)"
                  v-tooltip.top="'상세보기'"
                />
                <Button 
                  icon="pi pi-trash" 
                  size="small"
                  severity="danger"
                  @click="deleteGridMaster(slotProps.data)"
                  v-tooltip.top="'삭제'"
                />
              </div>
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>

    <!-- 그리드 마스터 다이얼로그 -->
    <Dialog 
      v-model:visible="showGridMasterDialog" 
      :header="editingGridMaster ? '그리드 마스터 수정' : '그리드 마스터 추가'"
      :style="{ width: '500px' }"
      modal
    >
      <div class="space-y-4">
        <div class="field">
          <label for="grid_id" class="block text-sm font-medium mb-2">그리드 ID *</label>
          <InputText 
            id="grid_id"
            v-model="gridMasterForm.grid_id" 
            placeholder="예: menu5_search"
            class="w-full"
            :disabled="!!editingGridMaster"
          />
        </div>

        <div class="field">
          <label for="grid_name" class="block text-sm font-medium mb-2">그리드명 *</label>
          <InputText 
            id="grid_name"
            v-model="gridMasterForm.grid_name" 
            placeholder="그리드명을 입력하세요"
            class="w-full"
          />
        </div>

        <div class="field">
          <label for="grid_type" class="block text-sm font-medium mb-2">타입</label>
          <InputText 
            id="grid_type"
            v-model="gridMasterForm.grid_type" 
            placeholder="그리드 타입"
            class="w-full"
          />
        </div>

        <div class="field">
          <label for="grid_row" class="block text-sm font-medium mb-2">행 수</label>
          <InputNumber 
            id="grid_row"
            v-model="gridMasterForm.grid_row" 
            :min="0"
            class="w-full"
          />
        </div>

        <div class="field">
          <label for="use_yn" class="block text-sm font-medium mb-2">사용 여부</label>
          <Dropdown 
            id="use_yn"
            v-model="gridMasterForm.use_yn" 
            :options="[{ label: '사용', value: 'Y' }, { label: '미사용', value: 'N' }]"
            optionLabel="label"
            optionValue="value"
            class="w-full"
          />
        </div>
      </div>

      <template #footer>
        <Button label="취소" icon="pi pi-times" @click="showGridMasterDialog = false" class="p-button-text" />
        <Button label="저장" icon="pi pi-check" @click="saveGridMaster" :loading="loading" />
      </template>
    </Dialog>

    <!-- 그리드 상세 다이얼로그 -->
    <Dialog 
      v-model:visible="showGridDetailDialog" 
      :header="`그리드 상세 관리 (${selectedGridId})`"
      :style="{ width: '1200px' }"
      modal
    >
      <div class="mb-4">
        <Button label="컬럼 추가" icon="pi pi-plus" @click="openAddGridDetail" />
      </div>

      <DataTable 
        :value="gridDetailList" 
        :loading="loading"
        class="p-datatable-sm"
        :paginator="true"
        :rows="20"
      >
        <Column field="col_seq" header="순서" sortable />
        <Column field="col_id" header="컬럼 ID" sortable />
        <Column field="col_name" header="컬럼명" sortable />
        <Column field="col_type" header="타입" sortable />
        <Column field="col_size" header="크기" sortable />
        <Column field="col_code" header="코드" sortable />
        <Column field="use_yn" header="사용" sortable>
          <template #body="slotProps">
            <Tag :value="slotProps.data.use_yn === 'Y' ? '사용' : '미사용'" 
                 :severity="slotProps.data.use_yn === 'Y' ? 'success' : 'danger'" />
          </template>
        </Column>
        <Column header="작업">
          <template #body="slotProps">
            <div class="flex gap-2">
              <Button 
                icon="pi pi-pencil" 
                size="small"
                severity="info"
                @click="openEditGridDetail(slotProps.data)"
                v-tooltip.top="'수정'"
              />
              <Button 
                icon="pi pi-trash" 
                size="small"
                severity="danger"
                @click="deleteGridDetail(slotProps.data)"
                v-tooltip.top="'삭제'"
              />
            </div>
          </template>
        </Column>
      </DataTable>

      <!-- 그리드 상세 편집 폼 (인라인) -->
      <div v-if="editingGridDetail" class="mt-4 p-4 border border-gray-300 dark:border-gray-700 rounded">
        <h5 class="mb-3">컬럼 편집</h5>
        <div class="grid grid-cols-2 gap-4">
          <div class="field">
            <label class="block text-sm font-medium mb-2">컬럼 ID *</label>
            <InputText v-model="gridDetailForm.col_id" class="w-full" />
          </div>
          <div class="field">
            <label class="block text-sm font-medium mb-2">컬럼명 *</label>
            <InputText v-model="gridDetailForm.col_name" class="w-full" />
          </div>
          <div class="field">
            <label class="block text-sm font-medium mb-2">순서</label>
            <InputNumber v-model="gridDetailForm.col_seq" :min="0" class="w-full" />
          </div>
          <div class="field">
            <label class="block text-sm font-medium mb-2">타입</label>
            <InputText v-model="gridDetailForm.col_type" class="w-full" placeholder="예: InputText, Select" />
          </div>
          <div class="field">
            <label class="block text-sm font-medium mb-2">크기</label>
            <InputText v-model="gridDetailForm.col_size" class="w-full" placeholder="예: col-4" />
          </div>
          <div class="field">
            <label class="block text-sm font-medium mb-2">코드</label>
            <InputText v-model="gridDetailForm.col_code" class="w-full" placeholder="코드 그룹" />
          </div>
          <div class="field">
            <label class="block text-sm font-medium mb-2">너비</label>
            <InputNumber v-model="gridDetailForm.col_width" :min="0" class="w-full" />
          </div>
          <div class="field">
            <label class="block text-sm font-medium mb-2">숨김</label>
            <InputNumber v-model="gridDetailForm.col_hide" :min="0" :max="1" class="w-full" />
          </div>
          <div class="field">
            <label class="block text-sm font-medium mb-2">Flex</label>
            <InputNumber v-model="gridDetailForm.col_flex" :min="0" class="w-full" />
          </div>
          <div class="field">
            <label class="block text-sm font-medium mb-2">사용 여부</label>
            <Dropdown 
              v-model="gridDetailForm.use_yn" 
              :options="[{ label: '사용', value: 'Y' }, { label: '미사용', value: 'N' }]"
              optionLabel="label"
              optionValue="value"
              class="w-full"
            />
          </div>
        </div>
        <div class="mt-4 flex gap-2">
          <Button label="저장" icon="pi pi-check" @click="saveGridDetail" :loading="loading" />
          <Button label="취소" icon="pi pi-times" @click="editingGridDetail = null" severity="secondary" />
        </div>
      </div>

      <template #footer>
        <Button label="닫기" icon="pi pi-times" @click="showGridDetailDialog = false" />
      </template>
    </Dialog>

    <!-- 프로시저 생성 다이얼로그 -->
    <Dialog 
      v-model:visible="showProcedureDialog" 
      header="프로시저 생성"
      :style="{ width: '600px' }"
      modal
    >
      <div class="space-y-4">
        <div class="field">
          <label for="sp_id" class="block text-sm font-medium mb-2">프로시저 ID *</label>
          <InputText 
            id="sp_id"
            v-model="procedureForm.sp_id" 
            placeholder="예: sp_user_info"
            class="w-full"
          />
        </div>

        <div class="field">
          <label for="sp_name" class="block text-sm font-medium mb-2">프로시저명 *</label>
          <InputText 
            id="sp_name"
            v-model="procedureForm.sp_name" 
            placeholder="예: 유저 정보 관리"
            class="w-full"
          />
        </div>

        <div class="field">
          <label for="table_name" class="block text-sm font-medium mb-2">테이블명 *</label>
          <Dropdown 
            id="table_name"
            v-model="procedureForm.table_name" 
            :options="tableOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="테이블 선택"
            class="w-full"
            filter
          />
        </div>
      </div>

      <template #footer>
        <Button label="취소" icon="pi pi-times" @click="showProcedureDialog = false" class="p-button-text" />
        <Button label="생성" icon="pi pi-code" @click="generateProcedure" :loading="loading" />
      </template>
    </Dialog>

    <!-- 프로시저 생성 결과 다이얼로그 -->
    <Dialog 
      v-model:visible="showProcedureResultDialog" 
      header="생성된 프로시저 SQL"
      :style="{ width: '900px' }"
      modal
    >
      <div class="mb-4">
        <Textarea 
          v-model="procedureResult" 
          :rows="30"
          class="w-full font-mono text-sm"
          readonly
        />
      </div>

      <template #footer>
        <Button label="복사" icon="pi pi-copy" @click="copyProcedureResult" />
        <Button label="닫기" icon="pi pi-times" @click="showProcedureResultDialog = false" />
      </template>
    </Dialog>

    <!-- 메뉴 디스플레이 관리 섹션 -->
    <Card>
      <template #title>메뉴 화면 구성 관리</template>
      <template #content>
        <div class="mb-4 flex gap-2">
          <Button label="구성 추가" icon="pi pi-plus" @click="openAddMenuDisplay" 
                  :disabled="!selectedMenuId" />
        </div>

        <div class="grid grid-cols-2 gap-4 mb-4">
          <!-- 메뉴 목록 -->
          <div>
            <label class="block text-sm font-medium mb-2">메뉴 선택</label>
            <DataTable 
              :value="menuList" 
              :loading="loading"
              selection-mode="single"
              v-model:selection="selectedMenuId"
              @row-select="(e) => {
                const menuId = e.data.id || e.data.menu_id
                if (menuId) loadMenuDisplay(String(menuId))
              }"
              class="p-datatable-sm"
              :paginator="true"
              :rows="10"
            >
              <Column field="title" header="메뉴명" sortable />
              <Column field="id" header="메뉴 ID" sortable>
                <template #body="slotProps">
                  {{ slotProps.data.id || slotProps.data.menu_id }}
                </template>
              </Column>
            </DataTable>
          </div>

          <!-- 메뉴 디스플레이 구성 -->
          <div>
            <label class="block text-sm font-medium mb-2">
              화면 구성 
              <span v-if="selectedMenuId" class="text-sm text-gray-500">({{ selectedMenuId }})</span>
            </label>
            <DataTable 
              :value="menuDisplayList" 
              :loading="loading"
              class="p-datatable-sm"
            >
              <Column field="contents_seq" header="순서" sortable />
              <Column field="contents_type" header="타입" sortable>
                <template #body="slotProps">
                  <Tag :value="slotProps.data.contents_type" 
                       :severity="slotProps.data.contents_type === 'grid' ? 'info' : 'success'" />
                </template>
              </Column>
              <Column field="contents_header" header="제목" sortable />
              <Column field="grid_id" header="그리드 ID" sortable />
              <Column field="save_yn" header="저장" sortable>
                <template #body="slotProps">
                  <Tag :value="slotProps.data.save_yn === 'Y' ? '가능' : '불가'" 
                       :severity="slotProps.data.save_yn === 'Y' ? 'success' : 'secondary'" />
                </template>
              </Column>
              <Column header="작업">
                <template #body="slotProps">
                  <div class="flex gap-2">
                    <Button 
                      icon="pi pi-pencil" 
                      size="small"
                      severity="info"
                      @click="openEditMenuDisplay(slotProps.data)"
                      v-tooltip.top="'수정'"
                    />
                    <Button 
                      icon="pi pi-trash" 
                      size="small"
                      severity="danger"
                      @click="deleteMenuDisplay(slotProps.data)"
                      v-tooltip.top="'삭제'"
                    />
                  </div>
                </template>
              </Column>
            </DataTable>
          </div>
        </div>
      </template>
    </Card>

    <!-- 메뉴 디스플레이 다이얼로그 -->
    <Dialog 
      v-model:visible="showMenuDisplayDialog" 
      :header="editingMenuDisplay ? '메뉴 화면 구성 수정' : '메뉴 화면 구성 추가'"
      :style="{ width: '700px' }"
      modal
    >
      <div class="space-y-4">
        <div class="field">
          <label for="menu_id_display" class="block text-sm font-medium mb-2">메뉴 ID *</label>
          <InputText 
            id="menu_id_display"
            v-model="menuDisplayForm.menu_id" 
            placeholder="예: ADM011"
            class="w-full"
            :disabled="!!editingMenuDisplay"
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="field">
            <label for="contents_seq" class="block text-sm font-medium mb-2">표시 순서 *</label>
            <InputNumber 
              id="contents_seq"
              v-model="menuDisplayForm.contents_seq" 
              :min="1"
              class="w-full"
            />
          </div>

          <div class="field">
            <label for="contents_type" class="block text-sm font-medium mb-2">컨텐츠 타입 *</label>
            <Dropdown 
              id="contents_type"
              v-model="menuDisplayForm.contents_type" 
              :options="[{ label: '그리드', value: 'grid' }, { label: '카드', value: 'card' }]"
              optionLabel="label"
              optionValue="value"
              class="w-full"
            />
          </div>
        </div>

        <div class="field">
          <label for="contents_header" class="block text-sm font-medium mb-2">제목</label>
          <InputText 
            id="contents_header"
            v-model="menuDisplayForm.contents_header" 
            placeholder="화면 제목"
            class="w-full"
          />
        </div>

        <div class="field">
          <label for="grid_id_display" class="block text-sm font-medium mb-2">그리드 ID</label>
          <Dropdown 
            id="grid_id_display"
            v-model="menuDisplayForm.grid_id" 
            :options="gridOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="그리드 선택 (schema.vue에서 설정한 그리드)"
            class="w-full"
            filter
            showClear
          />
          <small class="text-gray-500">schema.vue에서 설정한 그리드 ID를 선택하세요</small>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="field">
            <label for="search_case" class="block text-sm font-medium mb-2">검색 Case</label>
            <InputText 
              id="search_case"
              v-model="menuDisplayForm.search_case" 
              placeholder="예: search"
              class="w-full"
            />
          </div>

          <div class="field">
            <label for="save_case" class="block text-sm font-medium mb-2">저장 Case</label>
            <InputText 
              id="save_case"
              v-model="menuDisplayForm.save_case" 
              placeholder="예: save"
              class="w-full"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="field">
            <label for="save_yn_display" class="block text-sm font-medium mb-2">저장 가능</label>
            <Dropdown 
              id="save_yn_display"
              v-model="menuDisplayForm.save_yn" 
              :options="[{ label: '가능', value: 'Y' }, { label: '불가', value: 'N' }]"
              optionLabel="label"
              optionValue="value"
              class="w-full"
            />
          </div>

          <div class="field">
            <label for="contents_width" class="block text-sm font-medium mb-2">너비 (카드용)</label>
            <InputNumber 
              id="contents_width"
              v-model="menuDisplayForm.contents_width" 
              :min="1"
              :max="12"
              class="w-full"
            />
          </div>
        </div>
      </div>

      <template #footer>
        <Button label="취소" icon="pi pi-times" @click="showMenuDisplayDialog = false" class="p-button-text" />
        <Button label="저장" icon="pi pi-check" @click="saveMenuDisplay" :loading="loading" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.field {
  margin-bottom: 1rem;
}
</style>

