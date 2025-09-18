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
    <!-- DynamicTabs는 AppTopbar 내부로 이동 -->
    <!-- 탭 바로 아래 전역 타이틀: 탭이 없어도 항상 표시 -->
    <div v-if="!hideGlobalTitle" class="mt-0 mb-1 border-b-1 border-gray-400 dark:border-gray-700">
      <div class="flex items-center gap-2 h-7 overflow-hidden select-none">
        <span class="w-1 h-4 bg-gray-900 dark:bg-gray-100 rounded-sm"></span>
        <i :class="pageIcon" class="text-black dark:text-gray-200 text-sm leading-none inline-flex items-center translate-y-[1px]"></i>
        <h2 class="m-0 text-sm font-semibold text-gray-900 dark:text-gray-100 leading-none tracking-tight truncate min-w-0 flex-1 antialiased">{{ pageTitle }}</h2>
      </div>
    </div>
    <NuxtPage keepalive />
  </NuxtLayout>
</template>

<style lang='scss'>
@use 'App.scss';
</style>
