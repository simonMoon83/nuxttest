<template>
  <div class="p-6">
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">메뉴 관리 (AG-Grid)</h1>
      <p class="text-gray-600">AG-Grid를 사용한 메뉴 관리 시스템입니다.</p>
    </div>

    <!-- 액션 버튼들 -->
    <div class="mb-4 flex gap-2">
      <Button 
        icon="pi pi-plus" 
        label="새 메뉴 추가" 
        @click="showAddDialog = true"
        class="p-button-success"
      />
      <Button 
        icon="pi pi-refresh" 
        label="새로고침" 
        @click="refreshMenuData"
        class="p-button-info"
      />
      <Button 
        icon="pi pi-expand" 
        label="모두 펼치기" 
        @click="expandAll"
        class="p-button-secondary"
      />
      <Button 
        icon="pi pi-compress" 
        label="모두 접기" 
        @click="collapseAll"
        class="p-button-secondary"
      />
    </div>

    <!-- AG-Grid -->
    <Card>
      <template #content>
        <div class="mb-4">
          <p class="text-sm text-gray-600">
            데이터 개수: {{ rowData.length }}개 | 로딩 상태: {{ loading ? '로딩 중...' : '완료' }}
          </p>
        </div>
        
        <!-- AG-Grid는 SSR을 지원하지 않으므로 ClientOnly로 감싸줍니다. -->
        <ClientOnly>
          <div class="ag-theme-quartz" style="height: 600px; width: 100%;">
            <AgGridVue
              ref="agGrid"
              :row-data="rowData"
              :column-defs="columnDefs"
              :default-col-def="defaultColDef"
              :animate-rows="true"
              theme="legacy"
              style="width: 100%; height: 100%;"
              @grid-ready="onGridReady"
              @cell-clicked="onCellClicked"
            />
          </div>
          <template #fallback>
            <!-- 클라이언트 렌더링 대기 중에 보여줄 내용 -->
            <p>Loading grid...</p>
          </template>
        </ClientOnly>
      </template>
    </Card>

    <!-- 메뉴 추가/수정 다이얼로그 -->
    <Dialog 
      v-model:visible="showAddDialog" 
      :header="editingMenu ? '메뉴 수정' : '메뉴 추가'"
      :style="{ width: '500px' }"
      modal
    >
      <div class="space-y-4">
        <!-- 구분선 체크박스 -->
        <div class="field">
          <Checkbox 
            v-model="menuForm.is_separator" 
            :binary="true"
            inputId="is_separator"
          />
          <label for="is_separator" class="ml-2">구분선</label>
        </div>

        <!-- 일반 메뉴 필드들 -->
        <div v-if="!menuForm.is_separator" class="space-y-4">
          <div class="field">
            <label for="title" class="block text-sm font-medium mb-2">제목 *</label>
            <InputText 
              id="title"
              v-model="menuForm.title" 
              placeholder="메뉴 제목을 입력하세요"
              class="w-full"
              :class="{ 'p-invalid': !menuForm.title }"
            />
          </div>

          <div class="field">
            <label for="href" class="block text-sm font-medium mb-2">링크</label>
            <InputText 
              id="href"
              v-model="menuForm.href" 
              placeholder="/path/to/page"
              class="w-full"
            />
          </div>

          <div class="field">
            <label for="icon" class="block text-sm font-medium mb-2">아이콘</label>
            <InputText 
              id="icon"
              v-model="menuForm.icon" 
              placeholder="pi pi-home"
              class="w-full"
            />
            <small class="text-gray-500">PrimeIcons 클래스명을 입력하세요 (예: pi pi-home)</small>
          </div>

          <div class="field">
            <label for="parent_id" class="block text-sm font-medium mb-2">상위 메뉴</label>
            <Dropdown 
              id="parent_id"
              v-model="menuForm.parent_id" 
              :options="parentMenuOptions"
              option-label="label"
              option-value="value"
              placeholder="상위 메뉴 선택 (없으면 최상위)"
              class="w-full"
              show-clear
            />
          </div>

          <div class="field">
            <label for="sort_order" class="block text-sm font-medium mb-2">정렬 순서</label>
            <InputNumber 
              id="sort_order"
              v-model="menuForm.sort_order" 
              :min="0"
              :max="999"
              class="w-full"
            />
          </div>
        </div>
      </div>

      <template #footer>
        <Button 
          label="취소" 
          icon="pi pi-times" 
          @click="closeDialog"
          class="p-button-text"
        />
        <Button 
          :label="editingMenu ? '수정' : '추가'" 
          icon="pi pi-check" 
          @click="saveMenu"
          :loading="saving"
        />
      </template>
    </Dialog>

    <!-- 삭제 확인 다이얼로그 -->
    <Dialog 
      v-model:visible="showDeleteDialog" 
      header="메뉴 삭제" 
      :style="{ width: '400px' }"
      modal
    >
      <div class="flex items-center gap-3">
        <i class="pi pi-exclamation-triangle text-red-500 text-2xl"></i>
        <span>정말로 이 메뉴를 삭제하시겠습니까?</span>
      </div>
      
      <template #footer>
        <Button 
          label="취소" 
          icon="pi pi-times" 
          @click="showDeleteDialog = false"
          class="p-button-text"
        />
        <Button 
          label="삭제" 
          icon="pi pi-trash" 
          severity="danger"
          @click="confirmDelete"
          :loading="deleting"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
// @ts-ignore
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'
// @ts-ignore
import { AgGridVue } from 'ag-grid-vue3'
import { ref, computed, onMounted } from 'vue'
// AG-Grid CSS 파일들 임포트
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'

// AG-Grid 모듈 등록
ModuleRegistry.registerModules([AllCommunityModule])

interface MenuData {
  id: number
  title: string
  href: string
  icon: string
  parent_id: number | null
  sort_order: number
  is_separator: boolean
  is_active: boolean
  path?: string[]
  orgHierarchy?: string[]
}

// 페이지 메타데이터
definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

// 상태 관리
const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const showAddDialog = ref(false)
const showDeleteDialog = ref(false)
const editingMenu = ref<MenuData | null>(null)
const deletingMenu = ref<MenuData | null>(null)

// AG-Grid 관련
const agGrid = ref()
const gridApi = ref()

// 메뉴 데이터
const menuData = ref<MenuData[]>([])
const rowData = ref<MenuData[]>([])

// 폼 데이터
const menuForm = ref({
  title: '',
  href: '',
  icon: '',
  parent_id: null as number | null,
  sort_order: 0,
  is_separator: false
})

// AG-Grid 기본 컬럼 설정
const defaultColDef = ref({
  flex: 1,
  minWidth: 100,
  resizable: true,
  sortable: true,
  filter: true,
})

// AG-Grid 컬럼 정의
const columnDefs = ref([
  {
    field: 'title',
    headerName: '제목',
    cellRenderer: (params: any) => {
      if (params.data?.is_separator) {
        return '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">구분선</span>'
      }
      const icon = params.data?.icon ? `<i class="${params.data.icon}" style="margin-right: 8px;"></i>` : ''
      const indent = (params.data?.orgHierarchy?.length || 1) - 1
      const indentStyle = `margin-left: ${indent * 20}px;`
      return `<div style="${indentStyle}">${icon}${params.data?.title || ''}</div>`
    },
    flex: 2,
    minWidth: 250
  },
  {
    field: 'href',
    headerName: '링크',
    cellRenderer: (params: any) => {
      if (!params.value) return ''
      return `<code style="font-size: 12px; background: #f3f4f6; color: #374151; padding: 4px 8px; border-radius: 4px;">${params.value}</code>`
    },
    flex: 2,
    minWidth: 200
  },
  {
    field: 'sort_order',
    headerName: '순서',
    width: 100,
    cellStyle: { textAlign: 'center' }
  },
  {
    field: 'is_active',
    headerName: '활성화',
    width: 120,
    cellRenderer: (params: any) => {
      const isActive = params.value
      const label = isActive ? '활성' : '비활성'
      const bgColor = isActive ? '#dcfce7' : '#fee2e2'
      const textColor = isActive ? '#166534' : '#991b1b'
      return `<span style="display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 9999px; font-size: 12px; font-weight: 500; background-color: ${bgColor}; color: ${textColor};">${label}</span>`
    },
    cellStyle: { textAlign: 'center' }
  },
  {
    headerName: '작업',
    width: 200,
    cellRenderer: (params: any) => {
      return `
        <div style="display: flex; gap: 4px;">
          <button class="edit-btn" style="padding: 4px 8px; font-size: 12px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;" data-id="${params.data.id}">
            <i class="pi pi-pencil"></i> 수정
          </button>
          <button class="add-child-btn" style="padding: 4px 8px; font-size: 12px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer;" data-id="${params.data.id}">
            <i class="pi pi-plus"></i> 하위
          </button>
          <button class="delete-btn" style="padding: 4px 8px; font-size: 12px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer;" data-id="${params.data.id}">
            <i class="pi pi-trash"></i> 삭제
          </button>
        </div>
      `
    },
    cellStyle: { textAlign: 'center' },
    pinned: 'right'
  }
])

// 상위 메뉴 옵션
const parentMenuOptions = computed(() => {
  return [
    { label: '최상위 메뉴', value: null },
    ...menuData.value
      .filter(menu => !menu.is_separator && menu.parent_id === null)
      .map(menu => ({
        label: menu.title,
        value: menu.id
      }))
  ]
})

// AG-Grid 이벤트 핸들러
const onGridReady = (params: any) => {
  gridApi.value = params.api
  console.log('Grid ready, rowData:', rowData.value)
}

const onCellClicked = (event: any) => {
  const target = event.event.target
  const menuId = parseInt(target.dataset.id)
  const menu = menuData.value.find(m => m.id === menuId)
  
  if (!menu) return
  
  if (target.classList.contains('edit-btn')) {
    editMenu(menu)
  } else if (target.classList.contains('add-child-btn')) {
    addChildMenu(menu)
  } else if (target.classList.contains('delete-btn')) {
    deleteMenu(menu)
  }
}

// 계층 구조 생성 함수
const buildHierarchy = (menu: MenuData): string[] => {
  const hierarchy: string[] = []
  let current = menu
  
  while (current) {
    hierarchy.unshift(current.title || `메뉴-${current.id}`)
    if (current.parent_id === null) break
    current = menuData.value.find(m => m.id === current.parent_id)!
  }
  
  return hierarchy
}

// 메뉴 데이터를 계층 순서로 정렬
const sortMenuHierarchy = (menus: MenuData[]): MenuData[] => {
  const result: MenuData[] = []
  
  // 최상위 메뉴들을 먼저 추가
  const rootMenus = menus
    .filter(menu => menu.parent_id === null)
    .sort((a, b) => a.sort_order - b.sort_order)
  
  const addMenuAndChildren = (menu: MenuData) => {
    result.push(menu)
    
    // 자식 메뉴들을 찾아서 추가
    const children = menus
      .filter(child => child.parent_id === menu.id)
      .sort((a, b) => a.sort_order - b.sort_order)
    
    children.forEach(child => addMenuAndChildren(child))
  }
  
  rootMenus.forEach(menu => addMenuAndChildren(menu))
  
  return result
}

// 메뉴 데이터 로드
const loadMenuData = async () => {
  try {
    loading.value = true
    console.log('메뉴 데이터 로드 시작...')
    
    // 임시 데이터로 테스트 (API 호출 전에)
    menuData.value = [
      { id: 1, title: '대시보드', href: '/', icon: 'pi pi-home', parent_id: null, sort_order: 1, is_separator: false, is_active: true },
      { id: 2, title: '관리', href: '', icon: 'pi pi-cog', parent_id: null, sort_order: 2, is_separator: false, is_active: true },
      { id: 3, title: '사용자 관리', href: '/admin/users', icon: 'pi pi-users', parent_id: 2, sort_order: 1, is_separator: false, is_active: true },
      { id: 4, title: '메뉴 관리', href: '/admin/menu', icon: 'pi pi-list', parent_id: 2, sort_order: 2, is_separator: false, is_active: true },
      { id: 5, title: '', href: '', icon: '', parent_id: 2, sort_order: 3, is_separator: true, is_active: true },
      { id: 6, title: '설정', href: '/admin/settings', icon: 'pi pi-wrench', parent_id: 2, sort_order: 4, is_separator: false, is_active: true },
    ]
    
    menuData.value.forEach(menu => {
      menu.orgHierarchy = buildHierarchy(menu)
    })
    rowData.value = sortMenuHierarchy([...menuData.value])
    
    console.log('임시 데이터 로드 완료:', rowData.value)
    
    // 실제 API 호출 시도
    try {
      const response = await $fetch<any>('/api/menu/admin')
      if (response && (response as any).success) {
        menuData.value = (response as any).data
        // 계층 정보 추가
        menuData.value.forEach(menu => {
          menu.orgHierarchy = buildHierarchy(menu)
        })
        // 계층 순서로 정렬
        rowData.value = sortMenuHierarchy([...menuData.value])
        console.log('API 데이터 로드 완료:', rowData.value)
      }
    } catch (apiError) {
      console.log('API 호출 실패, 임시 데이터 사용:', apiError)
    }
    
  } catch (error) {
    console.error('메뉴 데이터 로드 실패:', error)
  } finally {
    loading.value = false
  }
}

// 메뉴 새로고침
const refreshMenuData = async () => {
  await loadMenuData()
  // 사이드바 메뉴도 새로고침
  try {
    const { refreshMenu } = useNavigationMenu()
    await refreshMenu()
  } catch (error) {
    console.log('Navigation menu refresh not available')
  }
}

// AG-Grid 제어 함수들
const expandAll = () => {
  console.log('모든 항목 표시')
  // Community 버전에서는 모든 데이터가 이미 표시됨
}

const collapseAll = () => {
  console.log('최상위 항목만 표시')
  // Community 버전에서는 필터링으로 구현 가능
}

// 다이얼로그 관련
const closeDialog = () => {
  showAddDialog.value = false
  editingMenu.value = null
  resetForm()
}

const resetForm = () => {
  menuForm.value = {
    title: '',
    href: '',
    icon: '',
    parent_id: null,
    sort_order: 0,
    is_separator: false
  }
}

// 메뉴 추가
const addChildMenu = (parent: MenuData) => {
  resetForm()
  menuForm.value.parent_id = parent.id
  menuForm.value.sort_order = getNextSortOrder(parent.id)
  showAddDialog.value = true
}

// 메뉴 수정
const editMenu = (menu: MenuData) => {
  editingMenu.value = menu
  menuForm.value = {
    title: menu.title,
    href: menu.href,
    icon: menu.icon,
    parent_id: menu.parent_id,
    sort_order: menu.sort_order,
    is_separator: menu.is_separator
  }
  showAddDialog.value = true
}

// 메뉴 삭제
const deleteMenu = (menu: MenuData) => {
  deletingMenu.value = menu
  showDeleteDialog.value = true
}

// 삭제 확인
const confirmDelete = async () => {
  if (!deletingMenu.value) return

  try {
    deleting.value = true
    const response = await $fetch(`/api/menu/${deletingMenu.value.id}`, {
      method: 'DELETE'
    })
    
    if ((response as any).success) {
      await refreshMenuData()
      showDeleteDialog.value = false
      deletingMenu.value = null
    }
  } catch (error) {
    console.error('메뉴 삭제 실패:', error)
  } finally {
    deleting.value = false
  }
}

// 메뉴 저장
const saveMenu = async () => {
  if (!menuForm.value.is_separator && !menuForm.value.title) {
    return
  }

  try {
    saving.value = true
    
    if (editingMenu.value) {
      // 수정
      await $fetch(`/api/menu/${editingMenu.value.id}`, {
        method: 'PUT',
        body: menuForm.value
      })
    } else {
      // 추가
      await $fetch('/api/menu/create', {
        method: 'POST',
        body: menuForm.value
      })
    }

    await refreshMenuData()
    closeDialog()
  } catch (error) {
    console.error('메뉴 저장 실패:', error)
  } finally {
    saving.value = false
  }
}

// 다음 정렬 순서 계산
const getNextSortOrder = (parentId: number | null): number => {
  const siblings = menuData.value.filter(menu => menu.parent_id === parentId)
  return siblings.length > 0 ? Math.max(...siblings.map(s => s.sort_order)) + 1 : 1
}

// 컴포넌트 마운트시 데이터 로드
onMounted(() => {
  loadMenuData()
})
</script>

<style scoped>
.field {
  margin-bottom: 1rem;
}

/* AG-Grid 커스텀 스타일 */
:deep(.ag-theme-quartz) {
  --ag-header-height: 48px;
  --ag-row-height: 48px;
  --ag-font-size: 14px;
}

:deep(.ag-header-cell-text) {
  font-weight: 600;
}

:deep(.ag-cell) {
  display: flex;
  align-items: center;
}

:deep(.ag-group-expanded .ag-icon) {
  color: #3b82f6;
}

:deep(.ag-group-contracted .ag-icon) {
  color: #6b7280;
}
</style> 