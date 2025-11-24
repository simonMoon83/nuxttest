# 그리드 스키마 관리 페이지 리팩토링 가이드 (Updated)

`app/pages/admin/schema.vue` 파일에 **3개의 그리드(Master, MenuDisplay, Detail)**가 존재함을 확인했습니다. 이를 반영하여 리팩토링 가이드를 수정합니다.

## 1. 목표 (Goal)
*   **파일 크기 감소**: 메인 페이지를 가볍게 만들고 로직을 분산
*   **컴포넌트 분리**: 3개의 그리드를 각각 독립적인 컴포넌트로 분리
*   **레이아웃 유지**: 좌측(Master) / 우측 상단(MenuDisplay) / 우측 하단(Detail) 구조 유지

---

## 2. 단계별 진행 가이드 (Step-by-Step)

### 1단계: 컴포넌트 구조 설계
다음과 같이 3개의 매니저 컴포넌트를 생성합니다.

```text
app/
  components/
    admin/
      schema/
        GridMasterManager.vue   (좌측: 그리드 마스터)
        MenuDisplayManager.vue  (우측 상단: 메뉴 화면 구성)
        GridDetailManager.vue   (우측 하단: 컬럼 상세)
  pages/
    admin/
      schema.vue                (메인 페이지)
```

### 2단계: GridMasterManager.vue 분리
*   **역할**: `s_grid_master` 테이블 관리 및 검색
*   **Emits**: 
    *   `row-selected(grid: GridMaster)`: 행 선택 시 부모에게 알림
*   **주요 로직**:
    *   `gridList`, `gridSearch` 등 검색 및 목록 상태
    *   `gridMasterColumnDefs`
    *   `extractMenuIdFromGridId` 함수 (또는 부모로 이동 가능)

### 3단계: MenuDisplayManager.vue 분리 (New)
*   **역할**: `s_menu_display` 테이블 관리
*   **Props**: 
    *   `menuId`: 선택된 메뉴 ID (예: 'ADM019')
*   **Watch**: `menuId` 변경 시 `loadMenuDisplay` 실행
*   **주요 로직**:
    *   `menuDisplayList` 상태
    *   `menuDisplayColumnDefs`
    *   `loadMenuDisplay`, `saveMenuDisplay` 등

### 4단계: GridDetailManager.vue 분리
*   **역할**: `s_grid_detail` 테이블 관리
*   **Props**: 
    *   `gridId`: 선택된 그리드 ID
*   **Watch**: `gridId` 변경 시 `loadGridDetail` 실행
*   **주요 로직**:
    *   `gridDetailList` 상태
    *   `gridDetailColumnDefs`
    *   `loadGridDetail`, `saveGridDetail` 등

### 5단계: 메인 페이지(schema.vue) 재구성
메인 페이지는 레이아웃을 잡고 데이터 흐름을 연결합니다.

```vue
<script setup lang="ts">
import GridMasterManager from '~/components/admin/schema/GridMasterManager.vue'
import MenuDisplayManager from '~/components/admin/schema/MenuDisplayManager.vue'
import GridDetailManager from '~/components/admin/schema/GridDetailManager.vue'

const selectedGridId = ref<string | null>(null)
const selectedMenuId = ref<string | null>(null)

// grid_id에서 menu_id 추출 로직 (유틸리티로 분리 추천)
const extractMenuId = (gridId: string) => {
  const match = gridId.match(/^(adm\d{3})/i)
  return match ? match[1].toUpperCase() : gridId.toUpperCase()
}

const handleGridSelect = (grid: GridMaster) => {
  selectedGridId.value = grid.grid_id
  if (grid.grid_id) {
    selectedMenuId.value = extractMenuId(grid.grid_id)
  } else {
    selectedMenuId.value = null
  }
}
</script>

<template>
  <div class="space-y-6 p-6">
    <div class="space-y-2">
      <h1 class="text-3xl font-bold">그리드 스키마 관리</h1>
      <p class="text-gray-600">s_grid_master / s_menu_display / s_grid_detail 통합 관리</p>
    </div>

    <!-- 2열 레이아웃 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      <!-- 좌측: Master -->
      <GridMasterManager @row-selected="handleGridSelect" />

      <!-- 우측: MenuDisplay + Detail -->
      <div class="space-y-6">
        <MenuDisplayManager :menu-id="selectedMenuId" />
        <GridDetailManager :grid-id="selectedGridId" />
      </div>
      
    </div>
  </div>
</template>
```

---

## 3. 핵심 포인트 (Key Points)

### 데이터 흐름 (Data Flow)
1.  **User** clicks row in `GridMasterManager`.
2.  `GridMasterManager` emits `row-selected`.
3.  `schema.vue` receives event, updates `selectedGridId` and calculates `selectedMenuId`.
4.  `MenuDisplayManager` detects `menuId` prop change -> Loads data.
5.  `GridDetailManager` detects `gridId` prop change -> Loads data.

### 상태 공유 (State Sharing)
*   `useCodeBook`이나 `useAsyncAction` 같은 Composable은 각 컴포넌트 내부에서 독립적으로 사용해도 무방합니다.
*   단, 공통 코드(`availableCodeGroups`)는 메인 페이지에서 한 번 로드해서 Props로 내려주거나, 각 컴포넌트가 필요할 때 `useCodeBook` 스토어를 통해 가져다 쓰는 방식이 좋습니다. (스토어 패턴 권장)

이 가이드대로 진행하면 3개의 그리드가 유기적으로 동작하면서도 코드는 깔끔하게 분리될 것입니다.
