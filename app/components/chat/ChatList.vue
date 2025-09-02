<script setup lang="ts">
import type { ChatConversation } from '../../stores/chat'

const chat = useChatStore()
const emit = defineEmits<{ (e: 'open', chatId: number): void; (e: 'start'): void }>()

const q = ref('')
const items = computed(() => {
  const keyword = q.value.trim().toLowerCase()
  if (!keyword) return chat.conversations
  return chat.conversations.filter((c) => {
    const name = (c.is_group ? (c.title || '그룹채팅') : (c.other_user_name || '대화')) || ''
    const last = c.last_content || ''
    return name.toLowerCase().includes(keyword) || last.toLowerCase().includes(keyword)
  })
})

function open(conv: ChatConversation) {
  emit('open', conv.id)
}

async function markAllRead() {
  try {
    await chat.markReadAll()
    await chat.fetchConversations()
  } catch {}
}

const { confirmAction } = useConfirmation()
const { showSuccessMessage } = useMessages()

async function onLeave(chatId: number) {
  confirmAction(async () => {
    await chat.leaveChat(chatId)
    await chat.fetchConversations()
  }, '완료', '채팅방에서 나갔습니다.', '채팅방 나가기', '이 채팅방을 나가시겠어요?')
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
          class="h-7 px-2 rounded flex items-center justify-center border border-gray-300 dark:border-gray-600 bg-white/70 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm text-xs disabled:opacity-60 disabled:cursor-not-allowed"
          :disabled="chat.unreadTotal <= 0"
          @click="chat.unreadTotal > 0 && markAllRead()"
          v-tooltip.left="'모두 읽음'"
        >
          <i class="pi pi-check-circle mr-1 text-green-600"></i>
          모두 읽음
        </button>
        <button
          class="w-7 h-7 rounded-full flex items-center justify-center border border-gray-300 dark:border-gray-600 bg-white/70 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm"
          @click="emit('start')"
          v-tooltip.left="'새 채팅'"
        >
          <i class="pi pi-user-plus text-gray-700 dark:text-gray-200 text-sm"></i>
        </button>
      </div>
    </div>
    <div class="mb-1">
      <input v-model="q" class="p-inputtext p-inputtext-sm w-full" placeholder="대화 목록 검색" />
    </div>
    <div class="max-h-80 overflow-auto">
      <ul class="divide-y divide-gray-200 dark:divide-gray-700">
        <li v-for="c in items" :key="c.id" class="py-2 px-1 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded">
          <div class="relative w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center shrink-0">
            <i :class="['text-sm', c.is_group ? 'pi pi-users' : 'pi pi-user']"></i>
            <span v-if="c.unread_count > 0" class="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] leading-none rounded-full px-1.5 py-0.5 shadow">
              {{ c.unread_count }}
            </span>
          </div>
          <div class="flex-1 min-w-0 cursor-pointer" @click="open(c)">
            <div class="flex items-center justify-between gap-2">
              <div class="text-sm font-medium truncate">
                {{ c.is_group ? (c.title || '그룹채팅') : (c.other_user_name || '대화') }}
                <span v-if="c.is_group && c.member_count" class="text-[11px] text-gray-500 ml-1">({{ c.member_count }})</span>
              </div>
              <div class="text-[11px] text-gray-400 whitespace-nowrap">{{ c.last_at_text || (c.last_at ? new Date(c.last_at).toLocaleString() : '') }}</div>
            </div>
            <div class="text-xs text-gray-500 truncate">
              <template v-if="c.is_group">
                <span v-if="c.last_sender_name" class="font-medium text-gray-600 dark:text-gray-300">{{ c.last_sender_name }}: </span>
                {{ c.last_content || '' }}
              </template>
              <template v-else>
                {{ c.last_content || '' }}
              </template>
            </div>
          </div>
          <div class="shrink-0 flex items-center">
            <button
              class="w-7 h-7 rounded-full flex items-center justify-center border border-gray-300 dark:border-gray-600 bg-white/70 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm"
              v-tooltip.left="'나가기'"
              @click.stop="onLeave(c.id)"
            >
              <i class="pi pi-sign-out text-gray-700 dark:text-gray-200 text-sm"></i>
            </button>
          </div>
        </li>
        <li v-if="!chat.conversations.length" class="py-6 text-center text-sm text-gray-500">대화가 없습니다.</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
</style>
