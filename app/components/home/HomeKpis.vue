<script setup lang='ts'>
const notifications = useNotificationStore()
const chat = useChatStore()

const kpis = computed(() => {
  return [
    {
      key: 'unreadNotifications',
      label: '미열람 알림',
      value: notifications.unreadCount,
      color: 'from-amber-500 to-orange-600',
    },
    {
      key: 'unreadChats',
      label: '미열람 채팅',
      value: chat.unreadTotal,
      color: 'from-emerald-500 to-green-600',
    },
    {
      key: 'conversations',
      label: '대화방 수',
      value: chat.conversations.length,
      color: 'from-sky-500 to-blue-600',
    },
  ]
})
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
    <div
      v-for="item in kpis"
      :key="item.key"
      class="card overflow-hidden bg-white border border-gray-300 shadow-sm dark:bg-gray-800 dark:border-gray-700"
    >
      <div class="p-4">
        <div class="text-xs uppercase tracking-wide text-gray-600 dark:text-gray-400">{{ item.label }}</div>
        <div class="text-3xl font-bold mt-1 text-gray-900 dark:text-gray-100">{{ item.value }}</div>
        <div class="mt-2 h-1 rounded bg-gray-100 dark:bg-gray-700 overflow-hidden">
          <div class="h-1 bg-gradient-to-r" :class="item.color" style="width: 100%"></div>
        </div>
      </div>
    </div>
  </div>
  
</template>

<style scoped></style>


