export default defineNuxtPlugin((nuxtApp) => {
  const router = useRouter()

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

  function extractItemTitle(item: SidebarItem): string | undefined {
    return item.title || item.label || item.text || item.name
  }

  function findMenuTitleByPath(items: SidebarItem[] | undefined, currentPath: string): string | undefined {
    if (!items || items.length === 0)
      return undefined
    const target = normalizePath(currentPath)
    let bestMatch: { score: number; title: string } | undefined
    const visit = (nodes: SidebarItem[]) => {
      for (const node of nodes) {
        const nodePath = extractItemPath(node)
        const nodeTitle = extractItemTitle(node)
        if (nodePath && nodeTitle && target) {
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
          visit(node.child)
      }
    }
    visit(items)
    return bestMatch?.title
  }

  function updateTitlesFromMenu() {
    try {
      const tabsStore = useTabsStore()
      const { menu } = useNavigationMenu()
      const items = menu.value as unknown as SidebarItem[]
      if (!items?.length)
        return
      const active = tabsStore.tabs.find(t => t.key === tabsStore.activeKey)
      if (!active)
        return
      const titleFromMenu = findMenuTitleByPath(items, active.path)
      if (titleFromMenu && titleFromMenu !== active.title)
        tabsStore.updateTitle(active.key, titleFromMenu)
    }
    catch {}
  }

  router.afterEach(() => {
    updateTitlesFromMenu()
  })

  try {
    const { menu, fetchMenuData } = useNavigationMenu()
    if (!menu.value?.length)
      fetchMenuData().catch(() => {})
    watch(menu, () => updateTitlesFromMenu(), { immediate: true })
  }
  catch {}
})


