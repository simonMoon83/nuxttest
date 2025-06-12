export default defineNuxtPlugin(async () => {
  const authStore = useAuthStore()

  // 서버에서는 인증 확인을 하지 않음 (hydration mismatch 방지)
  if (import.meta.server) {
    return
  }

  // 클라이언트에서만 인증 상태 확인
  if (import.meta.client) {
    try {
      await authStore.initAuth()
    }
    catch (error) {
      console.error('Auth plugin error:', error)
      // 오류가 발생해도 앱 로딩을 중단하지 않음
    }
  }
}) 