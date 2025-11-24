<script setup lang="ts">
import GridMasterManager from '~/components/admin/schema/GridMasterManager.vue'
import MenuDisplayManager from '~/components/admin/schema/MenuDisplayManager.vue'
import GridDetailManager from '~/components/admin/schema/GridDetailManager.vue'
import { useCodeBook } from '@/composables/useCodeBook'
import type { GridMaster } from '@/types/schema'

definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

const codeBook = useCodeBook()
const toast = useToast()

const selectedGridId = ref<string | null>(null)
const selectedMenuId = ref<string | null>(null)

const requiredCodeGroups = ['YN_FLAG', 'BINARY_FLAG', 'GRID_TYPE', 'GRID_COLUMN_TYPE', 'GRID_FIELD_SIZE'] as const

// grid_id에서 menu_id 추출 (예: adm019_header -> ADM019)
const extractMenuId = (gridId: string): string => {
  // grid_id 패턴: adm###_* 또는 ADM### 형식
  const match = gridId.match(/^(adm\d{3})/i)
  const captured = match?.[1]
  if (captured) {
    return captured.toUpperCase()
  }
  // 매칭 안 되면 원본 그대로 대문자로 반환
  return gridId.toUpperCase()
}

const handleGridSelect = (grid: GridMaster) => {
  selectedGridId.value = grid.grid_id
  if (grid.grid_id) {
    selectedMenuId.value = extractMenuId(grid.grid_id)
  } else {
    selectedMenuId.value = null
  }
}

const loadInitialCodes = async () => {
  try {
    await codeBook.fetchGroups([...requiredCodeGroups])
  } catch (error) {
    console.error('코드 데이터 로드 실패:', error)
    toast.add({
      severity: 'error',
      summary: '오류',
      detail: '코드 목록을 불러오는데 실패했습니다.',
      life: 3000
    })
  }
}

onMounted(() => {
  loadInitialCodes()
})
</script>

<template>
  <div class="space-y-6 p-6">
    <div class="space-y-2">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">그리드 스키마 관리</h1>
      <p class="text-gray-600 dark:text-gray-400">s_grid_master / s_menu_display / s_grid_detail 통합 관리</p>
    </div>

    <!-- 2열 레이아웃: 좌측(Grid Master) / 우측(Menu Display + Grid Detail) -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      <!-- 좌측: Grid Master -->
      <div class="h-full">
        <GridMasterManager @row-selected="handleGridSelect" />
      </div>

      <!-- 우측: Menu Display + Grid Detail (상하 배치) -->
      <div class="space-y-6">
        <MenuDisplayManager :menu-id="selectedMenuId" />
        <GridDetailManager :grid-id="selectedGridId" />
      </div>
      
    </div>
  </div>
</template>
