<script setup lang="ts">
definePageMeta({
  layout: false,
  name: 'Login',
  noTab: true,
})

const authStore = useAuthStore()
const form = reactive({
  username: '',
  password: '',
})

const error = ref('')

// 이미 로그인된 경우 홈으로 리디렉션
onMounted(async () => {
  await authStore.initAuth()
  if (authStore.isLoggedIn) {
    await navigateTo('/')
  }
})

async function handleLogin() {
  error.value = ''

  if (!form.username || !form.password) {
    error.value = '사용자명과 비밀번호를 입력해주세요.'
    return
  }

  try {
    const result = await authStore.login(form.username, form.password)

    if (!result.success) {
      error.value = result.error || '로그인에 실패했습니다.'
    }
  }
  catch (err: any) {
    error.value = '로그인 중 오류가 발생했습니다.'
    console.error('Login error:', err)
  }
}

// 페이지 제목 설정
useHead({
  title: '로그인 - Nuxt 3 PrimeVue',
})
</script>

<template>
  <div class="bg-gray-50 flex min-h-screen items-center justify-center">
    <div class="max-w-md w-full space-y-8">
      <div>
        <h2 class="text-3xl text-gray-900 font-extrabold mt-6 text-center">
          로그인
        </h2>
        <p class="text-sm text-gray-600 mt-2 text-center">
          Nuxt 3 + PrimeVue 관리자 패널
        </p>
      </div>

      <Card class="p-6">
        <template #content>
          <form class="space-y-6" @submit.prevent="handleLogin">
            <div>
              <label for="username" class="text-sm text-gray-700 font-medium block">
                사용자명
              </label>
              <InputText
                id="username"
                v-model="form.username"
                type="text"
                required
                class="mt-1 w-full"
                placeholder="사용자명을 입력하세요"
                :disabled="authStore.isLoading"
              />
            </div>

            <div>
              <label for="password" class="text-sm text-gray-700 font-medium block">
                비밀번호
              </label>
              <Password
                id="password"
                v-model="form.password"
                required
                class="mt-1 w-full"
                placeholder="비밀번호를 입력하세요"
                :feedback="false"
                toggle-mask
                :disabled="authStore.isLoading"
              />
            </div>

            <div v-if="error" class="text-sm text-red-600">
              <i class="pi pi-exclamation-triangle mr-2" />
              {{ error }}
            </div>

            <div>
              <Button
                type="submit"
                :loading="authStore.isLoading"
                class="w-full"
                label="로그인"
                icon="pi pi-sign-in"
              />
            </div>
          </form>
        </template>
      </Card>

      <div class="text-sm text-gray-600 text-center">
        <div class="p-3 border border-yellow-200 rounded-md bg-yellow-50">
          <p class="text-yellow-800">
            <i class="pi pi-info-circle mr-2" />
            기본 계정: <strong>admin</strong> / <strong>admin123</strong>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.min-h-screen {
  min-height: 100vh;
}
</style>
