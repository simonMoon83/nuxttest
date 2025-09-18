
<template>
  <div class="card flex flex-wrap gap-6">
    <!-- 글로벌 타이틀과 액션 버튼 영역 -->
    <div v-if="showGlobalTitle && !hideGlobalTitle" class="w-full mt-1 mb-2 border-b-1 border-gray-400 dark:border-gray-700">
      <div class="flex items-center justify-between">
        <!-- 페이지 제목 영역 - 아이콘과 브레드크럼 제목 -->
        <div class="flex items-center gap-1">
          <i :class="pageIcon" class="text-primary"></i>
          <h2 class="text-xl font-semibold text-primary">{{ breadcrumbTitle }}</h2>
        </div>
        <!-- 액션 버튼 영역 -->
        <div class="flex items-center gap-2">
          <Button label="검색" severity="secondary" size="small" @click="onSearch" v-if="showSearchButton" />
          <Button label="저장" severity="secondary" size="small" @click="onSearch" v-if="showSaveButton" />
          <Button label="등록" severity="secondary" size="small" @click="openCreateRoot" v-if="showCreateButton" />
          <Button label="초기화" outlined severity="secondary" size="small" @click="onReset" v-if="showResetButton" />
          <!--<Button label="엑셀" outlined severity="secondary" size="small" @click="exportExcel" />-->
        </div>
      </div>
    </div>

    <!-- 검색 영역 (departments 디자인 차용) -->
    <div class="w-full pb-2 mb-2 border-b border-gray-200 dark:border-gray-700">
      <div class="compact-form">
                                   <!-- FormKitDataEdit 사용 (menu4와 동일한 방식) -->
                   <FormKitDataEdit
            v-if="finalSchema.length > 0"
            :key="`schema-${finalSchema.length}`"
            v-model="filters"
            :schema="finalSchema"
            :debug-schema="false"
            :debug-data="false"
            form-class="form-horizontal grid-12"
            submit-label=""
            @data-saved="onSearch"
          />
      </div>
    </div>

    <!-- AG Grid 영역 - 자식 컴포넌트에서 구현 -->
    <slot name="ag-grid" :row-data="rowData" :column-defs="columnDefs" :search-query="searchQuery" />

    <!-- 등록/수정 다이얼로그 -->
    <Dialog v-model:visible="dialogVisible" :header="editTarget ? '메뉴 수정' : '메뉴 추가'" :style="{ width: '620px' }" modal>
      <div v-if="editTarget" class="w-full compact-form">
        <!-- FormKit 편집 폼 -->
        <FormKitDataEdit
          v-model="editTarget"
          :schema="editSchema"
          :debug-schema="false"
          :debug-data="false"
          form-class="form-horizontal grid-12"
          submit-label=""
        />
      </div>
    </Dialog>
    
  </div>
</template>

<script setup lang='ts'>

// Props 인터페이스 정의
interface Props {
  schema?: any[]        // 검색 폼 스키마
  filters?: any         // 필터 초기값
  title?: string        // 페이지 제목
  apiEndpoint?: string  // API 엔드포인트
  columnDefs?: any[]    // AG Grid 컬럼 정의
  editSchema?: any[]    // 편집 폼 스키마
  showGlobalTitle?: boolean    // 글로벌 타이틀 표시 여부
  showResetButton?: boolean    // 초기화 버튼 표시 여부
  showCreateButton?: boolean   // 등록 버튼 표시 여부
  showSearchButton?: boolean   // 검색 버튼 표시 여부
  showSaveButton?: boolean     // 저장 버튼 표시 여부
  procedureName?: string       // 저장 프로시저 이름
  searchSchemaGridId?: string  // 검색 스키마 로드를 위한 grid_id
}

// Props 기본값 설정
const props = withDefaults(defineProps<Props>(), {
  schema: () => [],
  filters: () => ({}),
  title: '기본 페이지',
  apiEndpoint: '/api/menu/admin',
  columnDefs: () => [],
  editSchema: () => [],
  showGlobalTitle: true,
  showResetButton: false,
  showCreateButton: false,
  showSearchButton: true,
  showSaveButton: true
})

// Composable 함수들 사용
const { confirmAction } = useConfirmation()  // 확인 다이얼로그
const toast = useToast()                     // 토스트 메시지
const route = useRoute()                     // 현재 라우트 정보

// 메뉴 아이템 인터페이스 정의
interface MenuItem {
  id: number
  title: string
  href: string
  icon: string
  parent_id: number | null
  sort_order: number
  is_separator: boolean
  is_active: boolean
}

// 트리 노드 인터페이스 정의
interface TreeNode { 
  key: string; 
  data: MenuItem; 
  children?: TreeNode[] 
}

// 글로벌 타이틀 관련 함수들 (app.vue에서 가져옴)

/**
 * 경로 정규화 함수
 * @param path 경로 문자열
 * @returns 정규화된 경로
 */
function normalizePath(path: string) {
  return path.replace(/\/$/, '').toLowerCase()
}

/**
 * 아이템에서 경로 추출 함수
 * @param item 메뉴 아이템
 * @returns 추출된 경로
 */
function extractItemPath(item: any) {
  const href = item?.href
  if (!href || href === '#') return undefined
  return normalizePath(href)
}

/**
 * 아이템에서 제목 추출 함수
 * @param item 메뉴 아이템
 * @returns 추출된 제목
 */
function extractItemTitle(item: any) {
  return item?.title || ''
}

/**
 * 아이템에서 아이콘 추출 함수
 * @param item 메뉴 아이템
 * @returns 추출된 아이콘
 */
function extractItemIcon(item: any) {
  return item?.icon || 'pi pi-bookmark'
}

// 메뉴 데이터 (글로벌 타이틀용)
const { menu } = useNavigationMenu()

/**
 * 최적 노드와 조상 경로를 함께 찾기 (상위메뉴 표시용)
 * @param items 메뉴 아이템 배열
 * @param currentPath 현재 경로
 * @returns 최적 노드와 경로 정보
 */
function findBestMenuNodeAndPath(items: any[], currentPath: string) {
  if (!items || items.length === 0) return undefined
  const target = normalizePath(currentPath)
  let best: any
  const stack: any[] = []
  
  const visit = (nodes: any[]) => {
    for (const node of nodes) {
      stack.push(node)
      const p = extractItemPath(node)
      if (p && target) {
        let score = 0
        if (p === target) score = 1_000_000
        else if (target.startsWith(p)) score = 500_000 + p.length
        else if (target.endsWith(p)) score = 100_000 + p.length
        if (score > 0 && (!best || score > best.score)) best = { score, node, path: [...stack] }
      }
      if (node.child?.length) visit(node.child)
      stack.pop()
    }
  }
  visit(items)
  return best
}

// 페이지 계층 구조 계산 (Computed)
const pageLineage = computed(() => {
  try {
    const r = findBestMenuNodeAndPath(menu.value, route.path)
    return r?.path || []
  } catch { return [] }
})

// 페이지 제목 계산 (Computed)
const pageTitle = computed(() => {
  try {
    const lineage = pageLineage.value
    const leaf = lineage.length ? lineage[lineage.length - 1] : undefined
    const t = leaf ? extractItemTitle(leaf) : ''
    if (t) return t
  } catch {}
  const metaName = route.meta?.name
  if (metaName && metaName.length > 0) return metaName
  const seg = route.path.replace(/\/$/, '').split('/').filter(Boolean).pop()
  return seg || 'home'
})

// 페이지 아이콘 계산 (Computed)
const pageIcon = computed(() => {
  try {
    const lineage = pageLineage.value
    const leaf = lineage.length ? lineage[lineage.length - 1] : undefined
    const icon = leaf ? extractItemIcon(leaf) : ''
    return icon || 'pi pi-bookmark'
  } catch { return 'pi pi-bookmark' }
})

// 브레드크럼 제목 계산 (Computed)
const breadcrumbTitle = computed(() => {
  try {
    const lineage = pageLineage.value
    if (lineage.length > 0) {
      const titles = lineage.map((n: any) => extractItemTitle(n)).filter(Boolean)
      if (titles.length > 0) return titles.join(' / ')
    }
  } catch {}
  return pageTitle.value
})

// 특정 페이지에서 전역 타이틀 숨김 처리 (route.meta.hideTitle === true)
const hideGlobalTitle = computed(() => {
  try {
    return Boolean(route.meta?.hideTitle)
  } catch {
    return false
  }
})

// 상태 관리 변수들
const loading = ref(false)          // 로딩 상태
const saving = ref(false)           // 저장 중 상태
const deleting = ref(false)         // 삭제 중 상태
const dialogVisible = ref(false)    // 다이얼로그 표시 상태
const editTarget = ref<MenuItem | null>(null)  // 편집 대상 아이템

// 검색 폼 - props에서 받은 schema 사용
const filters = ref<any>(props.filters)
const schema = ref<any>(props.schema)

// 동적 검색 스키마 관련
const dynamicSchema = ref<any[]>([])
const isLoadingSchema = ref(false)

// 최종 스키마 계산 (동적 스키마만 사용)
const finalSchema = computed(() => {
  const schema = dynamicSchema.value || []
  return Array.isArray(schema) ? schema : []
})

// AG Grid 관련 데이터
const searchQuery = ref('')         // 검색 쿼리
const rowData = ref<any[]>([])      // 행 데이터
const columnDefs = ref<any[]>(props.columnDefs)  // 컬럼 정의

// AG Grid 관련 이벤트를 emit으로 전달
const emit = defineEmits<{
  'grid-ready': [params: any]           // 그리드 준비 완료 이벤트
  'cell-double-clicked': [event: any]   // 셀 더블클릭 이벤트
  'search': [result: any]               // 검색 완료 이벤트
}>()

/**
 * AG Grid 준비 완료 이벤트 핸들러
 * @param params AG Grid API 파라미터
 */
function onGridReady(params: any) { 
  emit('grid-ready', params)
}

/**
 * 셀 더블클릭 이벤트 핸들러
 * @param event 더블클릭 이벤트 객체
 */
function onCellDoubleClicked(event: any) { 
  emit('cell-double-clicked', event)
}

/**
 * 엑셀 내보내기 함수 (자식 컴포넌트에서 구현)
 */
function exportExcel() {
  // 자식 컴포넌트에서 구현
  console.log('Export Excel called')
}

// 메뉴 데이터 관리
const menuData = ref<MenuItem[]>([])

/**
 * 트리 구조 빌드 함수 (사용하지 않음 - 저장 프로시저로 대체)
 * @param list 메뉴 아이템 리스트
 */
// function buildTree(list: MenuItem[]) {
//   const map = new Map<number, MenuItem>()
//   list.forEach(i => map.set(i.id, i))
//   rowData.value = list.map(i => ({ ...i, orgHierarchy: computePath(i, map) }))
// }

/**
 * 아이템의 경로 계산 함수 (사용하지 않음 - 저장 프로시저로 대체)
 * @param item 메뉴 아이템
 * @param all 모든 메뉴 아이템 맵
 * @returns 경로 배열
 */
// function computePath(item: MenuItem, all: Map<number, MenuItem>): string[] {
//   const path: string[] = []
//   let cur: MenuItem | undefined = item
//   const guard = new Set<number>()  // 무한 루프 방지
//   
//   while (cur) {
//     if (guard.has(cur.id)) break
//     guard.add(cur.id)
//     path.unshift(cur.title || '')
//     cur = cur.parent_id != null ? (all.get(cur.parent_id) || undefined) : undefined
//   }
//   return path
// }

/**
 * 동적 검색 스키마 로드 함수
 * sp_grid_info를 호출하여 검색 조건 정보를 가져옴
 */
async function loadDynamicSearchSchema() {
  try {
    isLoadingSchema.value = true
    
    // grid_id 미설정 시 스키마 로드를 건너뜀
    if (!props.searchSchemaGridId) {
      console.log('searchSchemaGridId가 없어 동적 검색 스키마를 로드하지 않습니다.')
      dynamicSchema.value = []
      return
    }

    // sp_grid_info 호출하여 검색 조건 정보 조회
    const result = await $fetch<any>('/api/stored-procedure/execute', {
      method: 'POST',
      body: {
        procedureName: 'sp_grid_info',
        parameters: {
          case: 'search',
          grid_id: props.searchSchemaGridId
        }
      }
    })
    
    
    
    if (result.success && result.data && Array.isArray(result.data)) {
      const schemaItems = []
      
      for (const col of result.data) {
        const colType = col.col_type || ''
        const colId = col.col_id || ''
        const colName = col.col_name || ''
        const colSize = col.col_size || 'col-4'
        const colCode = col.col_code || ''
        
        // col_type에 'prime' 접두사 추가
        const formkitType = colType.startsWith('prime') ? colType : `prime${colType}`
        
        const schemaItem: any = {
          $formkit: formkitType,
          name: colId,
          label: colName,
          outerClass: colSize
        }
        
        // primeSelect인 경우 추가 옵션 설정
        if (formkitType === 'primeSelect') {
          schemaItem.optionLabel = 'code_name'
          schemaItem.optionValue = 'code'
          schemaItem.placeholder = '전체'
          schemaItem.showClear = true
          
                    // sp_code_info 호출하여 옵션 데이터 가져오기
          if (colCode && colCode.trim() !== '') {
                         try {
              
                             const codeResult = await $fetch<any>('/api/stored-procedure/execute', {
                 method: 'POST',
                 body: {
                   procedureName: 'sp_code_info',
                   parameters: {
                     case: 'search',
                     plant_code: '1000',
                     code_grp: colCode
                   }
                 }
               })
              
              
               
               // data가 없어도 전체 응답에서 recordset이나 다른 필드 확인
               let optionsData = null
               if (codeResult.data && Array.isArray(codeResult.data) && codeResult.data.length > 0) {
                 optionsData = codeResult.data
               } else if (codeResult.recordset && Array.isArray(codeResult.recordset) && codeResult.recordset.length > 0) {
                 optionsData = codeResult.recordset
               } else if (codeResult.rowsAffected && codeResult.rowsAffected[0] > 0) {
                 // rowsAffected가 있지만 데이터가 없는 경우 (예: INSERT/UPDATE/DELETE)
                 console.warn(`${colId} 프로시저는 데이터를 반환하지 않습니다:`, codeResult)
                 optionsData = []
               }
               
                                if (optionsData && optionsData.length > 0) {
                   schemaItem.options = [
                     { code_name: '전체', code: null },
                     ...optionsData
                   ]
                 } else {
                   // 데이터가 없으면 기본 옵션 설정
                   schemaItem.options = [{ code_name: '전체', code: null }]
                 }
            } catch (error) {
              console.error(`${colId} 옵션 데이터 조회 오류:`, error)
              // 오류 발생 시 기본 옵션 설정
              schemaItem.options = [{ code_name: '전체', code: null }]
            }
                     } else {
             // colCode가 비어있으면 기본 옵션 설정
             schemaItem.options = [{ code_name: '전체', code: null }]
           }
         }
        
        schemaItems.push(schemaItem)
      }
      
             // 스키마 설정
       dynamicSchema.value = [...schemaItems]
       
       // 동적 필터 초기값 설정
       const newFilters: any = {}
       schemaItems.forEach(item => {
         newFilters[item.name] = null
       })
       filters.value = { ...filters.value, ...newFilters }
      
         } else {
       console.warn('동적 검색 스키마가 없거나 잘못된 형식입니다:', result)
       // 기본 스키마 사용
       dynamicSchema.value = []
     }
   } catch (error) {
     console.error('동적 검색 스키마 조회 실패:', error)
     dynamicSchema.value = []
   } finally {
     isLoadingSchema.value = false
   }
   
   
}

/**
 * 메뉴 데이터 로드 함수 (사용하지 않음 - 저장 프로시저로 대체)
 * API에서 메뉴 데이터를 가져와서 필터링하고 트리 구조로 변환
 */
// async function loadMenu() {
//   try {
//     loading.value = true
//     const res = await $fetch<{ success: boolean; data: MenuItem[] }>(props.apiEndpoint)
//     if (res?.success) {
//       let rows = res.data || []
//       const f = filters.value
//       
//       // 동적 필터 적용
//       Object.entries(f).forEach(([key, value]) => {
//         if (value !== null && value !== undefined && value !== '') {
//           if (key === 'title') {
//             rows = rows.filter(r => r.title?.toLowerCase?.().includes?.(value.toString().toLowerCase()))
//           } else if (key === 'href') {
//             rows = rows.filter(r => r.href?.toLowerCase?.().includes?.(value.toString().toLowerCase()))
//           } else if (key === 'activeOnly') {
//             rows = rows.filter(r => r.is_active === value)
//           } else {
//             // 기타 필드에 대한 필터링 (필요시 확장)
//             console.log(`필터 적용: ${key} = ${value}`)
//           }
//         }
//       })
//       
//       menuData.value = rows as any
//       buildTree(menuData.value)
//       // AG Grid 필터 적용은 AgGrid 컴포넌트 내부에서 자동으로 처리됨
//     }
//   } finally { 
//     loading.value = false 
//   }
// }

/**
 * 검색 실행 함수
 */
async function onSearch() { 
  try {
    console.log('검색 시작 - 필터 값:', filters.value)
    
         // 동적 프로시저 호출
     const requestBody = {
       procedureName: props.procedureName,
       parameters: {
         case: 'search',
         menu_name: filters.value.title || null,
         menu_url: filters.value.href || null,
         use_yn: filters.value.activeOnly || null
       }
     }
    
    console.log('프로시저 호출 요청:', requestBody)
    
    const result = await $fetch<any>('/api/stored-procedure/execute', {
      method: 'POST',
      body: requestBody
    })
    
    console.log('프로시저 응답:', result)
    
    if (result.success && result.data) {
      console.log('메뉴 검색 결과:', result.data)
      // 검색 결과를 rowData에 설정
      rowData.value = result.data
      // 부모에게 검색 완료 이벤트 전달
      emit('search', {
        data: result.data,
        filters: filters.value
      })
    } else {
      console.error('메뉴 검색 실패:', result)
      rowData.value = []
      // 에러 처리
      emit('search', {
        data: [],
        filters: filters.value,
        error: result.error || result.message || '검색에 실패했습니다.'
      })
    }
  } catch (error) {
    console.error('메뉴 검색 중 오류 발생:', error)
    console.error('오류 상세 정보:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    rowData.value = []
    // 에러 처리
    emit('search', {
      data: [],
      filters: filters.value,
      error: error instanceof Error ? error.message : '검색 중 오류가 발생했습니다.'
    })
  }
}

/**
 * 초기화 함수
 * 필터와 검색 쿼리를 초기화하고 그리드 데이터 초기화
 */
function onReset() { 
  // 동적 필터 초기화
  const resetFilters: any = {}
  Object.keys(filters.value).forEach(key => {
    resetFilters[key] = null
  })
  filters.value = resetFilters
  searchQuery.value = ''; 
  
  // 그리드 데이터 초기화 (기존 API 호출하지 않음)
  rowData.value = []
  
  // 부모에게 초기화 완료 이벤트 전달
  emit('search', {
    data: [],
    filters: filters.value
  })
}

// CRUD & 정렬 관련 함수들

/**
 * 최상위 메뉴 생성 함수
 */
function openCreateRoot() { 
  openCreateWithParent(null) 
}

/**
 * 하위 메뉴 생성 함수
 * @param parent 부모 메뉴 아이템
 */
function openCreateChild(parent: MenuItem) { 
  openCreateWithParent(parent.id) 
}

/**
 * 부모 ID를 지정하여 메뉴 생성 함수
 * @param parentId 부모 메뉴 ID
 */
function openCreateWithParent(parentId: number | null) {
  editTarget.value = { 
    id: 0 as any, 
    title: '', 
    href: '', 
    icon: '', 
    parent_id: parentId, 
    sort_order: getNextSortOrder(parentId), 
    is_separator: false, 
    is_active: true 
  }
  dialogVisible.value = true
}

/**
 * 메뉴 편집 함수
 * @param row 편집할 메뉴 아이템
 */
function openEdit(row: MenuItem) { 
  editTarget.value = { ...row }; 
  dialogVisible.value = true 
}

/**
 * 다이얼로그 닫기 함수
 */
function closeDialog() { 
  dialogVisible.value = false; 
  editTarget.value = null 
}

/**
 * 다음 정렬 순서 계산 함수
 * @param parentId 부모 메뉴 ID
 * @returns 다음 정렬 순서
 */
function getNextSortOrder(parentId: number | null): number { 
  const s = menuData.value.filter(m => m.parent_id === parentId); 
  return s.length > 0 ? Math.max(...s.map(x => x.sort_order)) + 1 : 1 
}

// 상위 메뉴 옵션 계산 (Computed)
const parentMenuOptions = computed(() => [
  { label: '최상위 메뉴', value: null }, 
  ...menuData.value.filter(m => !m.is_separator && m.parent_id === null).map(m => ({ label: m.title, value: m.id }))
])

// 편집 스키마 정의
const editSchema = ref<any>(props.editSchema.length > 0 ? props.editSchema : [
  { $formkit: 'hidden', name: 'id' },
  { $formkit: 'primeCheckbox', name: 'is_separator', label: '구분선', outerClass: 'col-12' },
  { $formkit: 'primeInputText', name: 'title', label: '메뉴명', outerClass: 'col-6', validation: 'required', if: "$value.is_separator !== true" },
  { $formkit: 'primeInputText', name: 'href', label: '링크', outerClass: 'col-6', help: '예: /path/to/page', if: "$value.is_separator !== true" },
  { $formkit: 'primeInputText', name: 'icon', label: '아이콘', help: '예: pi pi-home', outerClass: 'col-6', if: "$value.is_separator !== true" },
  { $formkit: 'primeSelect', name: 'parent_id', label: '상위 메뉴', outerClass: 'col-6', options: parentMenuOptions, optionLabel: 'label', optionValue: 'value', placeholder: '상위 메뉴 선택', showClear: true, filter: true, if: "$value.is_separator !== true" },
  { $formkit: 'primeInputNumber', name: 'sort_order', label: '정렬 순서', outerClass: 'col-6', min: 0 },
  { $formkit: 'primeCheckbox', name: 'is_active', label: '활성', outerClass: 'col-6', if: "$value.is_separator !== true" },
  {
    $el: 'div',
    attrs: { class: 'col-12 w-full flex justify-end items-center gap-x-2 mt-2' },
    children: [
      { $cmp: 'Button', if: '$id', props: { label: '삭제', severity: 'danger', loading: deleting.value, onClick: () => deleteInDialog() } },
      { $cmp: 'Button', props: { label: '취소', severity: 'secondary', onClick: () => closeDialog() } },
      { $cmp: 'Button', props: { label: '저장', loading: saving.value, onClick: () => saveMenu() } },
    ],
  },
])

/**
 * 메뉴 저장 함수
 * 유효성 검사 후 API 호출하여 메뉴 저장
 */
async function saveMenu() {
  try {
    saving.value = true
    const body = { ...(editTarget.value as any) }
    
    // 기본 유효성 검사
    const isSeparator = Boolean(body?.is_separator)
    const title = (body?.title ?? '').toString().trim()
    const parentId = body?.parent_id ?? null
    
    if (!isSeparator && !title) {
      toast.add({ severity: 'warn', summary: '유효성 오류', detail: '메뉴명은 필수입니다.', life: 2500 })
      saving.value = false
      return
    }
    
    // 동일 부모 내 중복 메뉴명 방지(수정 시 자기 자신 제외)
    const dup = menuData.value.some(m => 
      (m.parent_id ?? null) === parentId && 
      (m.title ?? '').trim().toLowerCase() === title.toLowerCase() && 
      m.id !== (body?.id ?? 0)
    )
    if (!isSeparator && dup) {
      toast.add({ severity: 'warn', summary: '중복 메뉴명', detail: '같은 상위 메뉴에 동일한 이름이 있습니다.', life: 2500 })
      saving.value = false
      return
    }
    
    // href 형식(선택 입력): 입력 시 /로 시작 권장
    const href = (body?.href ?? '').toString().trim()
    if (!isSeparator && href && !href.startsWith('/')) {
      toast.add({ severity: 'warn', summary: '유효성 안내', detail: '링크는 /로 시작하는 경로 형식을 권장합니다.', life: 2500 })
      saving.value = false
      return
    }

    // API 호출 (수정 또는 생성)
    if ((editTarget.value as any)?.id && (editTarget.value as any).id !== 0) {
      await $fetch(`/api/menu/${(editTarget.value as any).id}`, { method: 'PUT', body })
    } else {
      await $fetch('/api/menu/create', { method: 'POST', body })
    }
    
    dialogVisible.value = false
    await refreshMenuData()
  } finally { 
    saving.value = false 
  }
}

/**
 * 다이얼로그에서 삭제 함수
 * 확인 후 메뉴 삭제
 */
function deleteInDialog() {
  const currentId = (editTarget.value as any)?.id
  if (!currentId) return
  
  confirmAction(async () => {
    try {
      deleting.value = true
      await $fetch(`/api/menu/${currentId}`, { method: 'DELETE' })
      dialogVisible.value = false
      await refreshMenuData()
    } finally {
      deleting.value = false
    }
  }, '삭제 완료', '메뉴를 삭제했습니다.', '삭제 확인', '해당 메뉴를 삭제하시겠습니까?', { 
    compact: true, 
    acceptLabel: '삭제', 
    rejectLabel: '취소', 
    icon: 'pi pi-exclamation-triangle' 
  })
}

/**
 * 메뉴 활성/비활성 토글 함수
 * @param menu 메뉴 아이템
 * @param nextValue 다음 상태값
 */
async function onToggleActive(menu: MenuItem, nextValue: boolean) { 
  const prev = menu.is_active; 
  menu.is_active = nextValue; 
  try { 
    await $fetch(`/api/menu/${menu.id}`, { method: 'PUT', body: { is_active: nextValue } }) 
  } catch { 
    menu.is_active = prev 
  } 
}

/**
 * 메뉴 데이터 새로고침 함수
 * 네비게이션 메뉴만 새로고침 (그리드 데이터는 검색 시에만 로드)
 */
async function refreshMenuData() { 
  // await loadMenu(); // 저장 프로시저로 대체되었으므로 제거
  const { refreshMenu } = useNavigationMenu(); 
  await refreshMenu() 
}

// AG Grid 관련 메서드들을 expose
const exposeMethods = {
  expandAllGrid: () => {},           // 전체 펼치기 (자식에서 구현)
  collapseAllGrid: () => {},         // 전체 접기 (자식에서 구현)
  applyGridFilter: () => {},         // 필터 적용 (자식에서 구현)
  exportExcel: () => {},             // 엑셀 내보내기 (자식에서 구현)
  openEdit,                          // 편집 함수
  getRowData: () => rowData.value,   // 행 데이터 반환
  getColumnDefs: () => columnDefs.value,  // 컬럼 정의 반환
  getSearchQuery: () => searchQuery.value  // 검색 쿼리 반환
}

// 부모 컴포넌트에서 메서드 호출 가능하도록 expose
defineExpose(exposeMethods)

// 컴포넌트 마운트 시 동적 검색 스키마만 로드
onMounted(async () => { 
  try {
    // 동적 검색 스키마 로드
    await loadDynamicSearchSchema()
    // 초기 데이터는 로드하지 않음 (검색 버튼 클릭 시에만 로드)
    // loadMenu() 
  } catch (error) {
    console.error('컴포넌트 마운트 중 오류:', error)
  }
})


</script>

<style scoped>
.field { margin-bottom: 1rem; }

/* 기본 필드 스타일 */
.field { margin-bottom: 1rem; }
</style>
