<template>
  <div class="p-6">
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">메뉴 관리</h1>
      <p class="text-gray-600">애플리케이션의 네비게이션 메뉴를 관리합니다.</p>
    </div>

    <!-- 메뉴 추가 버튼 -->
    <div class="mb-4">
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
        class="ml-2"
      />
    </div>

    <!-- 메뉴 트리 테이블 -->
    <Card>
      <template #content>
        <TreeTable 
          :value="menuTreeData" 
          :loading="loading"
          class="p-treetable-sm"
        >
          <Column field="title" header="제목" expander style="width: 30%">
            <template #body="slotProps">
              <div class="flex items-center gap-2">
                <i v-if="slotProps.node.data.icon" :class="slotProps.node.data.icon"></i>
                <span v-if="!slotProps.node.data.is_separator">{{ slotProps.node.data.title }}</span>
                <Tag v-else label="구분선" severity="info" />
              </div>
            </template>
          </Column>
          
          <Column field="href" header="링크" style="width: 25%">
            <template #body="slotProps">
              <code v-if="slotProps.node.data.href" class="text-sm bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-2 py-1 rounded">
                {{ slotProps.node.data.href }}
              </code>
            </template>
          </Column>
          
          <Column field="sort_order" header="순서" style="width: 10%">
            <template #body="slotProps">
              <Badge :value="slotProps.node.data.sort_order" />
            </template>
          </Column>
          
          <Column field="is_active" header="활성화" style="width: 10%">
            <template #body="slotProps">
              <Tag 
                :label="slotProps.node.data.is_active ? '활성' : '비활성'" 
                :severity="slotProps.node.data.is_active ? 'success' : 'danger'"
              />
            </template>
          </Column>
          
          <Column header="작업" style="width: 25%">
            <template #body="slotProps">
              <div class="flex gap-2">
                <Button 
                  icon="pi pi-pencil" 
                  size="small"
                  severity="info"
                  @click="editMenu(slotProps.node.data)"
                  v-tooltip.top="'수정'"
                />
                <Button 
                  icon="pi pi-plus" 
                  size="small"
                  severity="success"
                  @click="addChildMenu(slotProps.node.data)"
                  v-tooltip.top="'하위 메뉴 추가'"
                />
                <Button 
                  icon="pi pi-trash" 
                  size="small"
                  severity="danger"
                  @click="deleteMenu(slotProps.node.data)"
                  v-tooltip.top="'삭제'"
                />
              </div>
            </template>
          </Column>
        </TreeTable>
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
interface MenuData {
  id: number
  title: string
  href: string
  icon: string
  parent_id: number | null
  sort_order: number
  is_separator: boolean
  is_active: boolean
}

interface TreeNode {
  key: string
  data: MenuData
  children?: TreeNode[]
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

// 메뉴 데이터
const menuData = ref<MenuData[]>([])
const menuTreeData = ref<TreeNode[]>([])

// 폼 데이터
const menuForm = ref({
  title: '',
  href: '',
  icon: '',
  parent_id: null as number | null,
  sort_order: 0,
  is_separator: false
})

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

// 메뉴 데이터 로드
const loadMenuData = async () => {
  try {
    loading.value = true
    const response = await $fetch<any>('/api/menu/admin')
    if (response && response.success) {
      menuData.value = response.data
      buildTreeData()
    }
  } catch (error) {
    console.error('메뉴 데이터 로드 실패:', error)
    // 에러 처리
  } finally {
    loading.value = false
  }
}

// 트리 데이터 구성
const buildTreeData = () => {
  const nodeMap = new Map<number, TreeNode>()
  const rootNodes: TreeNode[] = []

  // 1단계: 모든 노드 생성
  menuData.value.forEach(menu => {
    const node: TreeNode = {
      key: menu.id.toString(),
      data: menu,
      children: []
    }
    nodeMap.set(menu.id, node)
  })

  // 2단계: 부모-자식 관계 설정
  menuData.value.forEach(menu => {
    const node = nodeMap.get(menu.id)!
    if (menu.parent_id === null) {
      rootNodes.push(node)
    } else {
      const parent = nodeMap.get(menu.parent_id)
      if (parent) {
        parent.children!.push(node)
      }
    }
  })

  menuTreeData.value = rootNodes
}

// 메뉴 새로고침
const refreshMenuData = async () => {
  await loadMenuData()
  // 사이드바 메뉴도 새로고침
  const { refreshMenu } = useNavigationMenu()
  await refreshMenu()
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
    
    if (response.success) {
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
</style> 