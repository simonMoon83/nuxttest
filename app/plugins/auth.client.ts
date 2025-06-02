export default defineNuxtPlugin(async () => {
  const authStore = useAuthStore()
  
  // 클라이언트에서 앱이 시작될 때 인증 상태 확인
  await authStore.initAuth()
}) 