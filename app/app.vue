<script setup>
useHead({
  title: 'SMART MES',
})

// Favicon 자동 로딩
const { loadFaviconFromSettings } = useFavicon()

onMounted(() => {
  loadFaviconFromSettings()
})

// 전역 타이틀 제거: 불필요한 계산/의존성도 함께 제거
</script>

<template>
  <NuxtLayout>
    <NuxtPage keepalive />
  </NuxtLayout>
</template>

<style lang='scss'>
@use 'App.scss';
</style>
