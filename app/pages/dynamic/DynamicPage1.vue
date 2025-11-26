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

import type { Component } from 'vue'
import type { FormKitSchema } from '~/types/formkit-schema'
import AgGrid from '@/components/AgGrid.vue'
import CardGrid from '@/components/CardGrid.vue'

const route = useRoute()
const { menu, fetchMenuData, refreshMenu } = useNavigationMenu()

/**
 * 화면 구성 행 타입
 */
interface DisplayRow {
  menu_id: string
  contents_seq: number
  contents_type: 'grid' | 'card' | string
  contents_header?: string | null
  contents_width?: number | null
  contents_height?: number | null
  save_yn?: boolean | number | null
  add_yn?: boolean | number | null
  del_yn?: boolean | number | null
  row_click_case?: string | null
  row_click_target?: string | null
  grid_id?: string | null
  search_case?: string | null
  save_case?: string | null
  [key: string]: any
}

/**
 * 메뉴 노드 타입
 */
interface MenuNode {
  menu_id?: string | number
  title?: string
  label?: string
  text?: string
  name?: string
  icon?: string
  href?: string
  to?: string
  path?: string
  procedure_name?: string
  search_yn?: string | boolean | number
  save_yn?: string | boolean | number
  searchCondition?: string
  sname?: string
  search_name?: string
  child?: MenuNode[]
  [key: string]: any
}

/**
 * 렌더링 블록 타입
 */
interface ResolvedBlock {
  key: string
  component: Component | string
  props: Record<string, any>
  onGridReady?: (params: any) => void
  onCellDblClick?: (e: any) => void
  onCardDblClick?: (row: any) => void
  searchCase: string
  saveCase: string
}

/**
 * 현재 라우트에서 사용될 menuId를 결정한다.
 * 우선순위: params.menuId > query.menuId > meta.menuId
 */
const menuId = computed<string | null>(() => {
  const p = (route.params as any)?.menuId
  if (typeof p === 'string' && p.trim() !== '')
    return p
  const q = route.query?.menuId
  if (typeof q === 'string' && q.trim() !== '')
    return q
  const m = (route.meta as any)?.menuId
  if (typeof m === 'string' && m.trim() !== '')
    return m
  if (typeof m === 'number')
    return String(m)
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
const dynamicSchema = ref<FormKitSchema>([])
const isLoadingSchema = ref(false)
const finalSchema = computed<FormKitSchema>(() => Array.isArray(dynamicSchema.value) ? dynamicSchema.value : [])

/**
 * s_menu_display 구성을 로드한다.
 */
async function loadDisplayConfig(): Promise<void> {
  if (menuId.value == null) {
    rows.value = []
    return
  }

  try {
    loading.value = true
    errorMsg.value = null

    const res = await $fetch<any>('/api/stored-procedure/execute', {
      method: 'POST',
      body: {
        procedureName: 'sp_menu_display_info',
        parameters: { case: 'search', menu_id: String(menuId.value) },
      },
    })

    const rowsOut = Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res?.recordset)
        ? res.recordset
        : Array.isArray(res?.recordsets?.[0])
          ? res.recordsets[0]
          : []
    rows.value = rowsOut
    console.log('[DEBUG] 📋 Rows set (SP):', rows.value)
    contentData.value = []
  }
  catch (e: any) {
    console.error('[DEBUG] ❌ Display Config Error:', e)
    errorMsg.value = e?.message || '구성 정보를 불러오지 못했습니다.'
    rows.value = []
    contentData.value = []
  }
  finally {
    loading.value = false
  }
}

/**
 * 검색 버튼/폼 저장 이벤트 핸들러
 */
async function onSearchHandled(): Promise<void> {
  const list = Array.isArray(rows.value) ? rows.value : []
  const primary = list.find(r => Number(r?.contents_seq) === 1) || list[0]
  const procedureName = (effectiveMenuNode.value as MenuNode | undefined)?.procedure_name
  const searchCase = primary?.search_case || 'search'

  if (!procedureName)
    return

  try {
    const cleanFilters = buildFilterPayload(filters.value, finalSchema.value)
    const result = await $fetch<any>('/api/stored-procedure/execute', {
      method: 'POST',
      body: {
        procedureName,
        parameters: { case: searchCase, ...cleanFilters },
      },
    })

    const rowsOut = Array.isArray(result?.data)
      ? result.data
      : Array.isArray(result?.recordset)
        ? result.recordset
        : Array.isArray(result?.recordsets?.[0])
          ? result.recordsets[0]
          : []
    contentData.value = rowsOut
  }
  catch (err) {
    console.error('검색 실패:', err)
    contentData.value = []
  }
}

/**
 * 저장 버튼 핸들러
 */
async function onSaveHandled(): Promise<void> {
  const list = Array.isArray(rows.value) ? rows.value : []
  const primary = list.find(r => Number(r?.contents_seq) === 1) || list[0]
  const procedureName = (effectiveMenuNode.value as MenuNode | undefined)?.procedure_name
  const saveCase = primary?.save_case || 'save'

  if (!procedureName)
    return

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
        parameters: { case: saveCase, ...cleanFilters, menu_id: menuId.value },
      },
    })

    if (result?.success) {
      await onSearchHandled()
    }
  }
  catch (err) {
    console.error('저장 실패:', err)
  }
}

/**
 * 필터 깊은 정제 - 키가 '@' 또는 '$' 로 시작하는 모든 속성을 제거
 */
function sanitizeFilters(input: any): any {
  if (Array.isArray(input)) {
    return input.map(sanitizeFilters)
  }
  if (input && typeof input === 'object') {
    const out: Record<string, any> = {}
    for (const [key, value] of Object.entries(input)) {
      if (key.startsWith('@') || key.startsWith('$'))
        continue
      out[key] = sanitizeFilters(value)
    }
    return out
  }
  return input
}

/**
 * 폼 스키마에 정의된 필드만 추려서 payload를 만든다.
 */
function buildFilterPayload(raw: Record<string, any>, schema: FormKitSchema): Record<string, any> {
  const cleaned = sanitizeFilters(raw) || {}
  if (!Array.isArray(schema) || schema.length === 0)
    return cleaned

  const allowed = new Set<string>()
  for (const s of schema) {
    const name = (s as any)?.name
    if (typeof name === 'string' && name.trim() !== '')
      allowed.add(name)
  }

  const picked: Record<string, any> = {}
  for (const [k, v] of Object.entries(cleaned)) {
    if (allowed.has(k))
      picked[k] = v
  }
  return picked
}

/**
 * 경로 정규화 유틸
 */
function normalizePath(input?: string | null): string | undefined {
  if (!input)
    return undefined
  try {
    const trimmed = input.split('#')[0]?.split('?')[0] || input
    return trimmed.replace(/\/$/, '').toLowerCase()
  }
  catch {
    return input || undefined
  }
}

/**
 * 메뉴 아이템에서 경로 후보를 추출
 */
function extractItemPath(item: MenuNode | null | undefined): string | undefined {
  return normalizePath(item?.href || item?.to || item?.path)
}

/**
 * 현재 경로와 가장 잘 매칭되는 메뉴 노드를 찾는다.
 */
function findBestMenuNodeByPath(items: MenuNode[] | undefined, currentPath: string): MenuNode | undefined {
  if (!items || items.length === 0)
    return undefined

  const target = normalizePath(currentPath)
  let best: { score: number, node: MenuNode } | undefined

  const visit = (nodes: MenuNode[]) => {
    for (const node of nodes) {
      const p = extractItemPath(node)
      if (p && target) {
        let score = 0
        if (p === target)
          score = 1_000_000
        else if (target.startsWith(p))
          score = 500_000 + p.length
        else if (target.endsWith(p))
          score = 100_000 + p.length
        if (score > 0 && (!best || score > best.score))
          best = { score, node }
      }
      if (node.child?.length)
        visit(node.child)
    }
  }
  visit(items || [])
  return best?.node
}

const activeMenuItem = computed<MenuNode | undefined>(() =>
  findBestMenuNodeByPath(menu.value as MenuNode[] | undefined, route.path),
)

/**
 * 메뉴 트리에서 menu_id로 노드를 찾는다.
 */
function findMenuNodeById(id: string | null): MenuNode | undefined {
  if (!id || !Array.isArray(menu.value))
    return undefined

  const target = String(id)
  let found: MenuNode | undefined

  const visit = (nodes: MenuNode[]) => {
    for (const n of nodes) {
      if (String(n?.menu_id ?? '') === target) {
        found = n
        return
      }
      if (n.child?.length)
        visit(n.child)
      if (found)
        return
    }
  }
  visit(menu.value as MenuNode[])
  return found
}

const menuNodeById = computed<MenuNode | undefined>(() => findMenuNodeById(menuId.value))

/**
 * 우선순위: menuId로 찾은 노드 > 현재 경로로 추정한 노드
 */
const effectiveMenuNode = computed<MenuNode | undefined>(() => menuNodeById.value || activeMenuItem.value)

/**
 * 'Y'/'N', 1/0, true/false 등 다양한 형태를 boolean으로 강제 변환
 */
function coerceFlag(value: any, defaultValue: boolean): boolean {
  if (value === undefined || value === null)
    return defaultValue
  if (typeof value === 'boolean')
    return value
  if (typeof value === 'number')
    return value === 1
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase()
    return s === 'y' || s === '1' || s === 'true'
  }
  return defaultValue
}

// 메뉴 설정(search_yn/save_yn)에 따른 버튼 표시 여부
const showSearchButton = computed(() => coerceFlag(effectiveMenuNode.value?.search_yn, true))
const showSaveButton = computed(() => coerceFlag(effectiveMenuNode.value?.save_yn, false))

function extractItemTitle(item: MenuNode | null | undefined): string {
  return item?.title || item?.label || item?.text || item?.name || ''
}

function extractItemIcon(item: MenuNode | null | undefined): string {
  return item?.icon || 'pi pi-bookmark'
}

/**
 * 페이지 상단 아이콘
 */
const pageIcon = computed(() => {
  try {
    const node = activeMenuItem.value
    const icon = node ? extractItemIcon(node) : ''
    return icon || 'pi pi-bookmark'
  }
  catch {
    return 'pi pi-bookmark'
  }
})

/**
 * 브레드크럼 타이틀
 */
const breadcrumbTitle = computed(() => {
  try {
    const node = activeMenuItem.value
    const t = node ? extractItemTitle(node) : ''
    if (t)
      return t
  }
  catch { /* ignore */ }

  try {
    const idParam = menuId.value
    if (idParam && Array.isArray(menu.value)) {
      const targetId = String(idParam)
      let found: MenuNode | undefined

      const visit = (nodes: MenuNode[]) => {
        for (const n of nodes) {
          if (String(n?.menu_id ?? '') === targetId) {
            found = n
            return
          }
          if (n.child?.length)
            visit(n.child)
          if (found)
            return
        }
      }
      visit(menu.value as MenuNode[])
      const t2 = found ? extractItemTitle(found) : ''
      if (t2)
        return t2
    }
  }
  catch { /* ignore */ }

  const seg = route.path.replace(/\/$/, '').split('/').filter(Boolean).pop()
  return seg || 'home'
})

/**
 * 검색 폼 스키마를 동적으로 로드한다.
 */
async function loadDynamicSearchSchema(): Promise<void> {
  try {
    isLoadingSchema.value = true
    const node = effectiveMenuNode.value
    const gridId = node?.searchCondition || node?.sname || node?.search_name

    if (!gridId || String(gridId).trim() === '') {
      dynamicSchema.value = []
      return
    }

    const result = await $fetch<any>('/api/stored-procedure/execute', {
      method: 'POST',
      body: {
        procedureName: 'sp_grid_info',
        parameters: { case: 'search', grid_id: gridId },
      },
    })

    if (result?.success && Array.isArray(result?.data)) {
      const schemaItems: FormKitSchema = []

      for (const col of result.data) {
        const colType = col.col_type || ''
        const colId = col.col_id || ''
        const colName = col.col_name || ''
        const colSize = col.col_size || 'col-4'
        const colCode = col.col_code || ''
        const formkitType = colType.startsWith('prime') ? colType : `prime${colType}`

        const item: any = {
          $formkit: formkitType,
          name: colId,
          label: colName,
          outerClass: colSize,
        }

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
                  parameters: { case: 'search', plant_code: '1000', code_grp: colCode },
                },
              })
              const optionsData = Array.isArray(codes?.data)
                ? codes.data
                : Array.isArray(codes?.recordset)
                  ? codes.recordset
                  : []
              item.options = [{ code_name: '전체', code: null }, ...optionsData]
            }
            catch {
              item.options = [{ code_name: '전체', code: null }]
            }
          }
          else {
            item.options = [{ code_name: '전체', code: null }]
          }
        }
        schemaItems.push(item)
      }

      dynamicSchema.value = [...schemaItems]

      // 초기 필터 값 생성
      const newFilters: Record<string, any> = {}
      schemaItems.forEach((s: any) => { newFilters[s.name] = null })
      filters.value = { ...newFilters, ...filters.value }
    }
    else {
      dynamicSchema.value = []
    }
  }
  catch (error) {
    console.error('동적 스키마 로드 실패:', error)
    dynamicSchema.value = []
  }
  finally {
    isLoadingSchema.value = false
  }
}

/**
 * 메뉴 데이터 초기화 보장
 */
async function ensureMenuData(): Promise<void> {
  try {
    if (!Array.isArray(menu.value) || menu.value.length === 0) {
      await fetchMenuData()
    }
  }
  catch (error) {
    console.error('메뉴 데이터 로드 실패:', error)
  }
}

// 초기 마운트/메뉴 변경 시 구성 및 검색 스키마를 함께 로드
onMounted(async () => {
  await ensureMenuData()
  await Promise.all([loadDynamicSearchSchema(), loadDisplayConfig()])
})

watch(menuId, async () => {
  try {
    if (!Array.isArray(menu.value) || menu.value.length === 0) {
      await refreshMenu()
    }
  }
  catch (error) {
    console.error('메뉴 새로고침 실패:', error)
  }
  await Promise.all([loadDynamicSearchSchema(), loadDisplayConfig()])
})

// effectiveMenuNode가 변하면 스키마 재로드
watch(effectiveMenuNode, () => { loadDynamicSearchSchema() }, { immediate: true })

/**
 * 렌더링할 블록 목록 계산
 */
const resolvedBlocks = computed<ResolvedBlock[]>(() => {
  const list = Array.isArray(rows.value) ? rows.value : []
  console.log('[DEBUG] 🔧 resolvedBlocks - list:', list)

  if (list.length === 0) {
    console.log('[DEBUG] ⚠️ resolvedBlocks - Empty list, returning []')
    return []
  }

  // contents_seq 순서대로 정렬
  const sortedList = [...list].sort((a, b) => {
    const seqA = Number(a?.contents_seq || 0)
    const seqB = Number(b?.contents_seq || 0)
    return seqA - seqB
  })

  return sortedList.map((row, index): ResolvedBlock => {
    const type = (row?.contents_type || '').toLowerCase()
    const headerTitle = row?.contents_header || undefined
    const gridId = row?.grid_id || headerTitle || undefined
    const saveYn = coerceFlag(row?.save_yn, false)
    const addYn = coerceFlag(row?.add_yn, false)
    const delYn = coerceFlag(row?.del_yn, false)

    console.log('[DEBUG] 🎯 Block item:', { index, type, headerTitle, gridId, saveYn, row })

    if (type === 'grid') {
      return {
        key: `grid-${index}-${row.contents_seq}`,
        component: AgGrid,
        props: {
          title: headerTitle,
          columnDefs: [],
          rowData: contentData.value,
          editable: saveYn,
          treeData: false,
          gridId,
          rowSelect: false,
          editMode: 'doubleClick' as const,
          showAddRowButton: addYn,
          showDeleteRowButton: delYn,
          procedureName: effectiveMenuNode.value?.procedure_name || '',
          saveCase: row?.save_case || 'save',
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
      searchCase: 'search',
      saveCase: 'save',
    }
  })
})
</script>

<template>
  <div class="card flex flex-col gap-4">
    <!-- 상단 타이틀/액션 -->
    <div class="w-full mt-0 mb-2 border-b-1 border-gray-400 dark:border-gray-700">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-1">
<<<<<<< HEAD
          <i :class="pageIcon" class="text-black dark:text-white" />
          <h2 class="text-lg font-semibold text-black dark:text-white m-0">
            {{ breadcrumbTitle }}
          </h2>
=======
          <!-- <i :class="pageIcon" class="text-black dark:text-white"></i> -->
          <!-- <h2 class="text-lg font-semibold text-black dark:text-white m-0">{{ breadcrumbTitle }}</h2> -->
>>>>>>> 9d2272496cec08cc00373b6ce079cf67e2800e68
        </div>
        <div class="flex items-center gap-2">
          <Button v-if="showSearchButton" label="검색" severity="secondary" size="small" @click="onSearchHandled" />
          <Button v-if="showSaveButton" label="저장" severity="secondary" size="small" @click="onSaveHandled" />
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
        :is="block.component"
        v-for="block in resolvedBlocks"
        :key="block.key"
        ref="blockRefs"
        v-bind="block.props"
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
