export interface TabItem {
  key: string
  title: string
  fullPath: string
  path: string
  query?: Record<string, any>
  params?: Record<string, any>
}

function buildTabKey(route: ReturnType<typeof useRoute>): string {
  return route.fullPath
}

function buildTabTitle(route: ReturnType<typeof useRoute>): string {
  const metaName = route.meta?.name as string | undefined
  if (metaName && typeof metaName === 'string' && metaName.length > 0)
    return metaName

  if (route.name && typeof route.name === 'string')
    return route.name

  const path = route.path.replace(/\/$/, '')
  const seg = path.split('/').filter(Boolean).pop()
  return seg ? seg : 'home'
}

export const useTabsStore = defineStore('tabs', () => {
  const router = useRouter()
  const tabs = ref<TabItem[]>([])
  const activeKey = ref<string>('')

  function ensureTabForRoute(route: ReturnType<typeof useRoute>) {
    const key = buildTabKey(route)
    const existing = tabs.value.find(t => t.key === key)
    if (!existing) {
      tabs.value.push({
        key,
        title: buildTabTitle(route),
        fullPath: route.fullPath,
        path: route.path,
        query: { ...route.query },
        params: { ...route.params },
      })
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

  function updateTitle(key: string, title: string) {
    const tab = tabs.value.find(t => t.key === key)
    if (tab)
      tab.title = title
  }

  return {
    tabs,
    activeKey,
    ensureTabForRoute,
    setActive,
    removeTab,
    closeOthers,
    updateTitle,
  }
})


