export default defineNuxtRouteMiddleware(async (to) => {
  // 로그인 페이지는 통과
  if (to.path === '/login') return

  const auth = useAuthStore()
  // SSR/초기 로드 시 인증/권한 로드 보장
  try { await auth.initAuth() } catch {}

  // 관리자 예외
  if (auth.user?.username === 'admin') return

  // 매칭되지 않는 라우트(없는 페이지)는 권한 검사 건너뛰고 Nuxt 404 처리에 맡김
  if (!to.matched?.length || to.name === '404') {
    return
  }

  // 로그인 강제는 페이지별 'auth' 미들웨어에 위임 (여기서는 권한만 검사)

  // 1) 페이지 메타의 permission이 있으면 우선 검사
  const required: any = (to.meta as any)?.permission
  if (required) {
    const resource = required.resource
    const action = required.action || 'read'
    if (!auth.hasPermission(resource, action)) {
      throw createError({ statusCode: 403, message: '이 페이지에 접근할 권한이 없습니다.' })
    }
    return
  }

  // 2) 메타 지정이 없으면 모든 경로를 메뉴 키로 기본 검사 (화이트리스트 제외)
  const publicWhitelist = new Set<string>(['/login'])
  if (!publicWhitelist.has(to.path)) {
    const path = to.path?.split('?')[0] || '/'
    const resource = `menu:${path}`
    if (!auth.hasPermission(resource, 'read')) {
      throw createError({ statusCode: 403, message: '이 페이지에 접근할 권한이 없습니다.' })
    }
  }
})


