export default defineNuxtRouteMiddleware(async (to, from) => {
  const authStore = useAuthStore()
  
  // 로그인 페이지로 가는 경우 미들웨어 건너뛰기
  if (to.path === '/login') {
    return
  }
  
  // 서버사이드와 클라이언트사이드 모두에서 실행
  try {
    await authStore.initAuth()
    
    if (!authStore.isLoggedIn) {
      console.log('사용자가 로그인되지 않음, 로그인 페이지로 리다이렉트')
      return navigateTo('/login')
    }
  } catch (error) {
    console.error('인증 확인 중 오류:', error)
    return navigateTo('/login')
  }
}) 