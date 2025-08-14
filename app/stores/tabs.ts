import { useNavigationMenu } from '../composables/navigation'

export interface TabItem {
  key: string
  title: string
  fullPath: string
  path: string
  query?: Record<string, any>
  params?: Record<string, any>
}

type SidebarItem = {
  href?: string
  to?: string
  path?: string
  url?: string
  link?: string
  title?: string
  label?: string
  name?: string
  text?: string
  child?: SidebarItem[]
}

function buildTabKey(route: ReturnType<typeof useRoute>): string {
  return route.fullPath
}

function normalizePath(input: string | undefined): string | undefined {
  if (!input)
    return undefined
  try {
    // 제거: 쿼리/해시
    const trimmed = input.split('#')[0]?.split('?')[0] || input
    // 소문자 + 트레일링 슬래시 제거
    return trimmed.replace(/\/$/, '').toLowerCase()
  }
  catch {
    return input
  }
}

function extractItemPath(item: SidebarItem): string | undefined {
  return normalizePath(item.href || item.to || item.path || item.url || item.link)
}

function extractItemTitle(item: SidebarItem): string | undefined {
  return item.title || item.label || item.text || item.name
}

function findMenuTitleByPath(items: SidebarItem[] | undefined, currentPath: string): string | undefined {
  if (!items || items.length === 0)
    return undefined

  const target = normalizePath(currentPath)
  let bestMatch: { score: number; title: string } | undefined

  const visit = (nodes: SidebarItem[], depth: number) => {
    for (const node of nodes) {
      const nodePath = extractItemPath(node)
      const nodeTitle = extractItemTitle(node)

      if (nodePath && nodeTitle && target) {
        // 점수: 정확 일치 > 긴 접두사 일치 > 긴 접미사 일치
        let score = 0
        if (nodePath === target)
          score = 1_000_000
        else if (target.startsWith(nodePath))
          score = 500_000 + nodePath.length
        else if (target.endsWith(nodePath))
          score = 100_000 + nodePath.length

        if (score > 0 && (!bestMatch || score > bestMatch.score))
          bestMatch = { score, title: nodeTitle }
      }

      if (node.child?.length)
        visit(node.child, depth + 1)
    }
  }

  visit(items, 0)
  return bestMatch?.title
}

function buildTabTitle(route: ReturnType<typeof useRoute>): string {
  // 1) 메뉴에서 제목 찾기 (클라이언트 전용, 접두/접미 일치 기반)
  if (import.meta.client) {
    try {
      const { menu } = useNavigationMenu()
      const titleFromMenu = findMenuTitleByPath(menu.value as unknown as SidebarItem[], route.path)
      if (titleFromMenu)
        return titleFromMenu
    }
    catch {}
  }

  // 2) 페이지 메타 name
  const metaName = route.meta?.name as string | undefined
  if (metaName && typeof metaName === 'string' && metaName.length > 0)
    return metaName

  // route.name 은 동적 라우트에서 'cms-slug' 같은 기술명이라 사용자에게 부적합할 수 있어 사용하지 않음

  const path = route.path.replace(/\/$/, '')
  const seg = path.split('/').filter(Boolean).pop()
  return seg ? seg : 'home'
}

export const useTabsStore = defineStore('tabs', () => {
  const router = useRouter()
  const tabs = ref<TabItem[]>([])
  const activeKey = ref<string>('')
  const pendingTitleByPath = ref<Record<string, string>>({})
  
  // 기존 탭 제목 대량 교정은 비활성화.
  // - 생성 시점에 메뉴명/대기제목/메타/경로로 결정하고,
  // - 라우트 완료 훅(plugin)에서 활성 탭만 보정합니다.

  function ensureTabForRoute(route: ReturnType<typeof useRoute>) {
    const key = buildTabKey(route)
    const existing = tabs.value.find(t => t.key === key)
    if (!existing) {
      const originalPath = route.path
      const normalizedPath = normalizePath(originalPath) || originalPath
      const pendingTitle = pendingTitleByPath.value[normalizedPath]
      // pendingTitle이 있으면 최우선 사용, 없으면 메뉴/메타/경로에서 도출
      const title = pendingTitle || buildTabTitle(route)
      const newTab: TabItem = {
        key,
        title,
        fullPath: route.fullPath,
        path: originalPath,
        query: { ...route.query },
        params: { ...route.params },
      }
      tabs.value.push(newTab)
      if (pendingTitle)
        delete pendingTitleByPath.value[normalizedPath]
    }
    activeKey.value = key
  }

  function setActive(key: string) {
    activeKey.value = key
  }

  function removeTab(key: string) {
    const index = tabs.value.findIndex(t => t.key === key)
    if (index === -1)
      return

    const removed = tabs.value.splice(index, 1)[0]

    if (activeKey.value === key) {
      const fallback = tabs.value[index - 1] || tabs.value[index] || null
      if (fallback) {
        activeKey.value = fallback.key
        router.push(fallback.fullPath)
      }
      else {
        activeKey.value = ''
      }
    }

    return removed
  }

  function closeOthers(key: string) {
    const current = tabs.value.find(t => t.key === key)
    if (!current)
      return
    tabs.value = [current]
    activeKey.value = current.key
  }

  function closeAll() {
    tabs.value = []
    activeKey.value = ''
  }

  function updateTitle(key: string, title: string) {
    const tab = tabs.value.find(t => t.key === key)
    if (tab)
      tab.title = title
  }

  function setPendingTitle(path: string, title: string) {
    const normalizedPath = normalizePath(path) || path
    pendingTitleByPath.value[normalizedPath] = title
  }

  return {
    tabs,
    activeKey,
    ensureTabForRoute,
    setActive,
    removeTab,
    closeOthers,
    updateTitle,
    setPendingTitle,
    closeAll,
  }
})


