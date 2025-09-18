## AgGrid 컴포넌트 파라미터 가이드

이 문서는 `app/components/AgGrid.vue`가 외부로부터 받는 파라미터(Props)와 발생시키는 이벤트, 외부에 노출하는 메서드에 대해 설명합니다.

### Props

| 이름 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| title | string | '메뉴 트리' | 그리드 상단 제목 텍스트 |
| columnDefs | any[] | [] | AG Grid 컬럼 정의 배열. `dynamicColumnDefs`가 없을 때 사용 |
| rowData | any[] | [] | 행 데이터 배열 |
| searchQuery | string | '' | Quick Filter에 반영되는 검색어 |
| gridId | string | '' | 동적 컬럼 정보 로드를 위한 그리드 ID. 지정 시 서버에서 `sp_grid_info` 실행하여 컬럼 정의를 조회 |
| treeData | boolean | false | 트리 데이터 사용 여부. true일 경우 트리 전개/접기 버튼과 트리 관련 옵션 활성화 |
| autoGroupColumnName | string | - | 트리 데이터 사용 시 자동 그룹 컬럼의 헤더명 |
| editable | boolean | false | 편집 가능 여부. true일 경우 기본 텍스트 에디터와 전체 행 편집 모드 사용 |
| editMode | 'singleClick' \| 'doubleClick' \| 'enterKey' | 'singleClick' | 편집 진입 트리거 모드(현재 내부 로직 반영 범위 제한, 확장 가능) |
| rowSelect | boolean | false | 행 선택 기능 사용 여부. true일 때만 `row-selection` 옵션을 그리드에 전달하여 체크박스/헤더 체크박스 선택 기능 활성화 |

참고: `gridId`가 설정되면 서버 API(`/api/stored-procedure/execute`)를 통해 컬럼 정보를 조회하여 다음 필드로 매핑합니다: `field(col_id)`, `headerName(col_name)`, `width(col_width)`, `hide(col_hide===1)`, `flex(col_flex)`.

### 이벤트(Emits)

| 이벤트 | 페이로드 | 설명 |
| --- | --- | --- |
| grid-ready | params:any | AG Grid가 준비 완료되었을 때 발생 |
| cell-double-clicked | event:any | 셀 더블클릭 시 발생 |
| cell-value-changed | event:any | 셀 값 변경 시 발생 |
| row-editing-started | event:any | 행 편집 시작 시 발생 |
| row-editing-stopped | event:any | 행 편집 종료 시 발생 |
| expand-all | none | 트리 전체 펼치기 버튼 동작 시 발생 |
| collapse-all | none | 트리 전체 접기 버튼 동작 시 발생 |

### 노출 메서드(defineExpose)

| 메서드 | 시그니처 | 설명 |
| --- | --- | --- |
| expandAll | () => void | 트리 데이터를 전체 펼침 |
| collapseAll | () => void | 트리 데이터를 전체 접음 |
| exportExcel | () => void | 현재 데이터를 Excel로 내보냄(파일명: `MenuList`, 시트명: `Menus`) |
| applyFilter | () => void | `searchQuery` 기준 Quick Filter 재적용 |
| getGridApi | () => any | 내부 Grid API 반환 |
| loadDynamicColumnDefs | () => Promise<void> | `gridId` 기준 동적 컬럼 재로딩 |
| getDynamicColumnDefs | () => any[] | 동적 컬럼 정의 반환 |

### 동작 요약

- 트리 모드(`treeData=true`)일 때만 트리 관련 옵션과 전체 펼치기/접기 버튼이 표시됩니다.
- `editable=true`일 때 기본 텍스트 에디터와 전체 행 편집 모드(`editType: 'fullRow'`)가 활성화됩니다.
- `searchQuery` 변경, `rowData` 변경, 다크모드 변경에 반응하여 필터/테마가 갱신됩니다.
- `rowSelect=false`일 때는 `row-selection` 옵션을 전달하지 않으므로 행 선택 UI와 기능이 비활성화됩니다.

### 간단 사용 예시

```vue
<template>
  <AgGrid
    :column-defs="columns"
    :row-data="rows"
    :search-query="q"
    grid-id="menu_grid"
    :tree-data="true"
    auto-group-column-name="메뉴명"
    :editable="true"
    edit-mode="doubleClick"
    :row-select="true"
    @grid-ready="onReady"
    @cell-value-changed="onCellChanged"
    ref="gridRef"
  />
</template>

<script setup lang="ts">
import AgGrid from '@/components/AgGrid.vue'
const columns = []
const rows = []
const q = ''
function onReady(params:any) { /* ... */ }
function onCellChanged(e:any) { /* ... */ }
const gridRef = ref<any>()
</script>
```

필요 시 `gridRef.value.exportExcel()`, `gridRef.value.expandAll()` 등의 메서드를 통해 기능을 호출할 수 있습니다.
