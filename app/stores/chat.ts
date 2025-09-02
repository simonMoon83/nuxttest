import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'

export interface ChatConversation {
  id: number
  is_group: boolean
  title: string | null
  updated_at: string
  last_content: string | null
  last_at: string | null
  last_at_text?: string | null
  unread_count: number
  other_user_id?: number | null
  other_user_name?: string | null
  member_count?: number
  last_sender_name?: string | null
}

export interface ChatAttachment {
  id: number
  message_id: number
  file_name: string
  file_path: string
  mime_type?: string | null
  size?: number
}

export interface ChatMessage {
  id: number
  chat_id: number
  sender_id: number
  sender_name?: string | null
  content: string | null
  created_at: string
  created_at_text?: string
  attachments?: ChatAttachment[]
  unread_count?: number
}

export const useChatStore = defineStore('chat', () => {
  const auth = useAuthStore()

  const conversations = ref<ChatConversation[]>([])
  const messagesByChat = ref<Record<number, ChatMessage[]>>({})
  const activeChatId = ref<number | null>(null)
  // Track last processed read marker per chat per user to avoid double-decrement
  const lastReadByUser = ref<Record<number, Record<number, number>>>({})

  const unreadTotal = computed(() => conversations.value.reduce((s, c) => s + (c.unread_count || 0), 0))

  let sse: EventSource | null = null
  const sseConnected = ref(false)
  const pollingTimer = ref<number | null>(null)

  function formatYMDHMSLocal(d: Date) {
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }

  async function fetchConversations() {
    const res = await $fetch<{ success: boolean, data: ChatConversation[] }>(`/api/chats`)
    conversations.value = res.data || []
  }

  async function markReadAll() {
    await $fetch(`/api/chats/read-all`, { method: 'post' })
    // locally clear conversation unread badges
    conversations.value = conversations.value.map(c => ({ ...c, unread_count: 0 }))
  }

  async function fetchMessages(chatId: number, days = 7) {
    const res = await $fetch<{ success: boolean, data: ChatMessage[] }>(`/api/chats/${chatId}/messages`, { query: { days } })
    messagesByChat.value[chatId] = res.data || []
  }

  async function searchMessages(chatId: number, q: string, limit = 50, offset = 0) {
    if (!q || !q.trim()) return [] as ChatMessage[]
    const res = await $fetch<{ success: boolean, data: ChatMessage[] }>(`/api/chats/${chatId}/search`, { query: { q, limit, offset } })
    return res.data || []
  }

  async function fetchAround(chatId: number, messageId: number, before = 50, after = 50) {
    const res = await $fetch<{ success: boolean, data: ChatMessage[] }>(`/api/chats/${chatId}/around`, { query: { messageId, before, after } })
    messagesByChat.value[chatId] = res.data || []
    return messagesByChat.value[chatId]
  }

  function getMessages(chatId: number) {
    return messagesByChat.value[chatId] || []
  }

  function setActiveChat(chatId: number | null) {
    activeChatId.value = chatId
  }

  async function openChat(chatId: number) {
    setActiveChat(chatId)
    await fetchMessages(chatId)
    await markRead(chatId)
  }

  async function createOrOpenDirectChat(targetUserId: number) {
    const res = await $fetch<{ success: boolean, chatId: number }>(`/api/chats/start`, { method: 'POST', body: { targetUserId } })
    await fetchConversations()
    await openChat(res.chatId)
  }

  async function markRead(chatId: number) {
    const msgs = getMessages(chatId)
    const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : undefined
    const lastId = lastMsg?.id ?? 0
    await $fetch(`/api/chats/${chatId}/read`, { method: 'POST', body: { lastMessageId: lastId } })
    // update local unread count to 0
    const idx = conversations.value.findIndex(c => c.id === chatId)
    if (idx >= 0) {
      const conv = conversations.value[idx]
      if (conv) conv.unread_count = 0
    }
  }

  async function sendMessage(chatId: number, content: string) {
    const res = await $fetch<{ success: boolean, data: { message: ChatMessage } }>(`/api/chats/${chatId}/message`, {
      method: 'POST',
      body: { content }
    })
    appendMessageLocal(res.data.message)
    updateConversationOnNewMessage(chatId, res.data.message)
    await markRead(chatId)
  }

  async function uploadAttachments(chatId: number, files: File[], content?: string) {
    const form = new FormData()
    if (content) form.append('content', content)
    for (const f of files) form.append('file', f, f.name)
    const res = await $fetch<{ success: boolean, data: { message: ChatMessage } }>(`/api/chats/${chatId}/attach`, {
      method: 'POST',
      // FormData is supported by $fetch on the client
      body: form as unknown as any,
    })
    appendMessageLocal(res.data.message)
    updateConversationOnNewMessage(chatId, res.data.message)
    await markRead(chatId)
  }

  async function leaveChat(chatId: number) {
    await $fetch(`/api/chats/${chatId}/leave`, { method: 'POST' })
    // 로컬 상태에서 해당 대화를 제거하고, 현재 열려있으면 닫기
    conversations.value = conversations.value.filter(c => c.id !== chatId)
    if (activeChatId.value === chatId) {
      activeChatId.value = null
    }
    // 목록 재조회로 정합성 유지
    await fetchConversations()
  }

  async function inviteMembers(chatId: number, userIds: number[]) {
    await $fetch(`/api/chats/${chatId}/invite`, { method: 'POST', body: { userIds } })
    // 멤버 수 변동 가능성 있으므로 목록 최신화
    await fetchConversations()
  }

  function appendMessageLocal(message: ChatMessage) {
    const arr = messagesByChat.value[message.chat_id] || (messagesByChat.value[message.chat_id] = [])
    // ensure no duplicates
    if (!arr.find(m => m.id === message.id)) {
      // ensure preformatted timestamp exists for UI
      if (!message.created_at_text && message.created_at) {
        try { message.created_at_text = formatYMDHMSLocal(new Date(message.created_at)) } catch {}
      }
      // infer initial unread_count for my message if not provided (e.g., from SSE/POST response)
      if (message.sender_id === (auth.user?.id || 0) && (message.unread_count === undefined || message.unread_count === null)) {
        const conv = conversations.value.find(c => c.id === message.chat_id)
        const others = Math.max(0, (conv?.member_count || (conv?.is_group ? 0 : 1)) - 1)
        message.unread_count = others
      }
      arr.push(message)
    }
  }

  function updateConversationOnNewMessage(chatId: number, message: ChatMessage) {
    const idx = conversations.value.findIndex(c => c.id === chatId)
    if (idx >= 0) {
      const conv = conversations.value[idx]
      if (conv) {
        conv.last_content = message.content || (message.attachments?.length ? '파일 첨부' : '')
        conv.last_at = message.created_at
        try { conv.last_at_text = formatYMDHMSLocal(new Date(message.created_at)) } catch {}
        conv.updated_at = message.created_at
        conv.last_sender_name = message.sender_name ?? conv.last_sender_name
        // increase unread if not active and not mine
        const me = auth.user?.id
        if (activeChatId.value !== chatId && message.sender_id !== me) {
          conv.unread_count = (conv.unread_count || 0) + 1
        }
      }
      // re-sort by updated_at desc
      conversations.value = [...conversations.value].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    } else {
      // if not present, refetch list
      void fetchConversations()
    }
  }

  function startSSE() {
    if (process.server || sse) return
    try {
      sse = new EventSource('/api/chats/stream')
      sse.onmessage = (evt) => {
        try {
          const payload = JSON.parse(evt.data)
          handleSSE(payload)
        } catch (e) {
          // ignore parse errors
        }
      }
      sse.onerror = () => {
        sseConnected.value = false
        // fallback to polling if needed
        startPolling()
      }
      sse.onopen = () => {
        sseConnected.value = true
        stopPolling()
      }
    } catch (e) {
      console.warn('SSE not available, fallback to polling')
      startPolling()
    }
  }

  function stopSSE() {
    if (sse) {
      sse.close()
      sse = null
      sseConnected.value = false
    }
  }

  function handleSSE(ev: any) {
    if (!ev || !ev.type) return
    switch (ev.type) {
      case 'connected':
      case 'ping':
        return
      case 'message': {
        const { chat_id, message } = ev.data || {}
        if (chat_id && message) {
          appendMessageLocal(message)
          updateConversationOnNewMessage(chat_id, message)
          if (activeChatId.value === chat_id) {
            void markRead(chat_id)
          }
        }
        return
      }
      case 'read': {
        // Decrement unread counters for messages where the reader was previously counted as unread.
        // For any message with id in (prevLast, newLast] and sender_id !== reader_id, reduce unread_count by 1.
        const { chat_id, user_id, last_message_id } = ev.data || {}
        if (!chat_id || !user_id || !last_message_id) return
        const list = messagesByChat.value[chat_id]
        if (!list || !list.length) return

        const chatMap = lastReadByUser.value[chat_id] || (lastReadByUser.value[chat_id] = {})
        const prevLast = chatMap[user_id] || 0
        const newLast = Math.max(prevLast, Number(last_message_id) || 0)
        if (newLast <= prevLast) return

        for (const m of list) {
          if (m.id > prevLast && m.id <= newLast && m.sender_id !== user_id && (m.unread_count || 0) > 0) {
            m.unread_count = Math.max(0, (m.unread_count || 0) - 1)
          }
        }
        chatMap[user_id] = newLast
        return
      }
      case 'conversation': {
        // handle conversation events (e.g., member left)
        const data = ev.data || {}
        if (data?.action === 'left') {
          const chatId = data.chat_id
          const userName = data.user_name || '사용자'
          const me = auth.user?.id
          // 본인이 나간 경우: 목록 갱신만 (이미 leaveChat에서 처리)
          if (data.user_id && me && data.user_id === me) {
            void fetchConversations()
            return
          }
          // 시스템 메시지로 남김: 가상 메시지 객체 푸시
          const sysMessageId = Date.now()
          const msg = {
            id: sysMessageId,
            chat_id: chatId,
            sender_id: 0,
            sender_name: null,
            content: `${userName} 님이 나갔습니다.`,
            created_at: new Date().toISOString(),
            created_at_text: undefined,
            attachments: [] as any[],
          } as ChatMessage
          appendMessageLocal(msg)
          updateConversationOnNewMessage(chatId, msg)
          return
        }
        if (data?.action === 'invited') {
          const chatId = data.chat_id
          const inviterName = data.inviter_name || '사용자'
          const invitedNames: string[] = Array.isArray(data.invited_user_names) ? data.invited_user_names : []
          const list = invitedNames.slice(0, 2).join(', ')
          const more = invitedNames.length > 2 ? ` 외 ${invitedNames.length - 2}명` : ''
          const text = invitedNames.length ? `${inviterName} 님이 ${list}${more}을(를) 초대했습니다.` : `${inviterName} 님이 참여자를 초대했습니다.`

          const sysMessageId = Date.now()
          const msg = {
            id: sysMessageId,
            chat_id: chatId,
            sender_id: 0,
            sender_name: null,
            content: text,
            created_at: new Date().toISOString(),
            created_at_text: undefined,
            attachments: [] as any[],
          } as ChatMessage
          appendMessageLocal(msg)
          updateConversationOnNewMessage(chatId, msg)
          // 멤버 수 변동 반영을 위해 목록 리프레시
          void fetchConversations()
          return
        }
        // fallback: 목록 갱신
        void fetchConversations()
        return
      }
    }
  }

  function startPolling(intervalMs = 30000) {
    if (pollingTimer.value) return
    void fetchConversations()
    pollingTimer.value = window.setInterval(() => {
      void fetchConversations()
      if (activeChatId.value) void fetchMessages(activeChatId.value)
    }, intervalMs)
  }

  function stopPolling() {
    if (pollingTimer.value) {
      window.clearInterval(pollingTimer.value)
      pollingTimer.value = null
    }
  }

  function isImage(att: ChatAttachment) {
    const t = (att.mime_type || '').toLowerCase()
    return t.startsWith('image/')
  }

  return {
    conversations,
    messagesByChat,
    activeChatId,
    unreadTotal,
    fetchConversations,
    fetchMessages,
    getMessages,
    setActiveChat,
    openChat,
    createOrOpenDirectChat,
    markRead,
    markReadAll,
    sendMessage,
    uploadAttachments,
    leaveChat,
    inviteMembers,
    searchMessages,
    fetchAround,
    startSSE,
    stopSSE,
    startPolling,
    stopPolling,
    isImage,
    sseConnected,
  }
})
