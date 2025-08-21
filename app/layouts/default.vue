<script setup lang='ts'>
const collapsed = useState<boolean>('collapsed')
const isOnMobile = useState<boolean>('isOnMobile')
const authStore = useAuthStore()
const headerCollapsed = useState<boolean>('headerCollapsed', () => false)
</script>

<template>
  <div>
    <ConfirmDialog />
    <Toast />

    <!-- 항상 동일한 구조를 유지하여 hydration mismatch 방지 -->
    <div>
      <!-- 사이드바: 서버에서는 숨김, 클라이언트에서만 조건부 표시 -->
      <div v-show="authStore.isLoggedIn">
        <AppSidebar />
      </div>

      <div id="workspace" :class="[{ collapsed }, { mobile: isOnMobile }, headerCollapsed ? 'workspace-compact' : 'workspace-default']">
        <!-- 탑바: 서버에서는 숨김, 클라이언트에서만 조건부 표시 -->
        <div v-if="authStore.isLoggedIn">
          <AppTopbar />
        </div>

        <div :class="headerCollapsed ? 'm-0 mt-0' : 'm-1 mt-2'">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
.workspace-compact {
  padding-top: 0 !important;
}
.workspace-default {
  padding-top: 0;
}
</style>
