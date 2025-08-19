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

async function handleLogin() {
  if (!data.value) return

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
    } else {
      error.value = result?.error || '로그인에 실패했습니다.'
    }
  } catch (err: any) {
    error.value = '로그인 중 오류가 발생했습니다.'
    console.error('Login error:', err)
  }
}

function resetForm() {
  if (data.value) {
    data.value = { username: '', password: '', rememberMe: false }
    error.value = ''
  }
}

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
    toggleMask: true,
  },
  {
    $formkit: 'primeCheckbox',
    name: 'rememberMe',
    label: '로그인 상태 유지',
    outerClass: 'col-12',
  },
  
  // 버튼 그룹
  {
    $el: 'div',
    attrs: {
      class: 'col-12 w-full mt-6 space-y-3'
    },
    children: [
      // 초기화 버튼 - PrimeVue Button 컴포넌트 사용
      {
        $cmp: 'Button',
        props: {
          label: '초기화',
          outlined: true,
          severity: 'secondary',
          size: 'large',
          class: 'w-full transition-all duration-200 hover:shadow-lg',
          onClick: () => resetForm()
        }
      },
      
      // 로그인 버튼 - PrimeVue Button 컴포넌트 사용
      {
        $cmp: 'Button',
        props: {
          label: authStore.isLoading ? '로그인 중...' : '로그인',
          size: 'large',
          class: 'w-full transition-all duration-200 hover:shadow-lg',
          loading: authStore.isLoading,
          disabled: authStore.isLoading,
          onClick: () => handleLogin()
        }
      }
    ]
  }
])

async function submitHandler(_formData: any) {
  // FormKitDataEdit의 @data-saved 이벤트 처리 (사용하지 않음)
  // await handleLogin()
}

definePageMeta({
  layout: false,
  title: '로그인',
  hideTitle: true,
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
      </div>

      <!-- 로딩 상태 표시 -->
      <div v-else-if="!isClient" class="min-w-25rem">
        <div class="p-8 flex items-center justify-center">
          <i class="pi pi-spinner pi-spin mr-2" />
          <span>로딩 중...</span>
        </div>
      </div>

      <!-- 에러 메시지 표시 -->
      <div v-if="error" class="mt-4 p-3 border border-red-200 rounded-md bg-red-50 dark:border-red-800 dark:bg-red-900/20">
        <p class="text-sm text-red-600 dark:text-red-400">
          <i class="pi pi-exclamation-triangle mr-2" />
          {{ error }}
        </p>
      </div>
    </div>

    <!-- 안내 정보 -->
    <div class="mt-8 w-full max-w-md">
      <div class="p-3 border border-yellow-200 rounded-md bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20">
        <h3 class="text-yellow-800 dark:text-yellow-200 font-medium">
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

<style scoped>
/* FormKit 기본 submit 버튼 숨기기 */
:deep(.formkit-actions) {
  display: none !important;
}

:deep(.formkit-outer[data-type='submit']) {
  display: none !important;
}
</style>