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
  unread_count: number
  other_user_id?: number | null
  other_user_name?: string | null
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
  content: string | null
  created_at: string
  attachments?: ChatAttachment[]
}

export const useChatStore = defineStore('chat', () => {
  const auth = useAuthStore()

  const conversations = ref<ChatConversation[]>([])
  const messagesByChat = ref<Record<number, ChatMessage[]>>({})
  const activeChatId = ref<number | null>(null)

  const unreadTotal = computed(() => conversations.value.reduce((s, c) => s + (c.unread_count || 0), 0))

  let sse: EventSource | null = null
  const sseConnected = ref(false)
  const pollingTimer = ref<number | null>(null)

  async function fetchConversations() {
    const res = await $fetch<{ success: boolean, data: ChatConversation[] }>(`/api/chats`)
    conversations.value = res.data || []
  }

  async function fetchMessages(chatId: number, days = 7) {
    const res = await $fetch<{ success: boolean, data: ChatMessage[] }>(`/api/chats/${chatId}/messages`, { query: { days } })
    messagesByChat.value[chatId] = res.data || []
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

  function appendMessageLocal(message: ChatMessage) {
    const arr = messagesByChat.value[message.chat_id] || (messagesByChat.value[message.chat_id] = [])
    // ensure no duplicates
    if (!arr.find(m => m.id === message.id)) arr.push(message)
  }

  function updateConversationOnNewMessage(chatId: number, message: ChatMessage) {
    const idx = conversations.value.findIndex(c => c.id === chatId)
    if (idx >= 0) {
      const conv = conversations.value[idx]
      if (conv) {
        conv.last_content = message.content || (message.attachments?.length ? `[${message.attachments.length} file(s)]` : '')
        conv.last_at = message.created_at
        conv.updated_at = message.created_at
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
        // optionally handle read receipts
        return
      }
      case 'conversation': {
        // future: handle new conversation
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
    sendMessage,
    uploadAttachments,
    startSSE,
    stopSSE,
    startPolling,
    stopPolling,
    isImage,
    sseConnected,
  }
})
