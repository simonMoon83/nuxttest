<script setup lang="ts">
const authStore = useAuthStore()
const showProfileCard = ref(false)
const headerCollapsed = useState<boolean>('headerCollapsed', () => false)

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
  headerCollapsed.value = true
}

function expandHeader() {
  headerCollapsed.value = false
}
</script>

<template>
  <nav class="relative">
    <div v-if="!headerCollapsed">
      <Toolbar class="border-b border-gray-200 dark:border-gray-700">
        <template #start>
          <Button
            icon="pi pi-angle-up"
            text
            rounded
            class="mr-2"
            v-tooltip.bottom="'헤더 접기'"
            @click="collapseHeader"
          />
        </template>

        <template #end>
          <ClientOnly>
            <div 
              v-show="authStore.user" 
              class="flex items-center mr-4 px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 group"
              @click="toggleProfileCard"
              v-tooltip.bottom="'프로필 보기'"
            >
              <div class="relative">
                <div class="w-8 h-8 bg-blue-500 dark:bg-white dark:bg-opacity-20 rounded-full flex items-center justify-center mr-3 backdrop-blur-sm shadow-sm flex-shrink-0">
                  <i class="pi pi-user text-white dark:text-white text-sm" aria-hidden="true"></i>
                </div>
                <div class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full shadow-md ring-1 ring-green-200 dark:ring-green-900/30"></div>
              </div>
              <div class="flex flex-col min-w-0 flex-1">
                <span class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                  {{ authStore.user?.full_name || authStore.user?.username }}
                </span>
                <span class="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {{ authStore.user?.email || 'user@example.com' }}
                </span>
              </div>
              <i 
                class="pi pi-chevron-down ml-2 text-gray-400 text-xs transition-transform duration-200 group-hover:text-gray-600 dark:group-hover:text-gray-300"
                :class="{ 'rotate-180': showProfileCard }"
              ></i>
            </div>
          </ClientOnly>
          <AppColorMode class="ml-2 mr-2" />
          <Button 
            icon="pi pi-github" 
            class="mr-2" 
            outlined
            @click="redirectToGithub"
            v-tooltip.bottom="'GitHub 저장소'"
          />
          <Button 
            icon="pi pi-sign-out" 
            severity="danger" 
            @click="handleLogout"
            v-tooltip.bottom="'로그아웃'"
          />
        </template>
      </Toolbar>
    </div>

    <div v-else>
      <!-- 오버랩 형태의 펼치기 버튼 (공간 차지 최소화) -->
      <Button
        icon="pi pi-angle-down"
        rounded
        text
        class="fixed top-2 right-3 z-30 shadow-sm bg-white/70 hover:bg-white dark:bg-gray-800/70 dark:hover:bg-gray-800 backdrop-blur-sm"
        v-tooltip.bottom="'헤더 펼치기'"
        @click="expandHeader"
      />
    </div>

    <!-- 사용자 프로필 카드 -->
    <AppUserProfileCard2
      v-model:visible="showProfileCard"
      :user="authStore.user"
      @logout="handleLogout"
    />
  </nav>
</template>

<style scoped lang="scss">
.rotate-180 {
  transform: rotate(180deg);
}
</style>
