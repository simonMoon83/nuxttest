interface User {
  id: number
  username: string
  email: string
  full_name: string
}

interface LoginResponse {
  success: boolean
  user: User
}

interface AuthResponse {
  user: User
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const isLoggedIn = computed(() => !!user.value)
  const isLoading = ref(false)

  const login = async (username: string, password: string) => {
    isLoading.value = true
    
    try {
      const data = await $fetch<LoginResponse>('/api/auth/login', {
        method: 'POST',
        body: { username, password }
      })
      
      user.value = data.user
      await navigateTo('/')
      return { success: true }
    } catch (error: any) {
      console.error('Login error:', error)
      return { 
        success: false, 
        error: error.data?.message || 'Login failed' 
      }
    } finally {
      isLoading.value = false
    }
  }

  const logout = async () => {
    try {
      await $fetch('/api/auth/logout', { method: 'POST' })
      user.value = null
      await navigateTo('/login')
    } catch (error) {
      console.error('Logout error:', error)
      // 에러가 발생해도 로컬 상태는 클리어
      user.value = null
      await navigateTo('/login')
    }
  }

  const checkAuth = async () => {
    try {
      const data = await $fetch<AuthResponse>('/api/auth/me')
      user.value = data.user
      return true
    } catch (error) {
      console.log('인증 확인 실패:', error)
      user.value = null
      return false
    }
  }

  const initAuth = async () => {
    // 이미 사용자 정보가 있다면 재확인하지 않음 (클라이언트에서만)
    if (process.client && user.value) {
      return true
    }
    
    try {
      const result = await checkAuth()
      return result
    } catch (error) {
      console.error('인증 초기화 실패:', error)
      user.value = null
      return false
    }
  }

  return {
    user: readonly(user),
    isLoggedIn,
    isLoading,
    login,
    logout,
    checkAuth,
    initAuth
  }
}) 