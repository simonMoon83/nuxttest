<script setup lang="ts">
const authStore = useAuthStore()

function redirectToGithub() {
  window.open('https://github.com/sfxcode/nuxt3-primevue-starter', '_blank')
}

async function handleLogout() {
  await authStore.logout()
}
</script>

<template>
  <nav>
    <Toolbar>
      <template #start />

      <template #end>
        <div v-if="authStore.user" class="flex items-center mr-4">
          <i class="pi pi-user mr-2 text-gray-600"></i>
          <span class="text-sm text-gray-700">
            {{ authStore.user.full_name || authStore.user.username }}님
          </span>
        </div>
        
        <AppColorMode class="ml-6 mr-2" />
        <Button icon="pi pi-github" class="mr-2" @click="redirectToGithub" />
        <Button 
          icon="pi pi-sign-out" 
          severity="danger" 
          @click="handleLogout"
          v-tooltip.bottom="'로그아웃'"
        />
      </template>
    </Toolbar>
  </nav>
</template>

<style scoped lang="scss">

</style>
