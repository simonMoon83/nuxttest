<script setup lang='ts'>
const collapsed = useState<boolean>('collapsed')
const isOnMobile = useState<boolean>('isOnMobile')
const authStore = useAuthStore()
const route = useRoute()

// 인증 상태 확인이 완료되었는지 추적
const authChecked = ref(false)

// 레이아웃이 마운트될 때 인증 상태 확인
onMounted(async () => {
  try {
    await authStore.initAuth()
  } catch (error) {
    console.error('인증 초기화 오류:', error)
  } finally {
    authChecked.value = true
  }
})
</script>

<template>
  <div>
    <ConfirmDialog />
    <Toast />
    
    <!-- 인증 확인 중일 때 로딩 표시 -->
    <div v-if="!authChecked" class="min-h-screen flex items-center justify-center">
      <div class="text-center">
        <ProgressSpinner />
        <p class="mt-4">인증 확인 중...</p>
      </div>
    </div>
    
    <!-- 로그인된 경우에만 사이드바와 탑바 표시 -->
    <template v-else-if="authStore.isLoggedIn">
      <AppSidebar />
      <div id="workspace" :class="[{ collapsed }, { mobile: isOnMobile }]">
        <AppTopbar />
        <div class="m-1 mt-4">
          <!-- 페이지 컨텐츠 렌더링 -->
          <slot />
        </div>
      </div>
    </template>
    
    <!-- 로그인되지 않은 경우 -->
    <template v-else>
      <!-- 로그인 페이지인 경우 레이아웃 없이 페이지만 렌더링 -->
      <slot v-if="route.path === '/login'" />
      
      <!-- 다른 페이지인 경우 인증 필요 메시지 표시 -->
      <div v-else class="min-h-screen flex items-center justify-center">
        <div class="text-center p-6">
          <i class="pi pi-lock text-4xl text-gray-400 mb-4"></i>
          <h2 class="text-xl font-semibold mb-2">인증이 필요합니다</h2>
          <p class="text-gray-600 mb-4">로그인 페이지로 이동합니다...</p>
          <Button 
            label="로그인 페이지로 이동" 
            icon="pi pi-sign-in"
            @click="navigateTo('/login')"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<style lang="scss">

</style>
