<script setup lang="ts">
import type { ChatAttachment } from '../../stores/chat'

const props = defineProps<{ visible: boolean, chatId: number | null }>()
const emit = defineEmits<{ (e: 'update:visible', v: boolean): void }>()

const chat = useChatStore()
const auth = useAuthStore()

const text = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const pendingFiles = ref<File[]>([])
const messagesEl = ref<HTMLElement | null>(null)

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

watch([() => props.visible, () => props.chatId], async ([vis, id]) => {
  if (vis && id) {
    chat.setActiveChat(id)
    await chat.fetchMessages(id)
    await chat.markRead(id)
    nextTick(() => scrollToBottom())
  }
  else if (!vis) {
    chat.setActiveChat(null)
  }
}, { immediate: true })

// Track whether list is already at bottom to decide autoscroll on new messages
const atBottom = ref(true)
const hasNewBelow = ref(false)

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
    if (isMine || atBottom.value) {
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

function close() {
  emit('update:visible', false)
}

async function send() {
  const id = props.chatId
  const content = text.value.trim()
  if (!id) return
  if (pendingFiles.value.length) {
    await chat.uploadAttachments(id, pendingFiles.value, content || undefined)
    pendingFiles.value = []
    if (fileInput.value) fileInput.value.value = ''
    text.value = ''
    if (props.visible) nextTick(() => scrollToBottom())
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
  try { return new Date(v).toLocaleString() } catch { return v }
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
  const last = messages.value && messages.value[messages.value.length - 1]
  const isMine = !!last && last.sender_id === meId.value
  if (isMine || atBottom.value) {
    scrollToBottom()
    hasNewBelow.value = false
  } else {
    hasNewBelow.value = true
  }
}
</script>

<template>
  <Dialog :visible="visible" modal :blockScroll="true" appendTo="body" :style="{ width: '720px', maxWidth: '95vw' }" @update:visible="v => emit('update:visible', v)">
    <template #header>
      <div class="flex items-center gap-2">
        <i class="pi pi-comments"></i>
        <span class="font-semibold">{{ chatTitle }}</span>
      </div>
    </template>

    <div class="flex flex-col gap-3 h-[70vh] max-h-[70vh]">
      <div ref="messagesEl" class="flex-1 min-h-0 overflow-auto p-2 pb-10 bg-gray-50 dark:bg-gray-800/30 rounded border border-gray-200 dark:border-gray-700" @scroll="onMessagesScroll">
        <div v-for="m in messages" :key="m.id" class="mb-3">
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

          <div :class="['text-[11px] text-gray-400 mt-0.5', m.sender_id === meId ? 'text-right' : 'text-left']">{{ formatTime(m.created_at) }}</div>
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
        <textarea v-model="text" rows="2" class="w-full p-inputtext p-inputtext-sm" placeholder="메시지를 입력하세요" @keydown.enter.exact.prevent="send"></textarea>
        <div class="flex items-center justify-between gap-2">
          <div class="flex-1 min-w-0">
            <!-- Hidden file input -->
            <input ref="fileInput" type="file" class="hidden" multiple @change="onFileChange" />
            <div class="flex items-center gap-2">
              <Button size="small" outlined severity="secondary" icon="pi pi-paperclip" label="첨부" @click="triggerFilePicker" />
              <div v-if="pendingFiles.length" class="flex flex-wrap items-center gap-1 text-xs text-gray-700 dark:text-gray-200">
                <span class="mr-1 text-gray-500">첨부:</span>
                <span v-for="(f, i) in pendingFiles" :key="i" class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-700">
                  <i class="pi pi-file text-gray-600 dark:text-gray-300"></i>
                  <span class="truncate max-w-40">{{ f.name }}</span>
                  <span class="opacity-70">· {{ formatSize(f.size) }}</span>
                  <button class="ml-1 hover:text-red-600" @click="removeFile(i)">
                    <i class="pi pi-times text-xs"></i>
                  </button>
                </span>
                <button class="ml-1 underline hover:text-red-600" @click="clearPending">모두 지우기</button>
              </div>
              <div v-else class="text-xs text-gray-500">파일을 드래그앤드롭 하거나 ‘첨부’를 클릭</div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <Button label="보내기" size="small" @click="send" />
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
</template>

<style scoped>
</style>
