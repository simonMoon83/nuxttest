<script setup>
useHead({
  title: 'SMART MES',
})

// Favicon 자동 로딩
const { loadFaviconFromSettings } = useFavicon()

onMounted(() => {
  loadFaviconFromSettings()
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<style lang='scss'>
@use 'App.scss';
</style>
