<script setup lang='ts'>
const tabs = useTabsStore()
const router = useRouter()

const recents = computed(() => [...(tabs.tabs || [])].slice(-5).reverse())

function open(path: string) {
  router.push(path)
}
</script>

<template>
  <div class="card surface-0 bg-white border border-gray-300 shadow-sm dark:bg-gray-800 dark:border-gray-700">
    <div class="p-4">
      <h3 class="text-lg font-semibold mb-3">최근 방문</h3>
      <div v-if="recents.length === 0" class="text-sm text-gray-600 dark:text-gray-400">최근 방문 기록이 없습니다.</div>
      <ul v-else class="space-y-2">
        <li v-for="t in recents" :key="t.key" class="flex justify-between items-center p-2 rounded border border-gray-300 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 dark:border-gray-700 cursor-pointer" @click="open(t.fullPath)">
          <span class="text-sm text-gray-900 dark:text-gray-100">{{ t.title }}</span>
          <span class="text-xs text-gray-600 dark:text-gray-400">{{ t.fullPath }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped></style>


