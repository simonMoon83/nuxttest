<script setup lang="ts">
const authStore = useAuthStore()
const tabsStore = useTabsStore()
const showProfileCard = ref(false)
const headerCollapsed = useState<boolean>('headerCollapsed', () => false)
const collapseBtnRef = ref<any>(null)
const expandBtnPos = ref<{ top: number; left: number } | null>(null)

// Notifications
const notificationStore = useNotificationStore()
const notifPanel = ref()
const notifButtonRef = ref<any>(null)
onMounted(() => {
  try { if (authStore.user) notificationStore.startPolling(30000) } catch {}
})
onBeforeUnmount(() => {
  try { notificationStore.stopPolling() } catch {}
})

const router = useRouter()

// Global menu search
const menuSearchText = ref('')
const menuSuggestions = ref<any[]>([])
const allMenus = shallowRef<any[] | null>(null)

async function ensureMenus() {
  if (allMenus.value) return
  try {
    const res: any = await $fetch('/api/menu/admin')
    allMenus.value = (res?.data || []).filter((m: any) => !m?.is_separator && (m?.is_active ?? true))
  } catch (e) {
    allMenus.value = []
  }
}

async function completeMenuSearch(event: any) {
  await ensureMenus()
  const q = (event?.query || '').toString().toLowerCase().trim()
  if (!q) { menuSuggestions.value = []; return }
  const items = (allMenus.value || []).filter((m: any) => {
    const title = (m?.title || '').toString().toLowerCase()
    const href = (m?.href || '').toString().toLowerCase()
    return title.includes(q) || href.includes(q)
  }).slice(0, 20)
  menuSuggestions.value = items.map((m: any) => ({ label: m.title || m.href || '메뉴', href: m.href || '/', icon: m.icon || '' }))
}

function onMenuPick(e: any) {
  const item = e?.value
  if (item?.href) {
    // 탭 생성 시 메뉴명이 제목으로 반영되도록 대기 제목 설정
    try { tabsStore.setPendingTitle(item.href, item.label || item.href) } catch {}
    navigateTo(item.href)
    // clear input after navigate
    menuSearchText.value = ''
    menuSuggestions.value = []
  }
}

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
          <div class="flex items-center gap-2">
            <!-- Global menu search -->
            <div class="hidden md:flex items-center">
              <AutoComplete
                v-model="menuSearchText"
                :suggestions="menuSuggestions"
                optionLabel="label"
                :minLength="1"
                placeholder="메뉴 검색 (이름/링크)"
                inputClass="w-56"
                @complete="completeMenuSearch"
                @item-select="onMenuPick"
              />
            </div>
            <!-- Notification button -->
            <ClientOnly>
              <span class="relative">
                <button
                  ref="notifButtonRef"
                  v-show="authStore.user"
                  class="w-8 h-8 rounded-full flex items-center justify-center border border-gray-300 dark:border-gray-600 bg-white/70 dark:bg-gray-800/60 backdrop-blur-sm hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm"
                  @click="(e:any) => notifPanel?.toggle(e)"
                  v-tooltip.bottom="'알림'"
                >
                  <i class="pi pi-bell text-gray-700 dark:text-gray-200 text-base"></i>
                  <span
                    v-if="notificationStore.hasUnread"
                    class="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] leading-none rounded-full px-1 py-0.5"
                  >
                    New
                  </span>
                </button>
              </span>
              <OverlayPanel ref="notifPanel" :breakpoints="{ '960px': '90vw', '640px': '95vw' }" style="width: 360px; max-width: 90vw;">
                <div class="flex items-center justify-between mb-2">
                  <div class="font-semibold">알림</div>
                  <Button label="모두 읽음" size="small" text @click="notificationStore.markAllRead()" />
                </div>
                <div class="max-h-80 overflow-auto">
                  <ul class="divide-y divide-gray-200 dark:divide-gray-700">
                    <li v-for="n in notificationStore.items" :key="n.id" class="py-2 px-1 flex gap-2 items-start">
                      <span class="mt-1">
                        <span :class="['inline-block w-2.5 h-2.5 rounded-full', n.is_read ? 'bg-gray-400' : 'bg-rose-500']"></span>
                      </span>
                      <div class="flex-1 min-w-0">
                        <div class="text-sm font-medium" :class="n.is_read ? 'text-gray-500' : 'text-gray-900 dark:text-gray-100'">{{ n.title }}</div>
                        <div class="text-xs text-gray-500 whitespace-pre-wrap break-words">{{ n.message }}</div>
                        <div class="text-[11px] text-gray-400">{{ new Date(n.created_at).toLocaleString() }}</div>
                      </div>
                      <div>
                        <Button v-if="!n.is_read" label="읽음" size="small" text @click="notificationStore.markRead([n.id])" />
                      </div>
                    </li>
                    <li v-if="!notificationStore.items.length" class="py-6 text-center text-sm text-gray-500">알림이 없습니다.</li>
                  </ul>
                </div>
              </OverlayPanel>
            </ClientOnly>
            <ClientOnly>
              <button
                v-show="authStore.user"
                class="w-8 h-8 rounded-full flex items-center justify-center border border-gray-300 dark:border-gray-600 bg-white/70 dark:bg-gray-800/60 backdrop-blur-sm hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm"
                @click="toggleProfileCard"
                v-tooltip.bottom="'프로필 보기'"
              >
                <i class="pi pi-user text-gray-700 dark:text-gray-200 text-base"></i>
              </button>
            </ClientOnly>
            <AppColorMode />
            <span v-tooltip.bottom="'GitHub 저장소'">
              <Button icon="pi pi-github" text @click="redirectToGithub" />
            </span>
            <span v-tooltip.bottom="'로그아웃'">
              <Button icon="pi pi-sign-out" text severity="danger" @click="handleLogout" />
            </span>
          </div>
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
