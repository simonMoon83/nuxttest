
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
          <Button label="저장" severity="secondary" size="small" @click="onSave" v-if="showSaveButton" />
          
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
  searchCase?: string       // 조회 호출 시 case 값
  saveCase?: string         // 저장 호출 시 case 값
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
  showSaveButton: true,
  searchCase: 'search',
  saveCase: 'save'
})

// Composable 함수들 사용
 
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
  'save': [result: any]                 // 저장 완료 이벤트
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
 * 검색 실행 함수
 */
async function onSearch() { 
  try {
    console.log('검색 시작 - 필터 값:', filters.value)
    
    // 동적 프로시저 호출
    const requestBody = {
      procedureName: props.procedureName,
      parameters: {
       case: props.searchCase,
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

    // 그리드 데이터 먼저 초기화하여 이전 결과가 남지 않도록 함
    rowData.value = []
    await nextTick()

    // 결과 정규화: data, recordset, recordsets[0] 우선순위로 사용
    let rows: any[] = []
    if (Array.isArray(result?.data)) rows = result.data
    else if (Array.isArray(result?.recordset)) rows = result.recordset
    else if (Array.isArray(result?.recordsets?.[0])) rows = result.recordsets[0]

    if (result.success && Array.isArray(rows)) {
      rowData.value = [...rows]
      emit('search', {
        data: rows,
        filters: filters.value
      })
    } else {
      rowData.value = []
      emit('search', {
        data: [],
        filters: filters.value,
        error: result?.error || result?.message || '검색에 실패했습니다.'
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
 * 저장 실행 함수
 * onSearch와 동일 로직으로 호출하되 case만 저장용 값 사용
 */
async function onSave() { 
  try {
    console.log('저장 시작 - 필터 값:', filters.value)
    const requestBody = {
      procedureName: props.procedureName,
      parameters: {
        case: props.saveCase,
        menu_name: filters.value.title || null,
        menu_url: filters.value.href || null,
        use_yn: filters.value.activeOnly || null
      }
    }
    console.log('프로시저 저장 요청:', requestBody)
    const result = await $fetch<any>('/api/stored-procedure/execute', {
      method: 'POST',
      body: requestBody
    })
    console.log('프로시저 저장 응답:', result)
    // 저장은 그리드 데이터(rowData)를 변경하지 않음
    if (result.success) {
      emit('save', {
        data: result.data ?? null,
        filters: filters.value
      })
    } else {
      emit('save', {
        data: null,
        filters: filters.value,
        error: result.error || result.message || '저장에 실패했습니다.'
      })
    }
  } catch (error) {
    console.error('저장 중 오류 발생:', error)
    emit('save', {
      data: null,
      filters: filters.value,
      error: error instanceof Error ? error.message : '저장 중 오류가 발생했습니다.'
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
 

/**
 * 메뉴 편집 함수
 * @param row 편집할 메뉴 아이템
 */
 

/**
 * 다이얼로그 닫기 함수
 */
 

/**
 * 다음 정렬 순서 계산 함수
 * @param parentId 부모 메뉴 ID
 * @returns 다음 정렬 순서
 */
 

// 상위 메뉴 옵션 계산 (Computed)
 

// 편집 스키마 정의
 

/**
 * 메뉴 저장 함수
 * 유효성 검사 후 API 호출하여 메뉴 저장
 */
 

/**
 * 다이얼로그에서 삭제 함수
 * 확인 후 메뉴 삭제
 */
 

 

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
