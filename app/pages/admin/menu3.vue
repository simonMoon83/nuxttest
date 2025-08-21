<template>
    <div class="p-6">
 
      <!-- 툴바: 액션 + 검색 -->
      <div class="mb-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div class="flex items-center gap-2">
          <Button 
            icon="pi pi-plus" 
            label="새 메뉴 추가" 
            @click="showAddDialog = true"
            class="p-button-success"
            size="small"
          />
          <Button 
            icon="pi pi-refresh" 
            label="새로고침" 
            @click="refreshMenuData"
            size="small"
          />
          <Button 
            icon="pi pi-angle-double-down" 
            label="전체 펼치기" 
            @click="expandAll"
            severity="secondary"
            size="small"
          />
          <Button 
            icon="pi pi-angle-double-up" 
            label="전체 접기" 
            @click="collapseAll"
            severity="secondary"
            size="small"
          />
        </div>
        
      </div>
  
      <!-- 메뉴 트리 테이블 -->
      <Card>
        <template #header>
          <div class="datatable-header">
            <div class="flex items-center justify-end">
              <IconField icon-position="left" class="ml-auto w-full lg:w-80">
                <InputIcon class="pi pi-search" />
                <InputText v-model="searchQuery" placeholder="메뉴 검색 (제목/링크)" />
              </IconField>
            </div>
          </div>
        </template>
        <template #content>
          <TreeTable 
            :value="filteredMenuTreeData" 
            :loading="loading"
            v-model:expandedKeys="expandedKeys"
            class="p-treetable-sm"
            :pt="{ headerCell: { class: 'py-2 px-2' }, bodyCell: { class: 'py-2 px-2' }, table: { class: 'text-sm' } }"
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
            
            <Column field="is_active" header="활성화" style="width: 12%">
              <template #body="slotProps">
                <template v-if="!slotProps.node.data.is_separator">
                  <div class="flex items-center gap-2">
                    <ToggleSwitch 
                      :model-value="slotProps.node.data.is_active"
                      @update:modelValue="onToggleActive(slotProps.node.data, $event)"
                    />
                    <Tag 
                      :label="slotProps.node.data.is_active ? '활성' : '비활성'" 
                      :severity="slotProps.node.data.is_active ? 'success' : 'danger'"
                    />
                  </div>
                </template>
                <template v-else>
                  <Tag label="-" severity="secondary" />
                </template>
              </template>
            </Column>
            
            <Column header="작업" style="width: 23%">
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
                    icon="pi pi-arrow-up" 
                    size="small"
                    severity="secondary"
                    @click="moveUp(slotProps.node.data)"
                    :disabled="!canMoveUp(slotProps.node.data)"
                    v-tooltip.top="'위로 이동'"
                  />
                  <Button 
                    icon="pi pi-arrow-down" 
                    size="small"
                    severity="secondary"
                    @click="moveDown(slotProps.node.data)"
                    :disabled="!canMoveDown(slotProps.node.data)"
                    v-tooltip.top="'아래로 이동'"
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

            <template #empty>
              <div class="py-10 text-center text-gray-500">
                <i class="pi pi-folder-open text-2xl mb-2"></i>
                <div>표시할 메뉴가 없습니다.</div>
              </div>
            </template>
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
      const response = await $fetch<{ success: boolean; data: MenuData[] }>('\/api\/menu\/admin')
      if (response?.success) {
        menuData.value = response.data as MenuData[]
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

  // 트리 확장/접기 상태
  const expandedKeys = ref<Record<string, boolean>>({})

  const collectAllKeys = (nodes: TreeNode[], acc: Record<string, boolean>) => {
    nodes.forEach(n => {
      acc[n.key] = true
      if (n.children && n.children.length) collectAllKeys(n.children, acc)
    })
    return acc
  }

  const expandAll = () => {
    expandedKeys.value = collectAllKeys(menuTreeData.value, {})
  }

  const collapseAll = () => {
    expandedKeys.value = {}
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

  // 검색 필터
  const searchQuery = ref('')

  const filterNodes = (nodes: TreeNode[], query: string): TreeNode[] => {
    if (!query) return nodes
    const q = query.toLowerCase().trim()
    const result: TreeNode[] = []
    nodes.forEach(node => {
      const title = node.data.title?.toLowerCase() || ''
      const href = node.data.href?.toLowerCase() || ''
      const selfMatch = title.includes(q) || href.includes(q)
      const filteredChildren = node.children ? filterNodes(node.children, query) : []
      if (selfMatch || filteredChildren.length) {
        result.push({
          key: node.key,
          data: node.data,
          children: filteredChildren
        })
      }
    })
    return result
  }

  const filteredMenuTreeData = computed(() => {
    return filterNodes(menuTreeData.value, searchQuery.value)
  })
  
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
      const response = await $fetch<{ success: boolean; message: string }>(`/api/menu/${deletingMenu.value.id}`, {
        method: 'DELETE'
      })
      
      if (response?.success) {
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

  // 활성화 토글
  const onToggleActive = async (menu: MenuData, nextValue: boolean) => {
    const prev = menu.is_active
    menu.is_active = nextValue
    try {
      await $fetch(`/api/menu/${menu.id}`, {
        method: 'PUT',
        body: { is_active: nextValue }
      })
    } catch (e) {
      menu.is_active = prev
      console.error('활성화 토글 실패:', e)
    }
  }

  // 정렬 이동
  const getSiblingsSorted = (parentId: number | null) => {
    return menuData.value
      .filter(m => m.parent_id === parentId)
      .sort((a, b) => a.sort_order - b.sort_order)
  }

  const canMoveUp = (menu: MenuData) => {
    const siblings = getSiblingsSorted(menu.parent_id)
    const index = siblings.findIndex(s => s.id === menu.id)
    return index > 0
  }

  const canMoveDown = (menu: MenuData) => {
    const siblings = getSiblingsSorted(menu.parent_id)
    const index = siblings.findIndex(s => s.id === menu.id)
    return index !== -1 && index < siblings.length - 1
  }

  const swapOrder = async (a: MenuData, b: MenuData) => {
    const aOrder = a.sort_order
    const bOrder = b.sort_order
    a.sort_order = bOrder
    b.sort_order = aOrder
    try {
      await Promise.all([
        $fetch(`/api/menu/${a.id}`, { method: 'PUT', body: { sort_order: a.sort_order } }),
        $fetch(`/api/menu/${b.id}`, { method: 'PUT', body: { sort_order: b.sort_order } })
      ])
      await refreshMenuData()
    } catch (e) {
      // 롤백
      a.sort_order = aOrder
      b.sort_order = bOrder
      console.error('정렬 변경 실패:', e)
    }
  }

  const moveUp = async (menu: MenuData) => {
    const siblings = getSiblingsSorted(menu.parent_id)
    const index = siblings.findIndex(s => s.id === menu.id)
    if (index > 0) {
      const prev = siblings[index - 1]
      if (!prev) return
      await swapOrder(menu, prev)
    }
  }

  const moveDown = async (menu: MenuData) => {
    const siblings = getSiblingsSorted(menu.parent_id)
    const index = siblings.findIndex(s => s.id === menu.id)
    if (index !== -1 && index < siblings.length - 1) {
      const next = siblings[index + 1]
      if (!next) return
      await swapOrder(menu, next)
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