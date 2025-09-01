<script setup lang="ts">
import type { ChatConversation } from '../../stores/chat'

const chat = useChatStore()
const emit = defineEmits<{ (e: 'open', chatId: number): void; (e: 'start'): void }>()

function open(conv: ChatConversation) {
  emit('open', conv.id)
}

onMounted(() => {
  try {
    chat.startSSE()
    chat.startPolling(30000)
    chat.fetchConversations()
  } catch {}
})
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-center justify-between">
      <div class="font-semibold">채팅</div>
      <div class="flex items-center gap-2">
        <div class="text-xs text-gray-500">미읽음 {{ chat.unreadTotal }}</div>
        <button
          class="w-7 h-7 rounded-full flex items-center justify-center border border-gray-300 dark:border-gray-600 bg-white/70 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm"
          @click="emit('start')"
          v-tooltip.left="'새 채팅'"
        >
          <i class="pi pi-user-plus text-gray-700 dark:text-gray-200 text-sm"></i>
        </button>
      </div>
    </div>
    <div class="max-h-80 overflow-auto">
      <ul class="divide-y divide-gray-200 dark:divide-gray-700">
        <li v-for="c in chat.conversations" :key="c.id" class="py-2 px-1 flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded"
            @click="open(c)">
          <div class="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center shrink-0">
            <i class="pi pi-comments"></i>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-2">
              <div class="text-sm font-medium truncate">
                {{ c.is_group ? (c.title || '그룹채팅') : (c.other_user_name || '대화') }}
              </div>
              <div class="text-[11px] text-gray-400 whitespace-nowrap">{{ c.last_at ? new Date(c.last_at).toLocaleString() : '' }}</div>
            </div>
            <div class="text-xs text-gray-500 truncate">{{ c.last_content || '' }}</div>
          </div>
          <div v-if="c.unread_count > 0" class="shrink-0">
            <span class="bg-rose-500 text-white text-[10px] leading-none rounded-full px-1.5 py-0.5">{{ c.unread_count }}</span>
          </div>
        </li>
        <li v-if="!chat.conversations.length" class="py-6 text-center text-sm text-gray-500">대화가 없습니다.</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
</style>
