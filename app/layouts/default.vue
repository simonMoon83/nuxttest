<script setup lang='ts'>
const collapsed = useState<boolean>('collapsed')
const isOnMobile = useState<boolean>('isOnMobile')
const authStore = useAuthStore()
</script>

<template>
  <div>
    <ConfirmDialog />
    <Toast />

    <!-- 항상 동일한 구조를 유지하여 hydration mismatch 방지 -->
    <div>
      <!-- 사이드바: 서버에서는 숨김, 클라이언트에서만 조건부 표시 -->
      <AppSidebar v-show="authStore.isLoggedIn" />

      <div id="workspace" :class="[{ collapsed }, { mobile: isOnMobile }]">
        <!-- 탑바: 서버에서는 숨김, 클라이언트에서만 조건부 표시 -->
        <AppTopbar v-show="authStore.isLoggedIn" />

        <div class="m-1 mt-4">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss">

</style>
