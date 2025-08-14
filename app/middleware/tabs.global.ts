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

function normalizePath(input: string | undefined): string | undefined {
  if (!input)
    return undefined
  const trimmed = input.split('#')[0]?.split('?')[0] || input
  return trimmed.replace(/\/$/, '').toLowerCase()
}

function extractItemPath(item: SidebarItem): string | undefined {
  return normalizePath(item.href || item.to || item.path || item.url || item.link)
}

function flattenLinkPaths(items: SidebarItem[] | undefined, set: Set<string>) {
  if (!items)
    return
  for (const it of items) {
    const p = extractItemPath(it)
    if (p)
      set.add(p)
    if (it.child?.length)
      flattenLinkPaths(it.child, set)
  }
}

let hasInitializedAfterReload = false

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server)
    return

  const tabsStore = useTabsStore()
  // ensureTabForRoute 내부의 buildTabTitle이 메뉴 기반 제목을 우선 확인하므로
  // 사이드바 클릭 없이 프로그래매틱 네비게이션으로 진입한 경우에도 메뉴명이 탭 제목으로 적용됩니다.

  // 로그인/에러 페이지 등 탭 제외 조건
  const exclude = to.meta?.noTab === true
    || to.path.startsWith('/login')
    || to.path === '/404'

  if (exclude)
    return

  // 전체 새로고침 후 첫 진입 라우트는 탭 생성 생략
  if (!hasInitializedAfterReload) {
    hasInitializedAfterReload = true
    return
  }

  // 링크 없는 항목(그룹/헤더 등)은 탭 생성 금지: 메뉴가 로드된 경우에만 필터링하고,
  // 아직 로드 전/에러 시에는 생성 허용하여 사용자 흐름을 막지 않음
  try {
    const { menu } = useNavigationMenu()
    const items = menu.value as unknown as SidebarItem[] | undefined
    if (items && items.length > 0) {
      const allowed = new Set<string>()
      flattenLinkPaths(items, allowed)
      const normalized = normalizePath(to.path)
      if (!normalized || !allowed.has(normalized))
        return
    }
  }
  catch {
    // 무시: 탭 생성을 막지 않음
  }

  // 동적 라우팅 포함한 전체 경로 기준으로 탭 관리
  tabsStore.ensureTabForRoute(to as unknown as ReturnType<typeof useRoute>)
})


