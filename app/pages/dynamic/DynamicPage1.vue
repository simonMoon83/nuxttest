<script setup lang="ts">
// DynamicPage1: 현재 라우트 또는 탭의 메뉴 id를 기반으로 s_menu_display를 조회하여
// contents_type(grid|card)에 따라 AgGrid 또는 CardGrid를 순서대로 렌더링한다.

/**
 * 개요
 * - 메뉴 트리(`useNavigationMenu`)에서 현재 활성 메뉴/파라미터(`menuId`)를 해석
 * - s_menu_display(API)를 조회해 컨텐츠 유형(grid|card)을 판별하고 해당 컴포넌트를 렌더링
 * - 메뉴의 `procedure_name`과 동적 검색 스키마(sp_grid_info)를 사용해 조회/저장(케이스) 수행
 * - 코드값(select 옵션)은 sp_code_info를 통해 동적으로 로드
 *
 * 구성
 * - 상태/계산: menuId, rows, contentData, filters, dynamicSchema 등
 * - 데이터 로드: loadDisplayConfig, loadDynamicSearchSchema
 * - 액션: onSearchHandled, onSaveHandled
 * - 헬퍼: sanitizeFilters, buildFilterPayload, path/menu 탐색 유틸 등
 */

const route = useRoute()
const { menu, fetchMenuData, refreshMenu } = useNavigationMenu()

// 컴포넌트는 Nuxt 자동 등록을 사용하고, 동적 컴포넌트는 문자열 이름으로 참조한다.
import AgGrid from '@/components/AgGrid.vue'
import CardGrid from '@/components/CardGrid.vue'

interface DisplayRow {
  menu_id: string
  contents_seq: number
  contents_type: 'grid' | 'card' | string
  contents_header?: string | null
  contents_width?: number | null
  contents_height?: number | null
  save_yn?: boolean | number | null
  row_click_case?: string | null
  row_click_target?: string | null
  grid_id?: string | null  // s_grid_master의 grid_id (schema.vue에서 설정)
  search_case?: string | null  // 검색 시 사용할 case 값
  save_case?: string | null  // 저장 시 사용할 case 값
  // 추가 필드 호환
  [key: string]: any
}

/**
 * 현재 라우트에서 사용될 menuId를 결정한다.
 * 우선순위: params.menuId > query.menuId > meta.menuId
 */
const menuId = computed<string | null>(() => {
  // 우선순위: params.menuId > query.menuId > meta.menuId
  const p = (route.params as any)?.menuId
  if (typeof p === 'string' && p.trim() !== '') return p
  const q = route.query?.menuId
  if (typeof q === 'string' && q.trim() !== '') return q
  const m = (route.meta as any)?.menuId
  if (typeof m === 'string' && m.trim() !== '') return m
  if (typeof m === 'number') return String(m)
  return null
})

// 렌더링 데이터/상태
const rows = ref<DisplayRow[]>([])
const loading = ref(false)
const errorMsg = ref<string | null>(null)
const contentData = ref<any[]>([])

// 자식 컴포넌트 참조 (v-for에서 수집)
const blockRefs = ref<any[]>([])

// 검색 폼 상태
const filters = ref<Record<string, any>>({})
const dynamicSchema = ref<any[]>([])
const isLoadingSchema = ref(false)
const finalSchema = computed(() => Array.isArray(dynamicSchema.value) ? dynamicSchema.value : [])

/**
 * s_menu_display 구성을 로드한다.
 * - endpoint: GET /api/display/:menuId[?procedure_name=...]
 * - 결과를 `rows`에 보관하고, 컨텐츠 데이터는 초기화한다.
 */
async function loadDisplayConfig() {
  if (menuId.value == null) { rows.value = []; return }
  try {
    loading.value = true
    errorMsg.value = null
    // procedure_name만 전달 (sname은 여기서 사용하지 않음)
    const proc = (effectiveMenuNode.value as any)?.procedure_name || ''
    const qs = new URLSearchParams()
    if (proc) qs.set('procedure_name', proc)
    const queryStr = qs.toString()
    const url = queryStr
      ? `/api/display/${encodeURIComponent(String(menuId.value))}?${queryStr}`
      : `/api/display/${encodeURIComponent(String(menuId.value))}`
    console.log('[DEBUG] 🔍 Display Config URL:', url)
    const res = await $fetch<any>(url)
    console.log('[DEBUG] 📦 Display API Response:', res)
    rows.value = Array.isArray(res?.data) ? res.data : []
    console.log('[DEBUG] 📋 Rows set:', rows.value)
    contentData.value = []
  } catch (e: any) {
    console.error('[DEBUG] ❌ Display Config Error:', e)
    errorMsg.value = e?.message || '구성 정보를 불러오지 못했습니다.'
    rows.value = []
    contentData.value = []
  } finally {
    loading.value = false
  }
}

// 초기 마운트/메뉴 변경 시 구성 및 검색 스키마를 함께 로드
onMounted(async () => {
  // 메뉴 데이터 보장 후 구성 로드
  try {
    if (!Array.isArray(menu.value) || menu.value.length === 0) {
      await fetchMenuData()
    }
  } catch {}
  await Promise.all([loadDynamicSearchSchema(), loadDisplayConfig()])
})
watch(menuId, async () => {
  try {
    if (!Array.isArray(menu.value) || menu.value.length === 0) {
      await refreshMenu()
    }
  } catch {}
  await Promise.all([loadDynamicSearchSchema(), loadDisplayConfig()])
})

// 동적 검색 스키마 로드 함수는 effectiveMenuNode 선언 이후에 정의합니다 (아래쪽 참고)

// search_name 변경 시 스키마 재로드 (선언 이후에 watch 등록)

/**
 * 검색 버튼/폼 저장 이벤트 핸들러
 * - effectiveMenuNode.procedure_name의 search 케이스로 SP를 호출해 `contentData`를 채운다.
 * - filters는 스키마 기반으로 정제되어 전달된다.
 */
function onSearchHandled() {
  // display 구성 보장 후, primary 컨텐츠에 맞는 조회 수행
  const list = Array.isArray(rows.value) ? rows.value : []
  const primary = list.find(r => Number(r?.contents_seq) === 1) || list[0]
  const procedureName = (effectiveMenuNode.value as any)?.procedure_name
  const searchCase = primary?.search_case || 'search'
  if (!procedureName) { return }
  ;(async () => {
    try {
      const cleanFilters = buildFilterPayload(filters.value, finalSchema.value)
      const result = await $fetch<any>('/api/stored-procedure/execute', {
        method: 'POST',
        body: {
          procedureName,
          parameters: { case: searchCase, ...cleanFilters }
        }
      })
      const rowsOut = Array.isArray(result?.data)
? result.data
        : Array.isArray(result?.recordset)
? result.recordset
        : Array.isArray(result?.recordsets?.[0])
? result.recordsets[0]
        : []
      contentData.value = rowsOut
    } catch (err) {
      console.error('검색 실패:', err)
      contentData.value = []
    }
  })()
}

/**
 * 저장 버튼 핸들러
 * - 1순위: 첫 블록 컴포넌트가 save()를 노출하면 이를 호출해 컴포넌트별 저장을 수행
 * - 2순위: 폴백으로 기존 방식(폼 필터 기반)으로 SP 호출
 */
function onSaveHandled() {
  const list = Array.isArray(rows.value) ? rows.value : []
  const primary = list.find(r => Number(r?.contents_seq) === 1) || list[0]
  const procedureName = (effectiveMenuNode.value as any)?.procedure_name
  const saveCase = primary?.save_case || 'save'
  if (!procedureName) { return }
  ;(async () => {
    try {
      // 1) 자식 컴포넌트에 save()가 노출되어 있으면 우선 사용
      const inst = Array.isArray(blockRefs.value) ? blockRefs.value[0] : null
      if (inst && typeof (inst as any).save === 'function') {
        await (inst as any).save()
        return
      }
      // 2) 없으면 폼 필터 기반 기본 저장으로 폴백
      const cleanFilters = buildFilterPayload(filters.value, finalSchema.value)
      const result = await $fetch<any>('/api/stored-procedure/execute', {
        method: 'POST',
        body: {
          procedureName,
          parameters: { case: saveCase, ...cleanFilters, menu_id: menuId.value }
        }
      })
      if (result?.success) {
        // 저장 성공 후 검색 재실행
        await onSearchHandled()
      }
    } catch (err) {
      console.error('저장 실패:', err)
    }
  })()
}

/**
 * 필터 깊은 정제
 * - 키가 '@' 또는 '$' 로 시작하는 모든 속성을 제거한다.
 */
function sanitizeFilters(input: any): any {
  // 깊은 정제: 키가 @ 또는 $ 로 시작하는 모든 속성 제거
  if (Array.isArray(input)) {
    return input.map(sanitizeFilters)
  }
  if (input && typeof input === 'object') {
    const out: Record<string, any> = {}
    for (const [key, value] of Object.entries(input)) {
      if (key.startsWith('@') || key.startsWith('$')) continue
      out[key] = sanitizeFilters(value)
    }
    return out
  }
  return input
}

/**
 * 폼 스키마에 정의된 필드만 추려서 payload를 만든다.
 */
function buildFilterPayload(raw: Record<string, any>, schema: any[]): Record<string, any> {
  const cleaned = sanitizeFilters(raw) || {}
  if (!Array.isArray(schema) || schema.length === 0) return cleaned
  const allowed = new Set<string>()
  for (const s of schema) {
    const name = s?.name
    if (typeof name === 'string' && name.trim() !== '') allowed.add(name)
  }
  const picked: Record<string, any> = {}
  for (const [k, v] of Object.entries(cleaned)) {
    if (allowed.has(k)) picked[k] = v
  }
  return picked
}

// 현재 라우트 경로와 가장 잘 매칭되는 메뉴 항목 찾기 (app.vue/DefaultPage와 동일한 방식 간소화)
/**
 * 경로 정규화 유틸
 */
function normalizePath(input?: string | null) {
  if (!input) return undefined
  try {
    const trimmed = input.split('#')[0]?.split('?')[0] || input
    return trimmed.replace(/\/$/, '').toLowerCase()
  } catch { return input || undefined }
}
/**
 * 메뉴 아이템에서 경로 후보를 추출
 */
function extractItemPath(item: any) {
  return normalizePath(item?.href || item?.to || item?.path)
}
/**
 * 현재 경로와 가장 잘 매칭되는 메뉴 노드를 찾는다.
 * - 동일 경로 완전일치 > prefix > suffix 순으로 스코어링
 */
function findBestMenuNodeByPath(items: any[] | undefined, currentPath: string) {
  if (!items || items.length === 0) return undefined
  const target = normalizePath(currentPath)
  let best: any
  const visit = (nodes: any[]) => {
    for (const node of nodes) {
      const p = extractItemPath(node)
      if (p && target) {
        let score = 0
        if (p === target) score = 1_000_000
        else if (target.startsWith(p)) score = 500_000 + p.length
        else if (target.endsWith(p)) score = 100_000 + p.length
        if (score > 0 && (!best || score > best.score)) best = { score, node }
      }
      if (node.child?.length) visit(node.child)
    }
  }
  visit(items || [])
  return best?.node
}

const activeMenuItem = computed(() => findBestMenuNodeByPath(menu.value, route.path))

/**
 * 메뉴 트리에서 menu_id로 노드를 찾는다.
 */
function findMenuNodeById(id: string | null) {
  if (!id || !Array.isArray(menu.value)) return undefined
  const target = String(id)
  let found: any
  const visit = (nodes: any[]) => {
    for (const n of nodes) {
      if (String((n as any)?.menu_id ?? '') === target) { found = n; return }
      if (n.child?.length) visit(n.child)
      if (found) return
    }
  }
  visit(menu.value)
  return found
}

const menuNodeById = computed(() => findMenuNodeById(menuId.value))
/**
 * 우선순위: menuId로 찾은 노드 > 현재 경로로 추정한 노드
 */
const effectiveMenuNode = computed(() => menuNodeById.value || activeMenuItem.value)

/**
 * 'Y'/'N', 1/0, true/false 등 다양한 형태를 boolean으로 강제 변환
 */
function coerceFlag(value: any, defaultValue: boolean): boolean {
  if (value === undefined || value === null) return defaultValue
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase()
    return s === 'y' || s === '1' || s === 'true'
  }
  return defaultValue
}

// 메뉴 설정(search_yn/save_yn)에 따른 버튼 표시 여부
const showSearchButton = computed(() => coerceFlag((effectiveMenuNode.value as any)?.search_yn, true))
const showSaveButton = computed(() => coerceFlag((effectiveMenuNode.value as any)?.save_yn, false))

function extractItemTitle(item: any) { return item?.title || item?.label || item?.text || item?.name || '' }
function extractItemIcon(item: any) { return item?.icon || 'pi pi-bookmark' }

/**
 * 페이지 상단 아이콘
 */
const pageIcon = computed(() => {
  try {
    const node = activeMenuItem.value
    const icon = node ? extractItemIcon(node) : ''
    return icon || 'pi pi-bookmark'
  } catch { return 'pi pi-bookmark' }
})

/**
 * 브레드크럼 타이틀
 * - 우선 현재 경로 매칭 결과 사용, 없으면 menuId 조회, 최후엔 경로 세그먼트
 */
const breadcrumbTitle = computed(() => {
  try {
    // 우선 현재 경로 기반 매칭
    const node = activeMenuItem.value
    const t = node ? extractItemTitle(node) : ''
    if (t) return t
  } catch {}
  // 보조: menuId로 탐색
  try {
    const idParam = menuId.value
    if (idParam && Array.isArray(menu.value)) {
      const targetId = String(idParam)
      let found: any
      const visit = (nodes: any[]) => {
        for (const n of nodes) {
          if (String((n as any)?.menu_id ?? '') === targetId) { found = n; return }
          if (n.child?.length) visit(n.child)
          if (found) return
        }
      }
      visit(menu.value)
      const t2 = found ? extractItemTitle(found) : ''
      if (t2) return t2
    }
  } catch {}
  const seg = route.path.replace(/\/$/, '').split('/').filter(Boolean).pop()
  return seg || 'home'
})

// 디버그 로그 제거 완료

// 동적 검색 스키마 로드: s_menu_info.search_name 을 grid_id로 사용 (effectiveMenuNode 선언 이후)
/**
 * 검색 폼 스키마를 동적으로 로드한다.
 * - sp_grid_info(search)로 필드 메타를 가져와 FormKit 스키마 구성
 * - primeSelect 유형은 sp_code_info(search)로 코드값 옵션을 채운다.
 * - 스키마 기반 초기 filters를 구성한다.
 */
async function loadDynamicSearchSchema() {
  try {
    isLoadingSchema.value = true
    const node: any = effectiveMenuNode?.value as any
    const gridId = node?.searchCondition || node?.sname || node?.search_name
    if (!gridId || String(gridId).trim() === '') { dynamicSchema.value = []; return }

    const result = await $fetch<any>('/api/stored-procedure/execute', {
      method: 'POST',
      body: {
        procedureName: 'sp_grid_info',
        parameters: { case: 'search', grid_id: gridId }
      }
    })

    if (result?.success && Array.isArray(result?.data)) {
      const schemaItems: any[] = []
      for (const col of result.data) {
        const colType = col.col_type || ''
        const colId = col.col_id || ''
        const colName = col.col_name || ''
        const colSize = col.col_size || 'col-4'
        const colCode = col.col_code || ''
        const formkitType = colType.startsWith('prime') ? colType : `prime${colType}`
        const item: any = { $formkit: formkitType, name: colId, label: colName, outerClass: colSize }
        if (formkitType === 'primeSelect') {
          item.optionLabel = 'code_name'
          item.optionValue = 'code'
          item.placeholder = '전체'
          item.showClear = true
          if (colCode && String(colCode).trim() !== '') {
            try {
              const codes = await $fetch<any>('/api/stored-procedure/execute', {
                method: 'POST',
                body: {
                  procedureName: 'sp_code_info',
                  parameters: { case: 'search', plant_code: '1000', code_grp: colCode }
                }
              })
              let optionsData = Array.isArray(codes?.data)
? codes.data
                : Array.isArray(codes?.recordset)
? codes.recordset
                : []
              item.options = [{ code_name: '전체', code: null }, ...optionsData]
            } catch {
              item.options = [{ code_name: '전체', code: null }]
            }
          } else {
            item.options = [{ code_name: '전체', code: null }]
          }
        }
        schemaItems.push(item)
      }
      dynamicSchema.value = [...schemaItems]
      // 초기 필터 값 생성
      const newFilters: any = {}
      schemaItems.forEach((s) => { newFilters[s.name] = null })
      filters.value = { ...newFilters, ...filters.value }
    } else {
      dynamicSchema.value = []
    }
  } catch {
    dynamicSchema.value = []
  } finally {
    isLoadingSchema.value = false
  }
}

// search_name 변경 시 스키마 재로드 (effectiveMenuNode 선언 이후에 등록)
// effectiveMenuNode가 변하면 관련 grid_id와 스키마가 달라질 수 있으므로 즉시 재조회
watch(effectiveMenuNode, () => { loadDynamicSearchSchema() }, { immediate: true })

// schema.vue에서 설정한 grid_id를 사용하여 s_grid_detail에서 컬럼 정보를 동적으로 로드
const resolvedBlocks = computed(() => {
  const list = Array.isArray(rows.value) ? rows.value : []
  console.log('[DEBUG] 🔧 resolvedBlocks - list:', list)
  if (list.length === 0) {
    console.log('[DEBUG] ⚠️ resolvedBlocks - Empty list, returning []')
    return []
  }

  // contents_seq 순서대로 정렬하여 여러 블록 지원
  const sortedList = [...list].sort((a, b) => {
    const seqA = Number(a?.contents_seq || 0)
    const seqB = Number(b?.contents_seq || 0)
    return seqA - seqB
  })

  return sortedList.map((row, index) => {
    const type = (row?.contents_type || '').toLowerCase()
    const headerTitle = row?.contents_header || undefined
    // schema.vue에서 설정한 grid_id 사용 (없으면 contents_header를 fallback으로 사용)
    const gridId = row?.grid_id || headerTitle || undefined
    const saveYn = coerceFlag(row?.save_yn, false)
    console.log('[DEBUG] 🎯 Block item:', { index, type, headerTitle, gridId, saveYn, row })

    if (type === 'grid') {
      return {
        key: `grid-${index}-${row.contents_seq}`,
        component: AgGrid,
        props: {
          title: headerTitle,
          columnDefs: [],
          rowData: contentData.value,
          editable: saveYn,  // save_yn이 true면 편집 가능
          treeData: false,
          gridId: gridId,  // schema.vue에서 설정한 grid_id 사용
          rowSelect: true,
          editMode: 'doubleClick' as const,
        },
        onGridReady: (_params: any) => {},
        onCellDblClick: (_e: any) => {},
        onCardDblClick: undefined,
        searchCase: row?.search_case || 'search',
        saveCase: row?.save_case || 'save',
      }
    }
    if (type === 'card') {
      return {
        key: `card-${index}-${row.contents_seq}`,
        component: CardGrid,
        props: {
          title: headerTitle,
          columnDefs: [],
          rowData: contentData.value,
          cols: row?.contents_width || 3,
        },
        onGridReady: undefined,
        onCellDblClick: undefined,
        onCardDblClick: (_row: any) => {},
        searchCase: row?.search_case || 'search',
        saveCase: row?.save_case || 'save',
      }
    }
    return {
      key: `unknown-${index}-${row.contents_seq}`,
      component: 'div',
      props: { class: 'text-color-secondary p-4' },
      onGridReady: undefined,
      onCellDblClick: undefined,
      onCardDblClick: undefined,
    }
  })
})
</script>

<template>
  <div class="card flex flex-col gap-4">
    <!-- 상단 타이틀/액션 -->
    <div class="w-full mt-1 mb-2 border-b-1 border-gray-400 dark:border-gray-700">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-1">
          <i :class="pageIcon" class="text-primary"></i>
          <h2 class="text-xl font-semibold text-primary">{{ breadcrumbTitle }}</h2>
        </div>
        <div class="flex items-center gap-2">
          <Button label="검색" severity="secondary" size="small" v-if="showSearchButton" @click="onSearchHandled" />
          <Button label="저장" severity="secondary" size="small" v-if="showSaveButton" @click="onSaveHandled" />
        </div>
      </div>
    </div>

    <!-- 검색 영역 -->
    <div class="w-full pb-2 mb-2 border-b border-gray-200 dark:border-gray-700">
      <div class="compact-form">
        <!-- 동적 스키마 기반 폼. 저장(Submit) 대신 data-saved 이벤트로 검색 트리거 -->
        <FormKitDataEdit
          v-if="finalSchema.length > 0"
          :key="`schema-${finalSchema.length}`"
          v-model="filters"
          :schema="finalSchema"
          :debug-schema="false"
          :debug-data="false"
          form-class="form-horizontal grid-12"
          submit-label=""
          @data-saved="onSearchHandled"
        />
      </div>
    </div>

    <!-- 컨텐츠 블록 -->
    <div class="w-full flex flex-col gap-4">
      <component
        v-for="block in resolvedBlocks"
        :key="block.key"
        :is="block.component"
        v-bind="block.props"
        ref="blockRefs"
        @grid-ready="block.onGridReady"
        @cell-double-clicked="block.onCellDblClick"
        @card-double-clicked="block.onCardDblClick"
      />
    </div>
  </div>
</template>

<style scoped>
/* 로딩 상태에서 인터랙션 제한 */
.loading {
  opacity: 0.6;
  pointer-events: none;
}
</style>
