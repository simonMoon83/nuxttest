export default defineNuxtRouteMiddleware(async (to, from) => {
  const authStore = useAuthStore()

  // 로그인 페이지로 가는 경우 미들웨어 건너뛰기
  if (to.path === '/login') {
    return
  }

  // 클라이언트에서만 인증 확인
  try {
    console.log('🔍 미들웨어: 인증 확인 중...')
    await authStore.initAuth()

    if (!authStore.isLoggedIn) {
      console.log('❌ 사용자가 로그인되지 않음, 로그인 페이지로 리다이렉트')
      return navigateTo('/login')
    }

    console.log('✅ 인증 확인 완료, 페이지 접근 허용')
  }
  catch (error) {
    console.error('❌ 인증 확인 중 오류:', error)
    return navigateTo('/login')
  }
})
