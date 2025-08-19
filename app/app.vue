<script setup>
useHead({
  title: 'SMART MES',
})

// Favicon 자동 로딩
const { loadFaviconFromSettings } = useFavicon()

onMounted(() => {
  loadFaviconFromSettings()
})

// 전역 페이지 타이틀 (메뉴명 우선) - 탭 컴포넌트 바로 아래 표시
const route = useRoute()
const { menu, fetchMenuData } = useNavigationMenu()

function normalizePath(input) {
  if (!input) return undefined
  try {
    const trimmed = input.split('#')[0]?.split('?')[0] || input
    return trimmed.replace(/\/$/, '').toLowerCase()
  } catch { return input }
}
function extractItemPath(item) {
  return normalizePath(item?.href || item?.to || item?.path || item?.url || item?.link)
}
function extractItemTitle(item) {
  return item?.title || item?.label || item?.text || item?.name
}
function extractItemIcon(item) {
  return item?.icon || ''
}
function findBestMenuNodeByPath(items, currentPath) {
  if (!items || items.length === 0) return undefined
  const target = normalizePath(currentPath)
  let best
  const visit = (nodes) => {
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
  visit(items)
  return best?.node
}

onMounted(() => { fetchMenuData().catch(() => {}) })
// 최적 노드와 조상 경로를 함께 찾기 (상위메뉴 표시용)
function findBestMenuNodeAndPath(items, currentPath) {
  if (!items || items.length === 0) return undefined
  const target = normalizePath(currentPath)
  let best
  const stack = []
  const visit = (nodes) => {
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

const pageLineage = computed(() => {
  try {
    const r = findBestMenuNodeAndPath(menu.value, route.path)
    return r?.path || []
  } catch { return [] }
})

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
const pageIcon = computed(() => {
  try {
    const lineage = pageLineage.value
    const leaf = lineage.length ? lineage[lineage.length - 1] : undefined
    const icon = leaf ? extractItemIcon(leaf) : ''
    return icon || 'pi pi-bookmark'
  } catch { return 'pi pi-bookmark' }
})

const breadcrumbTitle = computed(() => {
  try {
    const lineage = pageLineage.value
    if (lineage.length > 0) {
      const titles = lineage.map(n => extractItemTitle(n)).filter(Boolean)
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
</script>

<template>
  <NuxtLayout>
    <!-- DynamicTabs는 AppTopbar 내부로 이동 -->
    <!-- 탭 바로 아래 전역 타이틀: 탭이 없어도 항상 표시 -->
    <div v-if="!hideGlobalTitle" class="mt-1 mb-2 border-b-1 border-gray-400 dark:border-gray-700">
      <div class="flex items-center gap-1">
        <i :class="pageIcon" class="text-primary"></i>
        <h2 class="text-xl font-semibold text-gray-600 dark:text-gray-100">{{ breadcrumbTitle }}</h2>
      </div>
    </div>
    <NuxtPage keepalive />
  </NuxtLayout>
</template>

<style lang='scss'>
@use 'App.scss';
</style>
