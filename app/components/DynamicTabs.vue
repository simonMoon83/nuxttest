<script setup lang="ts">
import { useTabsStore, type TabItem } from '../stores/tabs'
import { useAuthStore } from '../stores/auth'
const router = useRouter()
const tabsStore = useTabsStore()
const authStore = useAuthStore()

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
</script>

<template>
  <div v-if="tabsStore.tabs.length && authStore.isLoggedIn" class="mb-2" data-testid="tabs">
    <div class="flex gap-1 flex-wrap">
      <div
        v-for="tab in tabsStore.tabs"
        :key="tab.key"
        class="inline-flex items-center border rounded px-2 py-1 cursor-pointer"
        :data-tab-key="tab.key"
        :data-tab-title="tab.title"
        :class="{ 'bg-primary text-primary-contrast': tab.key === tabsStore.activeKey }"
        @click="activeKey = tab.key"
      >
        <span class="mr-2">{{ tab.title }}</span>
        <button class="i-carbon-close hover:text-red-500" @click.stop="onClose(tab.key)" />
      </div>
    </div>
  </div>
  <div v-else class="mb-2" />
  <slot />
  <!-- slot 아래에 NuxtPage가 배치된 레이아웃에서 사용됨 -->
</template>

<style scoped>
</style>


