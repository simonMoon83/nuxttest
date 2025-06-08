<script setup lang='ts'>
import { onMounted, ref } from 'vue'

const { addElement } = useFormKitSchema()
const authStore = useAuthStore()

// SSR hydration mismatch 방지를 위해 클라이언트에서만 초기화
const data = ref<any>(null)
const error = ref('')
const isClient = ref(false)

// 클라이언트에서만 실행
onMounted(async () => {
  isClient.value = true
  data.value = { username: 'admin', password: 'admin123', rememberMe: false }

  // 이미 로그인된 경우 홈으로 리디렉션
  try {
    await authStore.initAuth()
    if (authStore.isLoggedIn) {
      await navigateTo('/')
    }
  }
  catch (error) {
    console.error('인증 확인 중 오류:', error)
  }
})

const schema = ref<any>([
  addElement('h5', ['SMART MES 로그인']),
  {
    $formkit: 'primeInputText',
    name: 'username',
    label: '사용자명',
    outerClass: 'col-12',
    validation: 'required',
  },
  {
    $formkit: 'primePassword',
    name: 'password',
    label: '비밀번호',
    outerClass: 'col-12',
    validation: 'required',
    toggleMask: true, // 암호 미리보기 버튼 활성화
  },
  {
    $formkit: 'primeCheckbox',
    name: 'rememberMe',
    label: '로그인 상태 유지',
    outerClass: 'col-12',
  },
])

async function handleLogin() {
  if (!data.value)
    return

  error.value = ''
  console.warn('로그인 시도:', data.value)

  if (!data.value.username || !data.value.password) {
    error.value = '사용자명과 비밀번호를 입력해주세요.'
    return
  }

  try {
    const result = await authStore.login(data.value.username, data.value.password)
    console.warn('로그인 결과:', result)

    if (result && result.success) {
      console.warn('로그인 성공!')
      await navigateTo('/')
    }
    else {
      error.value = result?.error || '로그인에 실패했습니다.'
    }
  }
  catch (err: any) {
    error.value = '로그인 중 오류가 발생했습니다.'
    console.error('Login error:', err)
  }
}

async function submitHandler(_formData: any) {
  // FormKitDataEdit의 @data-saved 이벤트 처리
  await handleLogin()
}

function resetForm() {
  if (data.value) {
    data.value = { username: '', password: '', rememberMe: false }
    error.value = ''
  }
}

definePageMeta({
  layout: false,
  title: '로그인',
})

useHead({
  title: 'SMART MES 로그인',
})
</script>

<template>
  <div class="card flex flex-wrap gap-10 min-h-screen items-center justify-center">
    <div class="basis-1/3 w-full md:basis-1/4">
      <div class="mb-4 flex items-center justify-between">
        <h2>SMART MES 로그인</h2>
      </div>

      <!-- 클라이언트에서만 FormKit 렌더링 -->
      <div v-if="isClient && data" class="min-w-25rem">
        <FormKitDataEdit
          v-model="data"
          :schema="schema"
          :debug-schema="false"
          :debug-data="false"
          submit-label=""
          @data-saved="submitHandler"
        />

        <!-- 버튼 그룹 -->
        <div class="col-12 mt-4 flex gap-x-2 w-full items-center justify-end">
          <button
            type="button"
            class="p-button p-component p-button-outlined p-button-secondary"
            @click="resetForm"
          >
            초기화
          </button>
          <button
            type="submit"
            class="p-button p-component"
            :disabled="authStore.isLoading"
            @click="handleLogin"
          >
            <i v-if="authStore.isLoading" class="pi pi-spinner pi-spin mr-2" />
            로그인
          </button>
        </div>
      </div>

      <!-- 로딩 상태 표시 -->
      <div v-else-if="!isClient" class="min-w-25rem">
        <div class="p-8 flex items-center justify-center">
          <i class="pi pi-spinner pi-spin mr-2" />
          <span>로딩 중...</span>
        </div>
      </div>

      <!-- 에러 메시지 표시 -->
      <div v-if="error" class="mt-4 p-3 border border-red-200 rounded-md bg-red-50">
        <p class="text-sm text-red-600">
          <i class="pi pi-exclamation-triangle mr-2" />
          {{ error }}
        </p>
      </div>
    </div>

    <!-- 데이터 조건 출력 부분 -->
    <div class="mt-8 w-full">
      <div class="p-3 border border-yellow-200 rounded-md bg-yellow-50">
        <h3 class="text-yellow-800 font-medium">
          <i class="pi pi-info-circle mr-2" />
          기본 계정: admin / admin123
        </h3>
      </div>

      <!-- 클라이언트에서만 데이터 표시 -->
      <div v-if="isClient && data" class="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
        <pre class="text-sm text-gray-800 dark:text-gray-200">{{ JSON.stringify(data, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>

<style lang='scss' scoped>
:deep(.formkit-actions) {
  display: none !important;
}
</style>
