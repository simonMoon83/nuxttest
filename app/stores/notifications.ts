export interface NotificationItem {
  id: number
  title: string
  message?: string | null
  is_read: boolean
  created_at: string
  created_at_text?: string
  read_at?: string | null
  read_at_text?: string | null
}

interface ListResponse {
  success: boolean
  data: NotificationItem[]
  unreadCount: number
}

export const useNotificationStore = defineStore('notifications', () => {
  const items = ref<NotificationItem[]>([])
  const unreadCount = ref<number>(0)
  const isLoading = ref(false)
  const pollingTimer = ref<number | null>(null)
  // 최근 받아본 알림의 최대 ID (신규 토스트 표시에 사용)
  const lastMaxId = ref<number>(0)
  const initialized = ref(false)

  const hasUnread = computed(() => unreadCount.value > 0)

  function formatYMDHMSLocal(d: Date) {
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }

  async function fetchList(limit = 50) {
    isLoading.value = true
    try {
      const res = await $fetch<ListResponse>('/api/notifications', {
        query: { limit }
      })
      const newList = res.data || []
      // 신규 항목 토스트 표시 (클라이언트 전용)
      try {
        if (typeof window !== 'undefined' && initialized.value) {
          const prevMax = lastMaxId.value || 0
          const newItems = newList.filter(n => n.id > prevMax)
          if (newItems.length > 0) {
            const { showInfoMessage } = useMessages()
            const top = newItems.slice(0, 3)
            top.forEach(n => {
              showInfoMessage(n.title, n.message ?? n.title, 3500)
            })
            if (newItems.length > top.length) {
              showInfoMessage('새 알림', `${newItems.length - top.length}건의 추가 알림이 있습니다.`, 3000)
            }
          }
        }
      } catch {}

      // 상태 갱신
      items.value = newList
      unreadCount.value = res.unreadCount || 0
      // 최대 ID 갱신
      lastMaxId.value = Math.max(lastMaxId.value || 0, ...newList.map(n => n.id)) || lastMaxId.value || 0
      initialized.value = true
    } catch (e) {
      // noop
    } finally {
      isLoading.value = false
    }
  }

  async function markRead(ids: number[]) {
    if (!ids?.length) return
    try {
      await $fetch('/api/notifications/mark-read', {
        method: 'POST',
        body: { ids }
      })
      // 낙관적 업데이트
      const idSet = new Set(ids)
      const now = new Date()
      const nowIso = now.toISOString()
      const nowText = formatYMDHMSLocal(now)
      items.value = items.value.map((n) => idSet.has(n.id)
        ? { ...n, is_read: true, read_at: n.read_at ?? nowIso, read_at_text: n.read_at_text ?? nowText }
        : n)
      unreadCount.value = Math.max(0, items.value.filter(n => !n.is_read).length)
    } catch (e) {
      // fallback: 재조회
      await fetchList()
    }
  }

  async function markAllRead() {
    try {
      await $fetch('/api/notifications/mark-read', {
        method: 'POST',
        body: { markAll: true }
      })
      const now = new Date()
      const nowIso = now.toISOString()
      const nowText = formatYMDHMSLocal(now)
      items.value = items.value.map((n) => ({
        ...n,
        is_read: true,
        read_at: n.read_at ?? nowIso,
        read_at_text: n.read_at_text ?? nowText
      }))
      unreadCount.value = 0
    } catch (e) {
      await fetchList()
    }
  }

  function startPolling(intervalMs = 30000) {
    if (pollingTimer.value) return
    // 즉시 1회
    fetchList().catch(() => {})
    const id = window.setInterval(() => {
      fetchList().catch(() => {})
    }, intervalMs)
    pollingTimer.value = id as unknown as number
  }

  function stopPolling() {
    if (pollingTimer.value) {
      window.clearInterval(pollingTimer.value)
      pollingTimer.value = null
    }
  }

  return {
    items,
    unreadCount,
    hasUnread,
    isLoading,
    fetchList,
    markRead,
    markAllRead,
    startPolling,
    stopPolling,
  }
})


