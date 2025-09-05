<script setup lang="ts">
import type { ChatAttachment } from '../../stores/chat'

const props = defineProps<{ visible: boolean, chatId: number | null }>()
const emit = defineEmits<{ (e: 'update:visible', v: boolean): void }>()

const chat = useChatStore()
const auth = useAuthStore()
const toast = useToast()

const text = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const pendingFiles = ref<File[]>([])
const messagesEl = ref<HTMLElement | null>(null)

// 업로드 진행 상태
const uploading = ref(false)
const perFileProgress = ref<number[]>([])

// Drag & drop visual state
const dropActive = ref(false)

// Preserve previous inline styles to restore later
const prevWorkspaceStyle = ref<{ overflow: string; height: string } | null>(null)
const prevHtmlOverflow = ref<string | null>(null)
const prevHtmlOverscroll = ref<string | null>(null)
const prevBodyMargin = ref<string | null>(null)

const meId = computed(() => auth.user?.id)

const messages = computed(() => props.chatId ? chat.getMessages(props.chatId) : [])

// Current conversation and title for header
const currentConversation = computed(() => chat.conversations.find(c => c.id === props.chatId) || null)
const chatTitle = computed(() => {
  const c = currentConversation.value as any
  if (!c) return '채팅'
  if (c.is_group) return c.title || '그룹 채팅'
  return c.other_user_name || c.title || '대화'
})

// Invite dialog (org tree) state
const showInvite = ref(false)
const orgTreeNodes = ref<any[]>([])
const orgTreeSelection = ref<Record<string, any>>({})
const orgTreeLoading = ref(false)
const deptIncludeSub = ref(true)

async function loadOrgTree() {
  orgTreeLoading.value = true
  try {
    const res: any = await $fetch('/api/org/tree')
    orgTreeNodes.value = res?.data || []
  } catch { orgTreeNodes.value = [] }
  finally { orgTreeLoading.value = false }
}

watch(showInvite, async (v) => { if (v) await loadOrgTree() })

const invitedUserIds = computed(() => {
  const ids: number[] = []
  for (const key of Object.keys(orgTreeSelection.value || {})) {
    const node = (orgTreeSelection.value as any)[key]
    if (!node) continue
    if (key.startsWith('u-') && node?.checked) {
      const id = Number(key.slice(2))
      if (Number.isFinite(id) && id > 0) ids.push(id)
    }
  }
  return Array.from(new Set(ids))
})

async function submitInvite() {
  const id = props.chatId
  if (!id) return
  // find selected dept (single dept support like start chat UI)
  let departmentId: number | null = null
  for (const key of Object.keys(orgTreeSelection.value || {})) {
    if (key.startsWith('d-') && (orgTreeSelection.value as any)[key]?.checked) {
      const d = Number(key.slice(2))
      if (Number.isFinite(d)) { departmentId = d; break }
    }
  }
  try {
    await $fetch(`/api/chats/${id}/invite`, {
      method: 'POST',
      body: { userIds: invitedUserIds.value, departmentId, includeSub: deptIncludeSub.value }
    })
    showInvite.value = false
    orgTreeSelection.value = {}
  } catch {}
}

// Leave chat with confirmation
const { confirmAction } = useConfirmation()

async function onLeaveCurrentChat() {
  const id = props.chatId
  if (!id) return
  confirmAction(async () => {
    await chat.leaveChat(id)
    await chat.fetchConversations()
    emit('update:visible', false)
  }, '완료', '채팅방에서 나갔습니다.', '채팅방 나가기', '이 채팅방을 나가시겠어요?')
}

watch([() => props.visible, () => props.chatId], async ([vis, id]) => {
  if (vis && id) {
    chat.setActiveChat(id)
    await chat.fetchMessages(id)
    await chat.markRead(id)
    nextTick(() => scrollToBottom())
  } else if (!vis) {
    chat.setActiveChat(null)
  }
}, { immediate: true })

// Search state & actions (full history via /api/chats/[id]/search)
const searchQuery = ref('')
const searchResults = ref<any[]>([])
const searching = ref(false)
const resultOffset = ref(0)
const hasMoreResults = ref(false)
 

 

async function runSearch(reset = true) {
  const id = props.chatId
  if (!id || !searchQuery.value.trim()) {
    if (reset) {
      searchResults.value = []
      hasMoreResults.value = false
      resultOffset.value = 0
    }
    return
  }
  if (reset) {
    searchResults.value = []
    resultOffset.value = 0
  }
  searching.value = true
  try {
    const res = await chat.searchMessages(id, searchQuery.value, 50, resultOffset.value)
    searchResults.value = reset ? res : [...searchResults.value, ...res]
    hasMoreResults.value = res.length === 50
    resultOffset.value += res.length
  } finally {
    searching.value = false
  }
}

function clearSearch() {
  searchQuery.value = ''
  searchResults.value = []
  hasMoreResults.value = false
  resultOffset.value = 0
}

let searchTimer: ReturnType<typeof setTimeout> | null = null
function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => runSearch(true), 220)
}

const highlightMessageId = ref<number | null>(null)

async function openResult(m: any) {
  const id = props.chatId || m.chat_id
  if (!id) return
  try {
    // prevent auto-bottom behavior while loading
    atBottom.value = false
    focusMessageId.value = m.id
    await chat.fetchAround(id, m.id, 60, 60)
    // proactively scroll to the message after data loads (watcher may not fire if length unchanged)
    nextTick(() => {
      scrollToMessage(m.id as number)
      setTimeout(() => scrollToMessage(m.id as number, 4), 120)
    })
  } catch {}
  // Close search panel after opening
  clearSearch()
  // Let the watcher and image-load hooks handle scrolling via focusMessageId
  // Clear focus flag a bit later to re-enable normal autoscroll
  setTimeout(() => { if (focusMessageId.value === m.id) focusMessageId.value = null }, 600)
  highlightMessageId.value = m.id
  setTimeout(() => { if (highlightMessageId.value === m.id) highlightMessageId.value = null }, 1600)
}

// Track whether list is already at bottom to decide autoscroll on new messages
const atBottom = ref(true)
const hasNewBelow = ref(false)
const focusMessageId = ref<number | null>(null)

function isNearBottom(el: HTMLElement, threshold = 20) {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold
}

function onMessagesScroll() {
  const el = messagesEl.value
  if (!el) return
  atBottom.value = isNearBottom(el)
  if (atBottom.value) hasNewBelow.value = false
}

function goToBottom() {
  hasNewBelow.value = false
  scrollToBottom()
}

// Lock body scroll when dialog is visible
watch(() => props.visible, (vis) => {
  if (process.client) {
    const b = document.body
    if (b) {
      b.style.overflow = vis ? 'hidden' : ''
      if (vis) {
        prevBodyMargin.value = b.style.margin
        b.style.margin = '0'
      } else {
        if (prevBodyMargin.value !== null) b.style.margin = prevBodyMargin.value
        else b.style.margin = ''
        prevBodyMargin.value = null
      }
    }

    const htmlEl = document.documentElement as HTMLElement
    if (htmlEl) {
      if (vis) {
        prevHtmlOverflow.value = htmlEl.style.overflow
        prevHtmlOverscroll.value = (htmlEl.style as any).overscrollBehavior || ''
        htmlEl.style.overflow = 'hidden'
        ;(htmlEl.style as any).overscrollBehavior = 'none'
      } else {
        if (prevHtmlOverflow.value !== null) htmlEl.style.overflow = prevHtmlOverflow.value
        else htmlEl.style.overflow = ''
        if (prevHtmlOverscroll.value !== null) (htmlEl.style as any).overscrollBehavior = prevHtmlOverscroll.value
        else (htmlEl.style as any).overscrollBehavior = ''
        prevHtmlOverflow.value = null
        prevHtmlOverscroll.value = null
      }
    }

    const ws = document.getElementById('workspace') as HTMLElement | null
    if (ws) {
      if (vis) {
        // save previous inline styles
        prevWorkspaceStyle.value = { overflow: ws.style.overflow, height: ws.style.height }
        ws.style.overflow = 'hidden'
        ws.style.height = '100vh'
      } else {
        // restore
        const prev = prevWorkspaceStyle.value
        ws.style.overflow = prev?.overflow || ''
        ws.style.height = prev?.height || ''
        prevWorkspaceStyle.value = null
      }
    }
  }
  // no-op
}, { immediate: true })

onUnmounted(() => {
  if (process.client) {
    const b = document.body
    if (b) {
      b.style.overflow = ''
      if (prevBodyMargin.value !== null) b.style.margin = prevBodyMargin.value
      else b.style.margin = ''
      prevBodyMargin.value = null
    }
    const htmlEl = document.documentElement as HTMLElement
    if (htmlEl) {
      if (prevHtmlOverflow.value !== null) {
        htmlEl.style.overflow = prevHtmlOverflow.value
        prevHtmlOverflow.value = null
      } else {
        htmlEl.style.overflow = ''
      }
      if (prevHtmlOverscroll.value !== null) {
        (htmlEl.style as any).overscrollBehavior = prevHtmlOverscroll.value
        prevHtmlOverscroll.value = null
      } else {
        (htmlEl.style as any).overscrollBehavior = ''
      }
    }
    const ws = document.getElementById('workspace') as HTMLElement | null
    if (ws && prevWorkspaceStyle.value) {
      ws.style.overflow = prevWorkspaceStyle.value.overflow || ''
      ws.style.height = prevWorkspaceStyle.value.height || ''
      prevWorkspaceStyle.value = null
    }
  }
})

watch(() => (messages.value ? messages.value.length : 0), async () => {
  const last = messages.value && messages.value[messages.value.length - 1]
  const isMine = !!last && last.sender_id === meId.value
  if (props.visible) {
    // If focusing a searched message, suppress auto-bottom and scroll to that message instead
    if (focusMessageId.value) {
      nextTick(() => {
        scrollToMessage(focusMessageId.value as number)
        setTimeout(() => scrollToMessage(focusMessageId.value as number, 4), 120)
      })
      hasNewBelow.value = false
    } else if (isMine || atBottom.value) {
      nextTick(() => {
        scrollToBottom()
        setTimeout(() => scrollToBottom(), 50)
      })
      hasNewBelow.value = false
    } else {
      hasNewBelow.value = true
    }
  }
  if (props.visible && props.chatId) {
    await chat.markRead(props.chatId)
  }
})

function scrollToBottom() {
  const el = messagesEl.value
  if (!el) return
  // Use rAF to ensure DOM/layout is ready before scrolling
  requestAnimationFrame(() => {
    el.scrollTop = el.scrollHeight
    atBottom.value = true
  })
}

function computeOffsetTopWithin(el: HTMLElement, container: HTMLElement) {
  let y = 0
  let node: HTMLElement | null = el
  while (node && node !== container) {
    y += node.offsetTop
    node = node.offsetParent as HTMLElement | null
  }
  return y
}

function scrollToMessage(messageId: number, retry = 8) {
  const container = messagesEl.value
  if (!container) return
  const el = document.getElementById(`msg-${messageId}`)
  if (!el) {
    if (retry > 0) setTimeout(() => scrollToMessage(messageId, retry - 1), 60)
    return
  }
  const e = el as HTMLElement
  // Prefer native centering within the nearest scrollable container
  if (typeof e.scrollIntoView === 'function') {
    e.scrollIntoView({ block: 'center', inline: 'nearest' })
  } else {
    // Fallback: compute offset relative to the container scroll context
    const y = computeOffsetTopWithin(e, container)
    container.scrollTop = Math.max(0, y - (container.clientHeight / 2) + (e.clientHeight / 2))
  }
  atBottom.value = false
}

function close() {
  emit('update:visible', false)
}

async function send() {
  const id = props.chatId
  const content = text.value.trim()
  if (!id) return
  if (pendingFiles.value.length) {
    uploading.value = true
    perFileProgress.value = pendingFiles.value.map(() => 0)
    
    try {
      await chat.uploadAttachments(id, pendingFiles.value, content || undefined, (p) => {
        perFileProgress.value = p.perFilePercent
      })
      pendingFiles.value = []
      if (fileInput.value) fileInput.value.value = ''
      text.value = ''
      if (props.visible) nextTick(() => scrollToBottom())
    } catch (error: any) {
      // 에러 발생 시 pending files는 유지하여 사용자가 다시 시도할 수 있도록 함
      console.error('File upload error:', error)
      
      // 에러 객체 전체 구조 확인
      console.log('Full error object:', JSON.stringify(error, null, 2))
      
      // 다양한 경로에서 에러 메시지 추출 시도
      const errorMessage = error.data?.message || 
                          error.data?.statusMessage || 
                          error.message || 
                          error.statusMessage || 
                          error.cause?.message ||
                          '알 수 없는 오류가 발생했습니다.'
      
      console.log('Extracted error message:', errorMessage)
      
      if (error.statusCode === 415) {
        toast.add({ severity: 'warn', summary: '파일 업로드 실패', detail: errorMessage, life: 4000 })
      } else if (error.statusCode === 413) {
        toast.add({ severity: 'warn', summary: '파일 업로드 실패', detail: errorMessage, life: 4000 })
      } else {
        toast.add({ severity: 'error', summary: '파일 업로드 실패', detail: errorMessage, life: 4000 })
      }
    } finally {
      uploading.value = false
      perFileProgress.value = []
    }
    return
  }
  if (content) {
    await chat.sendMessage(id, content)
    text.value = ''
    if (props.visible) nextTick(() => scrollToBottom())
  }
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const files = input.files ? Array.from(input.files) : []
  if (files.length) pendingFiles.value = [...pendingFiles.value, ...files]
}

function removeFile(idx: number) {
  pendingFiles.value.splice(idx, 1)
}

function clearPending() {
  pendingFiles.value = []
  if (fileInput.value) fileInput.value.value = ''
}

function triggerFilePicker() {
  fileInput.value?.click()
}

// (removed) keydown handler replaced by Vue key modifiers on the textarea

function onDragOver(e: DragEvent) {
  e.preventDefault()
  dropActive.value = true
}

function onDragLeave(e: DragEvent) {
  e.preventDefault()
  dropActive.value = false
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  dropActive.value = false
  const list = e.dataTransfer?.files
  const files = list ? Array.from(list) : []
  if (files.length) pendingFiles.value = [...pendingFiles.value, ...files]
}

function isImage(att: ChatAttachment) {
  return chat.isImage(att)
}

function fileUrl(att: ChatAttachment) {
  return att.file_path
}

function formatTime(v: string) {
  try {
    const d = new Date(v)
    return new Intl.DateTimeFormat('ko-KR', { timeStyle: 'short', hour12: true, timeZone: 'Asia/Seoul' }).format(d)
  } catch { return v }
}

function formatSize(n?: number) {
  if (!n && n !== 0) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let s = n as number
  while (s >= 1024 && i < units.length - 1) { s /= 1024; i++ }
  const fixed = s < 10 && i > 0 ? s.toFixed(1) : s.toFixed(0)
  return `${fixed} ${units[i]}`
}

function onAttachmentImageLoad() {
  if (!props.visible) return
  if (focusMessageId.value) {
    // When focusing a search target, keep current scroll and try re-centering that message
    nextTick(() => scrollToMessage(focusMessageId.value as number, 4))
    return
  }
  const last = messages.value && messages.value[messages.value.length - 1]
  const isMine = !!last && last.sender_id === meId.value
  if (isMine || atBottom.value) {
    scrollToBottom()
    hasNewBelow.value = false
  } else {
    hasNewBelow.value = true
  }
}

// Participants dialog state & actions
const showMembers = ref(false)
const members = ref<Array<{ id: number; name: string; username: string; is_active: boolean }>>([])
const membersLoading = ref(false)

async function openMembers() {
  const id = props.chatId
  if (!id) return
  membersLoading.value = true
  try {
    const res: any = await $fetch(`/api/chats/${id}/members`)
    members.value = (res?.data || [])
  } catch (e) {
    members.value = []
  } finally {
    membersLoading.value = false
    showMembers.value = true
  }
}
</script>

<template>
  <Dialog :visible="visible" modal :blockScroll="true" appendTo="body" :style="{ width: '720px', maxWidth: '95vw' }" @update:visible="v => emit('update:visible', v)">
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <i class="pi pi-comments"></i>
          <span class="font-semibold">{{ chatTitle }}</span>
          <button v-if="currentConversation && currentConversation.is_group && currentConversation.member_count"
                  class="text-xs text-gray-500 hover:text-gray-700 underline-offset-2 hover:underline"
                  type="button"
                  @click.stop="openMembers">
            ({{ currentConversation.member_count }})
          </button>
        </div>
        <div class="flex items-center gap-2">
          <Button size="small" text icon="pi pi-user-plus" label="초대" @click.stop="() => showInvite = true" />
          <button
            class="w-7 h-7 rounded-full flex items-center justify-center border border-gray-300 dark:border-gray-600 bg-white/70 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm"
            v-tooltip.bottom="'나가기'"
            @click.stop="onLeaveCurrentChat"
          >
            <i class="pi pi-sign-out text-gray-700 dark:text-gray-200 text-sm"></i>
          </button>
        </div>
      </div>
    </template>

    <div class="flex flex-col gap-3 h-[70vh] max-h-[70vh]">
      <!-- Search Bar -->
      <div class="flex items-center gap-2 mb-2">
        <input v-model="searchQuery"
               class="p-inputtext p-inputtext-sm flex-1"
               placeholder="채팅 내 검색"
               @input="onSearchInput"
               @keydown.enter="runSearch(true)" />
        <Button size="small" icon="pi pi-search" label="검색" @click="runSearch(true)" />
        <Button v-if="searchQuery" size="small" text label="지우기" @click="clearSearch" />
      </div>
      <!-- Search Results -->
      <div v-if="searchQuery || searchResults.length" class="mb-2 max-h-48 overflow-auto rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div v-if="searching" class="p-2 text-sm text-gray-500">검색중...</div>
        <ul v-else class="divide-y divide-gray-200 dark:divide-gray-700">
          <li v-for="r in searchResults" :key="r.id" class="p-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800" @click="openResult(r)">
            <div class="text-[11px] text-gray-500">{{ r.created_at_text || formatTime(r.created_at) }} · {{ r.sender_name }}</div>
            <div class="text-sm truncate" v-if="r.content">{{ r.content }}</div>
            <div class="text-sm text-gray-500" v-else>파일 첨부</div>
          </li>
          <li v-if="!searchResults.length" class="p-2 text-sm text-gray-500">결과 없음</li>
        </ul>
        <div v-if="hasMoreResults" class="p-2 text-center">
          <Button size="small" text label="더 보기" @click="runSearch(false)" />
        </div>
      </div>

      <div ref="messagesEl" class="flex-1 min-h-0 overflow-auto p-2 pb-10 bg-gray-50 dark:bg-gray-800/30 rounded border border-gray-200 dark:border-gray-700" @scroll="onMessagesScroll">
        <div v-for="m in messages" :key="m.id" :id="`msg-${m.id}`"
             :class="['mb-3 transition-colors', highlightMessageId === m.id ? 'bg-amber-50 dark:bg-amber-900/20 rounded' : '']">
          <!-- System message (e.g., left/joined) -->
          <div v-if="m.sender_id === 0 && m.content" class="text-center text-[12px] text-gray-500 my-2">
            {{ m.content }}
          </div>
          <template v-else>
          <!-- Sender name (group chats, non-self) -->
          <div v-if="currentConversation && currentConversation.is_group && m.sender_id !== meId"
               class="text-[11px] text-gray-500 mb-0.5 text-left">
            {{ m.sender_name || '알 수 없음' }}
          </div>
          <!-- Text bubble (only if content exists) -->
          <div :class="['flex', m.sender_id === meId ? 'justify-end' : 'justify-start']" v-if="m.content">
            <div class="max-w-[85%] rounded px-3 py-2 shadow text-sm whitespace-pre-wrap break-words bg-white dark:bg-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700">
              <div>{{ m.content }}</div>
            </div>
          </div>

          <!-- Attachments rendered outside of blue bubble for clean layout -->
          <div v-if="m.attachments?.length" :class="['flex mt-1', m.sender_id === meId ? 'justify-end' : 'justify-start']">
            <div class="max-w-[85%]">
              <!-- Image thumbnails -->
              <div :class="['grid gap-2', (m.attachments.filter(a => isImage(a)).length > 1) ? 'grid-cols-2' : 'grid-cols-1']" v-if="m.attachments.some(a => isImage(a))">
                <a v-for="att in m.attachments.filter(a => isImage(a))" :key="att.id" :href="fileUrl(att)" target="_blank" class="block group focus:outline-none outline-none">
                  <img :src="fileUrl(att)" class="w-auto max-w-full h-auto max-h-60 object-contain rounded-md border border-gray-200 dark:border-gray-700 bg-white" @load="onAttachmentImageLoad" />
                </a>
              </div>
              <!-- File cards -->
              <div class="mt-2 space-y-1" v-if="m.attachments.some(a => !isImage(a))">
                <a v-for="att in m.attachments.filter(a => !isImage(a))" :key="att.id" :href="fileUrl(att)" target="_blank" download
                   class="w-full flex items-center gap-2 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs text-gray-900 dark:text-gray-100 focus:outline-none outline-none">
                  <i class="pi pi-file text-gray-700 dark:text-gray-300"></i>
                  <span class="truncate">{{ att.file_name }}</span>
                  <span class="opacity-70">· {{ formatSize(att.size) }}</span>
                  <i class="pi pi-download ml-auto opacity-60"></i>
                </a>
              </div>
            </div>
          </div>

          <div :class="['text-[11px] text-gray-400 mt-0.5', m.sender_id === meId ? 'text-right' : 'text-left']">
            <span>{{ m.created_at_text || formatTime(m.created_at) }}</span>
            <span v-if="(m.unread_count || 0) > 0"
                  class="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-[10px] align-middle">
              {{ m.unread_count }}
            </span>
          </div>
          </template>
        </div>
        <div v-if="!messages.length" class="text-center text-sm text-gray-500 py-6">메시지가 없습니다.</div>

        <!-- New message indicator (appears when user is not at bottom) -->
        <div v-if="hasNewBelow" class="sticky bottom-2 flex justify-center">
          <button @click="goToBottom" class="px-3 py-1 rounded-full text-xs bg-blue-600 text-white shadow hover:bg-blue-700 focus:outline-none">
            새 메시지 <i class="pi pi-arrow-down ml-1"></i>
          </button>
        </div>
      </div>

      <div class="flex-shrink-0 flex flex-col gap-2" :class="dropActive ? 'rounded-lg border border-dashed border-gray-300 bg-gray-50' : ''" @dragover="onDragOver" @dragleave="onDragLeave" @drop="onDrop">
        <textarea v-model="text" rows="2" class="w-full p-inputtext p-inputtext-sm" placeholder="메시지를 입력하세요" autofocus @keydown.enter.exact.prevent="send"></textarea>
        <div class="flex items-center justify-between gap-2">
          <div class="flex-1 min-w-0">
            <!-- Hidden file input -->
            <input ref="fileInput" type="file" class="hidden" multiple @change="onFileChange" />
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <Button size="small" outlined severity="secondary" icon="pi pi-paperclip" label="첨부" @click="triggerFilePicker" />
                <div v-if="!pendingFiles.length" class="text-xs text-gray-500">파일을 드래그앤드롭 하거나 '첨부'를 클릭</div>
              </div>
              
              <!-- 첨부된 파일 목록 -->
              <div v-if="pendingFiles.length" class="space-y-1">
                <div class="flex items-center justify-between">
                  <span class="text-xs text-gray-500">첨부된 파일 ({{ pendingFiles.length }}개)</span>
                  <button class="text-xs underline hover:text-red-600" @click="clearPending" :disabled="uploading">모두 지우기</button>
                </div>
                <div class="max-h-24 overflow-y-auto space-y-1">
                  <div v-for="(f, i) in pendingFiles" :key="i" class="relative overflow-hidden px-2 py-1.5 rounded bg-gray-100 dark:bg-gray-700 text-xs">
                    <div v-if="uploading" class="absolute top-0 left-0 bottom-0 pointer-events-none" :style="{ width: (perFileProgress[i] || 0) + '%' }">
                      <div class="h-full bg-blue-500/15"></div>
                    </div>
                    <div class="relative flex items-center gap-2">
                      <i class="pi pi-file text-gray-600 dark:text-gray-300 flex-shrink-0"></i>
                      <span class="truncate flex-1 min-w-0">{{ f.name }}</span>
                      <span class="opacity-70 flex-shrink-0">{{ formatSize(f.size) }}</span>
                      <button class="hover:text-red-600 flex-shrink-0" @click="removeFile(i)" :disabled="uploading">
                        <i class="pi pi-times text-xs"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <Button 
              :label="uploading ? '업로드중...' : '보내기'" 
              size="small" 
              @click="send" 
              :disabled="uploading"
              :loading="uploading"
            />
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex items-center justify-end gap-2">
        <Button label="닫기" text @click="close" />
      </div>
    </template>
  </Dialog>

  <!-- Participants dialog -->
  <Dialog v-model:visible="showMembers" header="참여자" modal :style="{ width: '420px', maxWidth: '95vw' }">
    <div class="p-2">
      <div v-if="membersLoading" class="text-sm text-gray-500">로딩중...</div>
      <ul v-else class="divide-y divide-gray-200 dark:divide-gray-700">
        <li v-for="m in members" :key="m.id" class="py-2 flex items-center gap-2">
          <div class="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
            <i class="pi pi-user text-xs"></i>
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm truncate">
              {{ m.name }}
              <span v-if="m.id === meId" class="ml-1 text-[10px] text-gray-500">(나)</span>
            </div>
            <div class="text-[11px] text-gray-400 truncate">@{{ m.username }}</div>
          </div>
          <span class="text-[10px] px-1.5 py-0.5 rounded"
                :class="m.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'">
            {{ m.is_active ? '활성' : '비활성' }}
          </span>
        </li>
        <li v-if="!members.length" class="py-6 text-center text-sm text-gray-500">참여자가 없습니다.</li>
      </ul>
    </div>
  </Dialog>

  <!-- Invite dialog (org tree) -->
  <Dialog v-model:visible="showInvite" header="참여자 초대" modal :style="{ width: '520px', maxWidth: '95vw' }">
    <div class="p-3 space-y-3">
      <div>
        <label class="text-xs text-gray-500">조직/사용자 선택</label>
        <div class="mt-1 border rounded p-2 max-h-72 overflow-auto">
          <div v-if="orgTreeLoading" class="text-sm text-gray-500">로딩중...</div>
          <Tree v-else
            :value="orgTreeNodes"
            selectionMode="checkbox"
            v-model:selectionKeys="orgTreeSelection"
            :filter="true"
            filterMode="lenient"
            class="w-full"
          />
        </div>
        <div class="mt-2 flex items-center gap-2">
          <Checkbox v-model="deptIncludeSub" :binary="true" inputId="invInclSub" />
          <label for="invInclSub" class="text-xs text-gray-600">부서 선택 시 하위부서 포함</label>
        </div>
        <div class="text-xs text-gray-500 mt-1">부서 또는 여러 사용자를 선택하세요.</div>
      </div>

      <div class="pt-2 flex justify-end gap-2">
        <Button label="취소" text @click="() => { showInvite = false; orgTreeSelection = {}; }" />
        <Button label="초대하기" :disabled="!invitedUserIds.length && !Object.keys(orgTreeSelection || {}).some(k => k.startsWith('d-') && (orgTreeSelection as any)[k]?.checked)" @click="submitInvite" />
      </div>
    </div>
  </Dialog>
</template>

<style scoped>
</style>
