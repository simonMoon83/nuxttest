export default defineNuxtRouteMiddleware(async (to) => {
  // 로그인 페이지는 통과
  if (to.path === '/login') return

  const auth = useAuthStore()
  // SSR/초기 로드 시 인증/권한 로드 보장
  try { await auth.initAuth() } catch {}

  // 관리자 예외
  if (auth.user?.username === 'admin') return

  // /admin 하위 경로는 메뉴 권한으로 기본 보호 (read 또는 write 보유 시 통과)
  if (to.path.startsWith('/admin')) {
    const path = to.path?.split('?')[0] || '/'
    const resource = `menu:${path}`
    // 기본 none 정책: 권한이 명시되지 않으면 접근 불가
    if (!auth.hasPermission(resource, 'read')) {
      throw createError({ statusCode: 403, statusMessage: '이 페이지에 접근할 권한이 없습니다.' })
    }
  }
})


