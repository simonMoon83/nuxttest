interface MenuItem {
  href?: string
  title?: string
  icon?: string
  child?: MenuItem[]
  component?: any
}

interface ApiResponse {
  success: boolean
  data: MenuItem[]
}

export function useNavigationMenu() {
  const separator = h('hr')

  // 메뉴 데이터를 캐시하기 위한 reactive 변수
  const menuData = ref<MenuItem[]>([])
  const isLoading = ref(false)
  const error = ref<Error | null>(null)

  // 메뉴 데이터를 API에서 가져오는 함수
  const fetchMenuData = async (): Promise<MenuItem[]> => {
    if (menuData.value.length > 0) {
      return menuData.value // 이미 로드된 데이터가 있으면 재사용
    }

    try {
      isLoading.value = true
      error.value = null
      
      const response = await $fetch<ApiResponse>('/api/menu')
      
      if (response && response.success) {
        const rawMenu = response.data

        const buildPrunedMenu = (items: MenuItem[]): MenuItem[] => {
          const result: MenuItem[] = []
          for (const item of items) {
            const prunedChildren = Array.isArray(item.child) ? buildPrunedMenu(item.child) : undefined
            result.push({ ...item, child: prunedChildren })
          }
          return result
        }

        let finalMenu: MenuItem[] = rawMenu

        // 클라이언트에서 존재하지 않는 라우트 제거 (Router 경고 방지)
        if (import.meta.client) {
          try {
            const router = useRouter()
            const routeExists = (path?: string) => {
              if (!path) return false
              if (/^https?:\/\//i.test(path)) return true
              const resolved = router.resolve(path)
              return resolved.matched && resolved.matched.length > 0
            }

            const prune = (items: MenuItem[]): MenuItem[] => {
              const acc: MenuItem[] = []
              for (const current of items) {
                const children = Array.isArray(current.child) ? prune(current.child) : undefined
                // href가 명시되어 있으면(빈 문자열 포함) 일단 노출. 미지정(undefined)인 경우만 라우터 확인
                const selfValid = (current.href !== undefined) ? true : routeExists(current.href)
                if ((current as any).component || selfValid || (children && children.length > 0)) {
                  acc.push({ ...current, child: children })
                }
              }
              return acc
            }

            // 1) 존재하지 않는 라우트 제거
            finalMenu = prune(rawMenu)

            // 2) 권한 필터링 (읽기 권한이 없는 메뉴 숨김)
            try {
              const auth = useAuthStore()
              // /admin 하위만 권한 필터링, 그 외는 공개로 간주
              const mapKey = (href?: string) => (href && href.startsWith('/admin') ? `menu:${href}` : undefined)
              const byPerm = (items: MenuItem[]): MenuItem[] => {
                const acc: MenuItem[] = []
                for (const current of items) {
                  const children = Array.isArray(current.child) ? byPerm(current.child) : undefined
                  const key = mapKey(current.href)
                  const okSelf = key ? auth.hasPermission(key, 'read') : true
                  if (okSelf || (children && children.length > 0)) {
                    acc.push({ ...current, child: children })
                  }
                }
                return acc
              }
              finalMenu = byPerm(finalMenu)
            } catch (e2) {
              console.warn('메뉴 권한 필터링 경고:', e2)
            }
          } catch (e) {
            console.warn('메뉴 라우트 필터링 중 경고:', e)
          }
        } else {
          finalMenu = buildPrunedMenu(rawMenu)
        }

        menuData.value = finalMenu
      } else {
        throw new Error('메뉴 데이터 로드 실패')
      }
    } catch (err) {
      console.error('메뉴 데이터 조회 실패:', err)
      error.value = err as Error
      
      // 에러 발생시 기본 메뉴로 폴백
      menuData.value = [
        {
          href: '/',
          title: 'Home',
          icon: 'pi pi-fw pi-home',
        },
        {
          component: markRaw(separator),
        },
        {
          title: 'PrimeVue',
          icon: 'pi pi-prime',
          child: [
            { href: '/prime/datatable', title: 'DataTable' },
            { href: '/prime/messages', title: 'Messages' },
          ],
        },
        {
          title: 'Forms',
          icon: 'pi pi-check-square',
          child: [
            { href: '/form', title: 'Basic' },
            { href: '/form/toggle', title: 'Edit / View' },
          ],
        },
        {
          title: 'UI',
          icon: 'pi pi-image',
          child: [
            { href: '/ui/uno', title: 'UnoCSS' },
            { href: '/ui/icons', title: 'Icons' },
            { href: '/ui/tiptap', title: 'TipTap' },
          ],
        },
        {
          title: 'Data',
          icon: 'pi pi-server',
          child: [
            { href: '/data/stores', title: 'Pinia Stores' },
            { href: '/data/colada', title: 'Pinia Colada' },
            { href: '/data/i18n', title: 'Localization' },
            { href: '/data/server', title: 'Server' },
          ],
        },
        {
          title: 'Content',
          icon: 'pi pi-book',
          child: [
            { href: '/cms/markdown', title: 'Markdown' },
            { href: '/cms/component', title: 'Component' },
          ],
        },
      ]
    } finally {
      isLoading.value = false
    }

    return menuData.value
  }

  // computed를 사용하여 반응형 메뉴 제공 (권한 기반 필터 적용)
  const menu = computed(() => {
    try {
      const auth = useAuthStore()
      // 모든 메뉴에 권한 필터 적용 (read 또는 write 보유 시 보임)
      const mapKey = (item: any) => (item?.permission_key ? item.permission_key : (item?.href ? `menu:${item.href}` : undefined))
      const byPerm = (items: MenuItem[]): MenuItem[] => {
        const acc: MenuItem[] = []
        for (const current of items) {
          const key = mapKey(current as any)
          const okSelf = key ? auth.hasPermission(key, 'read') : true
          // 상위메뉴 권한이 없으면 하위도 표시하지 않음
          if (!okSelf) continue
          const children = Array.isArray(current.child) ? byPerm(current.child) : undefined
          acc.push({ ...current, child: children })
        }
        return acc
      }
      return byPerm(menuData.value)
    } catch {
      return menuData.value
    }
  })

  // 메뉴 새로고침 함수
  const refreshMenu = async () => {
    menuData.value = []
    await fetchMenuData()
  }

  return {
    menu,
    isLoading,
    error,
    fetchMenuData,
    refreshMenu: fetchMenuData
  }
}
