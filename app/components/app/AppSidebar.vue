<script setup lang='ts'>
const tabsStore = useTabsStore()
const config = useRuntimeConfig()
const { menu, fetchMenuData, isLoading, error } = useNavigationMenu()

const collapsed = useState<boolean>('collapsed')
const isOnMobile = useState<boolean>('isOnMobile')

// 로고 및 앱 설정
const logoSettings = ref('/primevue-logo.webp')
const appSettings = ref({
  name: 'PrimeVue-Nuxt Starter',
  description: 'Modern full-stack application built with Nuxt 3 and PrimeVue'
})

// 설정 로드 함수
async function loadSettings() {
  try {
    // 서버에서 설정 가져오기
    const response = await $fetch('/api/settings') as any
    
    if (response?.success && response?.data) {
      const { logo, appName, appDescription } = response.data
      
      // 로고 설정 업데이트
      if (logo) {
        logoSettings.value = logo
      }
      
      // 앱 설정 업데이트
      if (appName || appDescription) {
        appSettings.value = {
          name: appName || appSettings.value.name,
          description: appDescription || appSettings.value.description
        }
      }
      
      // 로컬 스토리지에도 캐시 (오프라인 대비)
      if (import.meta.client) {
        try {
          if (logo) {
            localStorage.setItem('customLogo', JSON.stringify({ logo, updatedAt: response.data.updatedAt }))
          }
          if (appName || appDescription) {
            localStorage.setItem('appSettings', JSON.stringify({ name: appName, description: appDescription }))
          }
        } catch (localError) {
          console.warn('로컬 스토리지 저장 실패:', localError)
        }
      }
    }
  } catch (error) {
    console.error('서버 설정 로드 실패:', error)
    
    // 서버 연결 실패 시 로컬 스토리지에서 폴백
    if (import.meta.client) {
      try {
        // 로고 설정 로드
        const savedLogo = localStorage.getItem('customLogo')
        if (savedLogo) {
          const parsed = JSON.parse(savedLogo)
          logoSettings.value = parsed.logo
        }
        
        // 앱 설정 로드
        const savedAppSettings = localStorage.getItem('appSettings')
        if (savedAppSettings) {
          const parsed = JSON.parse(savedAppSettings)
          appSettings.value = { ...appSettings.value, ...parsed }
        }
      } catch (localError) {
        console.error('로컬 설정 로드도 실패:', localError)
        logoSettings.value = '/primevue-logo.webp'
      }
    }
  }
}

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

function getItemLabel(item: any): string | undefined {
  return item?.title || item?.label || item?.text || item?.name
}

function onItemClick(payloadOrEvent?: any, maybeItem?: any) {
  // vue-sidebar-menu는 (event, item) 또는 ({ item, event }) 형태로 전달될 수 있음
  const item = maybeItem ?? payloadOrEvent?.item ?? payloadOrEvent
  const label = getItemLabel(item)
  if (!label)
    return
  // 라우팅 미들웨어가 탭 생성 전에 제목을 미리 지정 (특수 경로 하드코딩 제거)
  const path = item?.href || item?.to || item?.path || item?.url || item?.link
  if (path)
    tabsStore.setPendingTitle(path, label)
}

// 이미지 로드 에러 핸들링
function handleImageError() {
  logoSettings.value = '/primevue-logo.webp'
}

onMounted(async () => {
  // DOM이 완전히 렌더링될 때까지 기다림
  await nextTick()

  onResize()
  window.addEventListener('resize', onResize)

  // 설정 로드
  await loadSettings()

  // 설정 업데이트 이벤트 리스너
  window.addEventListener('logo-updated', loadSettings)
  window.addEventListener('app-settings-updated', loadSettings)

  // 메뉴 데이터 로드
  try {
    await fetchMenuData()
  }
  catch (err) {
    console.error('메뉴 로드 실패:', err)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  window.removeEventListener('logo-updated', loadSettings)
  window.removeEventListener('app-settings-updated', loadSettings)
})
</script>

<template>
  <div>
    <!-- 메뉴 로딩 상태 표시 -->
    <div v-if="isLoading" class="p-4 text-center">
      <i class="pi pi-spin pi-spinner text-xl text-primary" />
      <p class="text-sm text-gray-600 mt-2">
        메뉴 로딩 중...
      </p>
    </div>

    <!-- 메뉴 에러 상태 표시 -->
    <div v-else-if="error" class="p-4 text-center">
      <i class="pi pi-exclamation-triangle text-xl text-red-500" />
      <p class="text-sm text-red-600 mt-2">
        메뉴 로드 실패
      </p>
      <p class="text-xs text-gray-500">
        기본 메뉴로 표시됩니다
      </p>
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
        <!-- 확장된 상태 (로고 + 앱 이름) -->
        <div v-if="!collapsed" class="logo-section-expanded compact">
          <div class="logo-container">
            <img
              class="logo-image"
              :src="logoSettings"
              alt="Application Logo"
              @error="handleImageError"
            >
            <div class="app-info">
              <div class="app-name">{{ appSettings.name }}</div>
              <div class="app-version">v{{ config.public.APP_VERSION }}</div>
            </div>
          </div>
        </div>
        
        <!-- 축소된 상태 (로고만) -->
        <div v-else class="logo-section-collapsed compact">
          <img
            class="logo-image-small"
            :src="logoSettings"
            alt="Application Logo"
            @error="handleImageError"
          >
        </div>
      </template>
      
      <template #footer>
        <div class="footer-section compact">
          <div v-if="!collapsed" class="footer-expanded">
            <div class="text-xs text-color-secondary text-center truncate">
              {{ appSettings.description }}
            </div>
          </div>
          <div v-else class="footer-collapsed">
            <div class="text-xs text-color-secondary text-center">
              {{ config.public.APP_VERSION }}
            </div>
          </div>
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

<style lang="scss" scoped>
.logo-section-expanded {
  padding: 0.75rem;
  border-bottom: 1px solid var(--p-surface-border);
  background: var(--p-surface-ground);
}

.logo-section-collapsed {
  padding: 0.5rem 0.5rem;
  display: flex;
  justify-content: center;
  border-bottom: 1px solid var(--p-surface-border);
  background: var(--p-surface-ground);
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo-image {
  width: 2rem;
  height: 2rem;
  object-fit: contain;
  flex-shrink: 0;
}

.logo-image-small {
  width: 1.5rem;
  height: 1.5rem;
  object-fit: contain;
}

.app-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
  flex: 1;
}

.app-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--p-text-color);
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-version {
  font-size: 0.75rem;
  color: var(--p-text-color-secondary);
  line-height: 1;
}

.footer-section {
  padding: 0.25rem 0.5rem;
  border-top: 1px solid var(--p-surface-border);
  background: var(--p-surface-ground);
}

.footer-expanded {
  padding: 0.5rem;
}

.footer-collapsed {
  text-align: center;
}

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
