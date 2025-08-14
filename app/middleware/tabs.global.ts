export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server)
    return

  const tabsStore = useTabsStore()
  // 로그인/에러 페이지 등 탭 제외 조건
  const exclude = to.meta?.noTab === true
    || to.path.startsWith('/login')
    || to.path === '/404'

  if (!exclude) {
    // 동적 라우팅 포함한 전체 경로 기준으로 탭 관리
    tabsStore.ensureTabForRoute(to as unknown as ReturnType<typeof useRoute>)
  }
})


