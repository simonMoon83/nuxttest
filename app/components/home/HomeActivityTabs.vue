<script setup lang='ts'>
const notifications = useNotificationStore()
const chat = useChatStore()

const active = ref<'noti' | 'chat'>('noti')

const topNotis = computed(() => (notifications.items || []).slice(0, 5))
const topConvs = computed(() => (chat.conversations || []).slice(0, 5))

function openConv(id: number) {
  chat.openChat(id).catch(() => {})
}
</script>

<template>
  <div class="card surface-0 bg-white border border-gray-300 shadow-sm dark:bg-gray-800 dark:border-gray-700">
    <div class="p-4">
      <div class="flex gap-2 mb-3">
        <button class="p-button p-component p-button-sm" :class="{ 'p-button-outlined': active !== 'noti' }" @click="active = 'noti'">알림</button>
        <button class="p-button p-component p-button-sm" :class="{ 'p-button-outlined': active !== 'chat' }" @click="active = 'chat'">채팅</button>
      </div>

      <div v-if="active === 'noti'" class="space-y-2">
        <div v-for="n in topNotis" :key="n.id" class="flex justify-between items-start p-3 rounded-lg border border-gray-300 bg-white shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <div>
            <div class="font-medium text-gray-900 dark:text-gray-100">{{ n.title }}</div>
            <div class="text-xs text-gray-600 dark:text-gray-400 mt-1">{{ n.created_at_text }}</div>
          </div>
          <span v-if="!n.is_read" class="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">NEW</span>
        </div>
        <div v-if="topNotis.length === 0" class="text-sm text-gray-600 dark:text-gray-400">표시할 알림이 없습니다.</div>
      </div>

      <div v-else class="space-y-2">
        <div v-for="c in topConvs" :key="c.id" class="p-3 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 shadow-sm dark:bg-gray-800 dark:hover:bg-gray-700 dark:border-gray-700 cursor-pointer" @click="openConv(c.id)">
          <div class="flex items-center justify-between">
            <div class="font-medium text-gray-900 dark:text-gray-100">{{ c.title || c.other_user_name || (c.is_group ? '그룹 대화' : '대화') }}</div>
            <div class="text-xs text-gray-600 dark:text-gray-400">{{ c.last_at_text }}</div>
          </div>
          <div class="text-sm text-gray-700 dark:text-gray-300 mt-1">{{ c.last_content || '메시지가 없습니다.' }}</div>
          <div v-if="c.unread_count > 0" class="mt-1 text-xs bg-blue-100 text-blue-700 inline-block px-2 py-0.5 rounded">미읽음 {{ c.unread_count }}</div>
        </div>
        <div v-if="topConvs.length === 0" class="text-sm text-gray-600 dark:text-gray-400">표시할 대화가 없습니다.</div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>


