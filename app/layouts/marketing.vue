<template>
  <div class="min-h-screen flex flex-col">
    <header class="border-b px-4 py-3 bg-white/80 backdrop-blur">
      <div class="max-w-5xl mx-auto flex items-center justify-between">
        <NuxtLink to="/" class="flex items-center gap-2">
          <img :src="settings.logo || '/site-logo-minimal.svg'" alt="logo" class="w-6 h-6" />
          <span class="font-semibold">{{ settings.appName || 'Smart MES' }}</span>
        </NuxtLink>
        <nav class="text-sm flex items-center gap-4">
          <NuxtLink to="/contact" class="hover:underline">Contact</NuxtLink>
        </nav>
      </div>
    </header>
    <main class="flex-1">
      <slot />
    </main>
    <footer class="border-t px-4 py-6 text-sm text-gray-500 bg-gray-50">
      <div class="max-w-5xl mx-auto">© {{ new Date().getFullYear() }} {{ settings.appName || 'Smart MES' }}</div>
    </footer>
  </div>
</template>

<script setup lang="ts">
const settings = ref<any>({})
try {
  const res: any = await $fetch('/api/settings')
  settings.value = res?.data || {}
} catch {}
</script>

<style scoped>
</style>


