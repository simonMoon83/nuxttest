<script setup lang="ts">
const authStore = useAuthStore()
const showProfileCard = ref(false)
const headerCollapsed = useState<boolean>('headerCollapsed', () => false)
const collapseBtnRef = ref<any>(null)
const expandBtnPos = ref<{ top: number; left: number } | null>(null)

function redirectToGithub() {
  window.open('https://github.com/sfxcode/nuxt3-primevue-starter', '_blank')
}

async function handleLogout() {
  await authStore.logout()
}

function toggleProfileCard() {
  showProfileCard.value = !showProfileCard.value
}

function collapseHeader() {
  try {
    const btnEl = collapseBtnRef.value?.$el
    if (btnEl) {
      const rect = btnEl.getBoundingClientRect()
      // 버튼의 뷰포트 기준 위치를 정확히 저장
      expandBtnPos.value = { 
        top: Math.round(rect.top), 
        left: Math.round(rect.left) 
      }
    } else {
      // 요소를 찾을 수 없는 경우 기본 위치
      expandBtnPos.value = { top: 8, left: 8 }
    }
  } catch (error) {
    console.error('Error calculating button position:', error)
    expandBtnPos.value = { top: 8, left: 8 }
  }
  headerCollapsed.value = true
}

function expandHeader() {
  headerCollapsed.value = false
}
</script>

<template>
  <nav v-if="!headerCollapsed" class="relative">
    <div>
      <Toolbar class="border-b border-gray-200 dark:border-gray-700 py-1">
        <template #start>
          <div class="flex items-center gap-2 w-full">
            <span v-tooltip.bottom="'헤더 접기'">
              <Button
                ref="collapseBtnRef"
                icon="pi pi-angle-up"
                text
                rounded
                class="mr-2 p-1"
                @click="collapseHeader"
              />
            </span>
            <div class="flex-1 min-w-0">
              <DynamicTabs />
            </div>
          </div>
        </template>

        <template #end>
          <ClientOnly>
            <button
              v-show="authStore.user"
              class="mr-2 w-8 h-8 rounded-full flex items-center justify-center border border-gray-300 dark:border-gray-600 bg-white/70 dark:bg-gray-800/60 backdrop-blur-sm hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm"
              @click="toggleProfileCard"
              v-tooltip.bottom="'프로필 보기'"
            >
              <i class="pi pi-user text-gray-700 dark:text-gray-200 text-base"></i>
            </button>
          </ClientOnly>
          <AppColorMode class="ml-1 mr-1" />
          <span v-tooltip.bottom="'GitHub 저장소'">
            <Button icon="pi pi-github" class="mr-1" text @click="redirectToGithub" />
          </span>
          <span v-tooltip.bottom="'로그아웃'">
            <Button icon="pi pi-sign-out" text severity="danger" @click="handleLogout" />
          </span>
        </template>
      </Toolbar>
    </div>
  </nav>

  <!-- 접힌 상태에서만 표시되는 고정 버튼 (레이아웃 공간 차지 X) -->
  <ClientOnly>
    <Teleport to="body">
      <span v-if="headerCollapsed" v-tooltip.bottom="'헤더 펼치기'">
        <Button
          icon="pi pi-angle-down"
          text
          rounded
          class="mr-2 p-1 expand-btn-fixed"
          :style="{ top: `${(expandBtnPos?.top ?? 8)}px`, left: `${(expandBtnPos?.left ?? 8)}px`, zIndex: 2147483647 }"
          @click="expandHeader"
        />
      </span>
    </Teleport>
  </ClientOnly>

  <!-- 사용자 프로필 카드 -->
  <AppUserProfileCard2
    v-model:visible="showProfileCard"
    :user="authStore.user"
    @logout="handleLogout"
  />
</template>

<style scoped lang="scss">
.rotate-180 {
  transform: rotate(180deg);
}

.expand-btn-fixed {
  position: fixed !important;
}
</style>
