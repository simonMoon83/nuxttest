<script setup lang="ts">
const authStore = useAuthStore()
const showProfileCard = ref(false)

function redirectToGithub() {
  window.open('https://github.com/sfxcode/nuxt3-primevue-starter', '_blank')
}

async function handleLogout() {
  await authStore.logout()
}

function toggleProfileCard() {
  showProfileCard.value = !showProfileCard.value
}
</script>

<template>
  <nav class="relative">
    <Toolbar class="border-b border-gray-200 dark:border-gray-700">
      <template #start />

      <template #end>
        <!-- 사용자 프로필 영역 -->
        <div 
          v-if="authStore.user" 
          class="flex items-center mr-4 px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 group"
          @click="toggleProfileCard"
          v-tooltip.bottom="'프로필 보기'"
        >
          <!-- 사용자 아바타 -->
          <div class="relative">
            <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mr-3 shadow-sm">
              <i class="pi pi-user text-white text-sm"></i>
            </div>
            <!-- 온라인 상태 표시 -->
            <div class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
          </div>
          
          <!-- 사용자 정보 - 항상 두 줄로 표시 -->
          <div class="flex flex-col min-w-0 flex-1">
            <span class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
              {{ authStore.user.full_name || authStore.user.username }}
            </span>
            <span class="text-xs text-gray-500 dark:text-gray-400 truncate">
              {{ authStore.user.email || 'user@example.com' }}
            </span>
          </div>
          
          <!-- 드롭다운 화살표 -->
          <i 
            class="pi pi-chevron-down ml-2 text-gray-400 text-xs transition-transform duration-200 group-hover:text-gray-600 dark:group-hover:text-gray-300"
            :class="{ 'rotate-180': showProfileCard }"
          ></i>
        </div>
        
        <!-- 다른 버튼들 -->
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

    <!-- 사용자 프로필 카드 -->
    <AppUserProfileCard 
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
