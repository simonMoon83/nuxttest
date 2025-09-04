export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore()
  // admin 사용자면 모든 페이지 접근 허용 (클라이언트 폴백)
  if (auth.user?.username === 'admin') return
  const required: any = (to.meta as any)?.permission
  if (required) {
    const resource = required.resource
    const action = required.action || 'read'
    if (!auth.hasPermission(resource, action)) {
      throw createError({ statusCode: 403, statusMessage: '이 페이지에 접근할 권한이 없습니다.' })
    }
    return
  }
  // 메타에 permission이 없으면 메뉴 키로 자동 확인 (read 또는 write 소유 시 통과)
  const path = to.path?.split('?')[0] || '/'
  const resource = `menu:${path}`
  if (!auth.hasPermission(resource, 'read')) {
    throw createError({ statusCode: 403, statusMessage: '이 페이지에 접근할 권한이 없습니다.' })
  }
})


