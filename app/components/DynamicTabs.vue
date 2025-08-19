<script setup lang="ts">
import { useTabsStore, type TabItem } from '../stores/tabs'
import { useAuthStore } from '../stores/auth'
const router = useRouter()
const tabsStore = useTabsStore()
const authStore = useAuthStore()
const maxVisible = 12
const startIndex = ref(0)

const activeKey = computed({
  get: () => tabsStore.activeKey,
  set: (val: string) => {
    tabsStore.setActive(val)
    const target = tabsStore.tabs.find((t: TabItem) => t.key === val)
    if (target)
      router.push(target.fullPath)
  },
})

function onClose(key: string) {
  tabsStore.removeTab(key)
}

const totalTabs = computed(() => tabsStore.tabs.length)
const endIndex = computed(() => Math.min(startIndex.value + maxVisible, totalTabs.value))
const visibleTabs = computed(() => tabsStore.tabs.slice(startIndex.value, startIndex.value + maxVisible))

function moveLeft() {
  startIndex.value = Math.max(0, startIndex.value - 1)
}
function moveRight() {
  const maxStart = Math.max(0, totalTabs.value - maxVisible)
  startIndex.value = Math.min(maxStart, startIndex.value + 1)
}

watch(totalTabs, () => {
  const maxStart = Math.max(0, totalTabs.value - maxVisible)
  if (startIndex.value > maxStart)
    startIndex.value = maxStart
})

watch(() => tabsStore.activeKey, (key) => {
  const idx = tabsStore.tabs.findIndex(t => t.key === key)
  if (idx === -1) return
  if (idx < startIndex.value) startIndex.value = idx
  else if (idx >= endIndex.value) startIndex.value = Math.min(idx - maxVisible + 1, Math.max(0, totalTabs.value - maxVisible))
})
</script>

<template>
  <div v-if="tabsStore.tabs.length && authStore.isLoggedIn" class="mb-1" data-testid="tabs">
    <div class="flex items-center gap-1 text-sm">
      <button v-if="totalTabs > maxVisible" class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50" :disabled="startIndex === 0" @click="moveLeft" v-tooltip.bottom="'왼쪽으로'">
        <i class="pi pi-angle-left" />
      </button>
      <div class="flex-1 overflow-hidden whitespace-nowrap">
        <div class="inline-flex gap-1">
          <div
            v-for="tab in visibleTabs"
            :key="tab.key"
            class="inline-flex items-center border rounded px-2 py-0.5 cursor-pointer"
            :data-tab-key="tab.key"
            :data-tab-title="tab.title"
            :class="{ 'bg-primary text-primary-contrast': tab.key === tabsStore.activeKey }"
            @click="activeKey = tab.key"
          >
            <span class="mr-1 truncate max-w-40 leading-6">{{ tab.title }}</span>
            <button class="i-carbon-close text-xs" @click.stop="onClose(tab.key)" />
          </div>
        </div>
      </div>
      <button v-if="totalTabs > maxVisible" class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50" :disabled="endIndex >= totalTabs" @click="moveRight" v-tooltip.bottom="'오른쪽으로'">
        <i class="pi pi-angle-right" />
      </button>
    </div>
  </div>
  <div v-else class="mb-2" />
  <slot />
  <!-- slot 아래에 NuxtPage가 배치된 레이아웃에서 사용됨 -->
</template>

<style scoped>
</style>


