export default defineNuxtPlugin(async () => {
  const authStore = useAuthStore()

  // 클라이언트에서 앱이 시작될 때 인증 상태 확인
  try {
    await authStore.initAuth()
  }
  catch (error) {
    console.error('Auth plugin error:', error)
    // 오류가 발생해도 앱 로딩을 중단하지 않음
  }
}) 