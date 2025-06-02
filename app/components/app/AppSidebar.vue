<script setup lang='ts'>
const config = useRuntimeConfig()
const { menu, fetchMenuData, isLoading, error } = useNavigationMenu()

const collapsed = useState<boolean>('collapsed')
const isOnMobile = useState<boolean>('isOnMobile')

function onResize() {
  if (window.innerWidth <= 980) {
    collapsed.value = true
    isOnMobile.value = true
  }
  else {
    collapsed.value = false
    isOnMobile.value = false
  }
}

function onToggleCollapse() {
}

function onItemClick() {
}

onMounted(async () => {
  onResize()
  window.addEventListener('resize', onResize)
  
  // 메뉴 데이터 로드
  try {
    await fetchMenuData()
  } catch (err) {
    console.error('메뉴 로드 실패:', err)
  }
})
</script>

<template>
  <div>
    <!-- 메뉴 로딩 상태 표시 -->
    <div v-if="isLoading" class="p-4 text-center">
      <i class="pi pi-spin pi-spinner text-xl text-primary"></i>
      <p class="mt-2 text-sm text-gray-600">메뉴 로딩 중...</p>
    </div>
    
    <!-- 메뉴 에러 상태 표시 -->
    <div v-else-if="error" class="p-4 text-center">
      <i class="pi pi-exclamation-triangle text-xl text-red-500"></i>
      <p class="mt-2 text-sm text-red-600">메뉴 로드 실패</p>
      <p class="text-xs text-gray-500">기본 메뉴로 표시됩니다</p>
    </div>
    
    <!-- 정상 메뉴 표시 -->
    <sidebar-menu
      v-else
      v-model:collapsed="collapsed"
      link-component-name="nuxt-sidebar-link"
      :menu="menu"
      :show-one-child="true"
      width="200px"
      width-collapsed="60px"
      @update:collapsed="onToggleCollapse"
      @item-click="onItemClick"
    >
      <template #header>
        <div v-if="!collapsed" class="flex">
          <img class="m-6 w-8" src="/primevue-logo.webp" alt="PrimeVue">
          <img class="m-6 w-8" src="/nuxt-logo.svg" alt="Nuxt">
        </div>
        <div v-else>
          <img class="ml-4 mt-6 w-6" src="/primevue-logo.webp" alt="PrimeVue">
          <img class="ml-4 mt-2 w-6" src="/nuxt-logo.svg" alt="Nuxt">
        </div>
      </template>
      <template #footer>
        <div class="text-xs text-color-primary m-2 text-center">
          <span v-if="!collapsed">PrimeVue-Nuxt Starter {{ config.public.APP_VERSION }}</span>
          <span v-if="collapsed">{{ config.public.APP_VERSION }}</span>
        </div>
      </template>
    </sidebar-menu>
    
    <div
      v-if="isOnMobile && !collapsed"
      class="sidebar-overlay"
      @click="collapsed = true"
    />
  </div>
</template>

<style lang="scss">
.sidebar-overlay {
  position: fixed;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  background-color: #000;
  opacity: 0.5;
  z-index: 900;
}
</style>
