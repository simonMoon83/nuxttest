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
        @grid-ready="block.onGridReady"
        @cell-double-clicked="block.onCellDblClick"
        @card-double-clicked="block.onCardDblClick"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
// DynamicPage1: 현재 라우트 또는 탭의 메뉴 id를 기반으로 s_menu_display를 조회하여
// contents_type(grid|card)에 따라 AgGrid 또는 CardGrid를 순서대로 렌더링한다.

const route = useRoute()
const { menu, fetchMenuData, refreshMenu } = useNavigationMenu()

// 컴포넌트는 Nuxt 자동 등록을 사용하고, 동적 컴포넌트는 문자열 이름으로 참조한다.
import AgGrid from '@/components/AgGrid.vue'
import CardGrid from '@/components/CardGrid.vue'

type DisplayRow = {
  menu_id: string
  contents_seq: number
  contents_type: 'grid' | 'card' | string
  contents_header?: string | null
  contents_width?: number | null
  contents_height?: number | null
  save_yn?: boolean | number | null
  row_click_case?: string | null
  row_click_target?: string | null
  // 추가 필드 호환
  [key: string]: any
}

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

const rows = ref<DisplayRow[]>([])
const loading = ref(false)
const errorMsg = ref<string | null>(null)
const contentData = ref<any[]>([])

// 검색 폼 상태
const filters = ref<Record<string, any>>({})
const dynamicSchema = ref<any[]>([])
const isLoadingSchema = ref(false)
const finalSchema = computed(() => Array.isArray(dynamicSchema.value) ? dynamicSchema.value : [])

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
    const res = await $fetch<any>(url)
    rows.value = Array.isArray(res?.data) ? res.data : []
    contentData.value = []
  } catch (e: any) {
    errorMsg.value = e?.message || '구성 정보를 불러오지 못했습니다.'
    rows.value = []
    contentData.value = []
  } finally {
    loading.value = false
  }
}

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

function onSearchHandled() {
  // display 구성 보장 후, primary 컨텐츠에 맞는 조회 수행
  const list = Array.isArray(rows.value) ? rows.value : []
  const primary = list.find(r => Number(r?.contents_seq) === 1) || list[0]
  const procedureName = (effectiveMenuNode.value as any)?.procedure_name
  const searchCase = (primary as any)?.search_case || 'search'
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
      const rowsOut = Array.isArray(result?.data) ? result.data
        : Array.isArray(result?.recordset) ? result.recordset
        : Array.isArray(result?.recordsets?.[0]) ? result.recordsets[0]
        : []
      contentData.value = rowsOut
    } catch (err) {
      contentData.value = []
    }
  })()
}

function onSaveHandled() {
  const list = Array.isArray(rows.value) ? rows.value : []
  const primary = list.find(r => Number(r?.contents_seq) === 1) || list[0]
  const procedureName = (effectiveMenuNode.value as any)?.procedure_name
  const saveCase = (primary as any)?.save_case || 'save'
  if (!procedureName) { return }
  ;(async () => {
    try {
      const cleanFilters = buildFilterPayload(filters.value, finalSchema.value)
      await $fetch<any>('/api/stored-procedure/execute', {
        method: 'POST',
        body: {
          procedureName,
          parameters: { case: saveCase, ...cleanFilters, menu_id: menuId.value }
        }
      })
    } catch {}
  })()
}

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
function normalizePath(input?: string | null) {
  if (!input) return undefined
  try {
    const trimmed = input.split('#')[0]?.split('?')[0] || input
    return trimmed.replace(/\/$/, '').toLowerCase()
  } catch { return input || undefined }
}
function extractItemPath(item: any) {
  return normalizePath(item?.href || item?.to || item?.path)
}
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
const effectiveMenuNode = computed(() => menuNodeById.value || activeMenuItem.value)

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

const showSearchButton = computed(() => coerceFlag((effectiveMenuNode.value as any)?.search_yn, true))
const showSaveButton = computed(() => coerceFlag((effectiveMenuNode.value as any)?.save_yn, false))

function extractItemTitle(item: any) { return item?.title || item?.label || item?.text || item?.name || '' }
function extractItemIcon(item: any) { return item?.icon || 'pi pi-bookmark' }

const pageIcon = computed(() => {
  try {
    const node = activeMenuItem.value
    const icon = node ? extractItemIcon(node) : ''
    return icon || 'pi pi-bookmark'
  } catch { return 'pi pi-bookmark' }
})

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
              let optionsData = Array.isArray(codes?.data) ? codes.data
                : Array.isArray(codes?.recordset) ? codes.recordset
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
watch(effectiveMenuNode, () => { loadDynamicSearchSchema() }, { immediate: true })

// 렌더링 블록 변환: s_menu_display 한 행 -> 실제 컴포넌트 + props
const resolvedBlocks = computed(() => {
  const list = Array.isArray(rows.value) ? rows.value : []
  if (list.length === 0) return []
  // DynamicPage1은 단일 컨텐츠: contents_seq == 1 우선, 없으면 첫 항목
  const primary = list.find((r) => Number(r?.contents_seq) === 1) || list[0]
  const type = (primary?.contents_type || '').toLowerCase()
  const headerTitle = primary?.contents_header || undefined
  if (type === 'grid') {
    return [
      {
        key: 'primary-grid',
        component: AgGrid,
        props: {
          title: headerTitle,
          columnDefs: [],
          rowData: contentData.value,
          editable: false,
          treeData: false,
          gridId: headerTitle,
        },
        onGridReady: (_params: any) => {},
        onCellDblClick: (_e: any) => {},
        onCardDblClick: undefined,
      },
    ]
  }
  if (type === 'card') {
    return [
      {
        key: 'primary-card',
        component: CardGrid,
        props: {
          title: headerTitle,
          columnDefs: [],
          rowData: contentData.value,
          cols: 1,
        },
        onGridReady: undefined,
        onCellDblClick: undefined,
        onCardDblClick: (_row: any) => {},
      },
    ]
  }
  return [
    {
      key: 'primary-unknown',
      component: 'div',
      props: { class: 'text-color-secondary' },
      onGridReady: undefined,
      onCellDblClick: undefined,
      onCardDblClick: undefined,
    },
  ]
})
</script>

<style scoped>
.loading { opacity: 0.6; pointer-events: none; }
</style>


