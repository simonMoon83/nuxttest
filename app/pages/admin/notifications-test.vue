<script setup lang="ts">
definePageMeta({
  title: '알림 테스트',
})

const notificationStore = useNotificationStore()

const form = reactive({
  title: '',
  message: '',
})

const isCreating = ref(false)
const selectedIds = ref<number[]>([])
// 발송 대상 선택
const isBroadcast = ref(false)
const selectedUsers = ref<Array<{ id: number; label: string }>>([])

// 조직/사용자 트리 선택 (채팅 그룹 만들기와 동일)
const orgTreeNodes = ref<any[]>([])
const orgTreeSelection = ref<Record<string, any>>({})
const orgTreeLoading = ref(false)
const orgNodeMap = ref<Record<string, any>>({})
const selectedDeptId = ref<number | null>(null)
const deptIncludeSub = ref(true)

const showDetail = ref(false)
const detailItem = ref<any | null>(null)
const mode = ref<'inbox' | 'sent'>('inbox')
const modeOptions = [
  { label: '수신함', value: 'inbox' },
  { label: '보낸함', value: 'sent' }
]
const search = ref('')

async function loadOrgTree() {
  orgTreeLoading.value = true
  try {
    const res: any = await $fetch('/api/org/tree')
    const nodes = (res?.data || []) as any[]
    orgTreeNodes.value = nodes
    const map: Record<string, any> = {}
    const dfs = (arr: any[]) => {
      for (const n of arr) {
        map[n.key] = n
        if (Array.isArray(n.children) && n.children.length) dfs(n.children)
      }
    }
    dfs(nodes)
    orgNodeMap.value = map
  } catch (e) {
    orgTreeNodes.value = []
    orgNodeMap.value = {}
  } finally {
    orgTreeLoading.value = false
  }
}

watch(orgTreeSelection, (sel) => {
  const users: any[] = []
  let dept: number | null = null
  for (const key of Object.keys(sel || {})) {
    const state = (sel as any)[key]
    const checked = state === true || state?.checked === true
    if (!checked) continue
    const node = orgNodeMap.value[key]
    if (!node) continue
    if (node.type === 'user' && node?.data?.id) {
      users.push({ id: node.data.id, label: node.label })
    } else if (node.type === 'dept') {
      const id = node?.data?.id
      if (typeof id === 'number' && id > 0 && dept == null) dept = id
    }
  }
  selectedUsers.value = users
  selectedDeptId.value = dept
}, { deep: true })

function collectTargetUserIds(): number[] {
  const idSet = new Set<number>()
  // 선택된 사용자들
  for (const u of selectedUsers.value) {
    const id = Number(u?.id)
    if (Number.isFinite(id) && id > 0) idSet.add(id)
  }
  // 선택된 부서의 사용자들
  if (selectedDeptId.value) {
    const key = `d-${selectedDeptId.value}`
    const deptNode = orgNodeMap.value[key]
    if (deptNode) {
      const pushUsers = (nodes: any[], deep: boolean) => {
        for (const n of nodes || []) {
          if (n.type === 'user' && n?.data?.id) {
            const id = Number(n.data.id)
            if (Number.isFinite(id) && id > 0) idSet.add(id)
          } else if (n.type === 'dept' && deep && Array.isArray(n.children) && n.children.length) {
            pushUsers(n.children, true)
          }
        }
      }
      const children = Array.isArray(deptNode.children) ? deptNode.children : []
      pushUsers(children, Boolean(deptIncludeSub.value))
    }
  }
  return Array.from(idSet)
}

async function refresh() {
  const m = mode.value
  const q = search.value?.trim() || ''
  const res: any = await $fetch('/api/notifications', { query: { limit: 100, mode: m, q } })
  notificationStore.items = res?.data || []
  if (m === 'inbox') notificationStore.unreadCount = res?.unreadCount || 0
}

async function createNotification() {
  if (!form.title.trim()) return
  isCreating.value = true
  try {
    const body: any = { title: form.title, message: form.message || undefined }
    if (isBroadcast.value) {
      body.broadcast = true
    } else {
      const ids = collectTargetUserIds()
      if (ids.length > 0) body.targetUserIds = ids
    }
    await $fetch('/api/notifications/create', { method: 'POST', body })
    form.title = ''
    form.message = ''
    selectedUsers.value = []
    orgTreeSelection.value = {}
    selectedDeptId.value = null
    deptIncludeSub.value = true
    isBroadcast.value = false
    await refresh()
  } finally {
    isCreating.value = false
  }
}

function resetForm() {
  form.title = ''
  form.message = ''
}

function fillFormFromNotification(n: any) {
  form.title = (n?.title || '').toString()
  form.message = (n?.message || '').toString()
}

function openDetail(n: any) {
  detailItem.value = n
  showDetail.value = true
}

async function markSelectedRead() {
  if (!selectedIds.value.length) return
  await notificationStore.markRead(selectedIds.value)
  selectedIds.value = []
}

onMounted(() => {
  Promise.all([refresh(), loadOrgTree()]).catch(() => {})
})

watch([mode, search], () => {
  refresh().catch(() => {})
})

async function deleteOne(id: number) {
  try {
    await $fetch(`/api/notifications/${id}`, { method: 'DELETE' })
    await refresh()
  } catch {}
}

async function deleteSelected() {
  if (!selectedIds.value.length) return
  try {
    await $fetch('/api/notifications/delete', { method: 'POST', body: { ids: selectedIds.value, mode: mode.value } })
    selectedIds.value = []
    await refresh()
  } catch {}
}

async function deleteAll() {
  try {
    await $fetch('/api/notifications/delete', { method: 'POST', body: { all: true, mode: mode.value } })
    selectedIds.value = []
    await refresh()
  } catch {}
}
</script>

<template>
  <div class="p-2">
    <div class="mb-3 flex flex-wrap items-center gap-2">
      <SelectButton v-model="mode" :options="modeOptions" optionLabel="label" optionValue="value" />
      <span class="ml-1 text-sm text-gray-600">보기: {{ mode === 'inbox' ? '수신함' : '보낸함' }}</span>
      <span class="flex-1"></span>
      <span class="flex items-center gap-2">
        <IconField>
          <InputIcon class="pi pi-search" />
          <InputText v-model="search" placeholder="제목/메시지 검색" @keyup.enter="refresh" />
        </IconField>
        <Button label="검색" size="small" @click="refresh" />
      </span>
    </div>
    <div class="mb-3 flex items-center gap-2">
      <Button label="새로고침" @click="refresh" :loading="notificationStore.isLoading" />
      <Button label="선택 읽음" severity="secondary" :disabled="!selectedIds.length || mode==='sent'" @click="markSelectedRead" />
      <Button label="선택 삭제" severity="danger" :disabled="!selectedIds.length" @click="deleteSelected" />
      <Button label="전체 삭제" severity="danger" outlined @click="deleteAll" />
      <Button label="모두 읽음" severity="secondary" :disabled="mode==='sent' || !notificationStore.items.length || !notificationStore.hasUnread" @click="notificationStore.markAllRead" />
      <div class="ml-auto text-sm text-gray-600 dark:text-gray-300" v-if="mode==='inbox'">미읽음: <span class="font-semibold">{{ notificationStore.unreadCount }}</span></div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div class="border rounded-md p-3">
        <div class="font-semibold mb-2">알림 생성</div>
        <div class="flex flex-col gap-2">
          <InputText v-model="form.title" placeholder="제목" />
          <Textarea v-model="form.message" placeholder="메시지 (선택)" rows="4" autoResize />
          <div class="flex items-center gap-2">
            <Checkbox v-model="isBroadcast" :binary="true" inputId="broadcast" />
            <label for="broadcast" class="text-sm">전체 발송</label>
          </div>
          <div>
            <label class="block text-sm mb-1">수신 대상 선택 (조직/사용자)</label>
            <div class="mt-1 border rounded p-2 max-h-72 overflow-auto">
              <Tree
                :value="orgTreeNodes"
                selectionMode="checkbox"
                v-model:selectionKeys="orgTreeSelection"
                :filter="true"
                filterMode="lenient"
                class="w-full"
              />
            </div>
            <div class="mt-2 flex items-center gap-2">
              <Checkbox v-model="deptIncludeSub" :binary="true" inputId="inclSub2" />
              <label for="inclSub2" class="text-xs text-gray-600">부서 선택 시 하위부서 포함</label>
            </div>
            <div class="text-xs text-gray-500 mt-1">부서 또는 여러 사용자를 선택할 수 있습니다.</div>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <Button label="생성" :loading="isCreating" :disabled="!form.title.trim()" @click="createNotification" />
              <Button label="초기화" severity="secondary" text @click="resetForm" />
            </div>
          </div>
        </div>
      </div>

      <div class="border rounded-md p-3">
        <div class="font-semibold mb-2">알림 목록</div>
        <div class="max-h-[60vh] overflow-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left border-b">
                <th class="w-10 py-2">선택</th>
                <th class="py-2">제목</th>
                <th class="py-2 w-40 text-right">상태/시간</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="n in notificationStore.items" :key="n.id" class="border-b align-top">
                <td class="py-2">
                  <Checkbox v-model="selectedIds" :value="n.id" />
                </td>
                <td class="py-2">
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex-1 min-w-0 cursor-pointer" @click="fillFormFromNotification(n)">
                      <div class="flex items-start justify-between gap-2">
                        <div :class="['font-medium', n.is_read ? 'text-gray-500' : 'text-gray-900 dark:text-gray-100']">{{ n.title }}</div>
                        <div class="shrink-0 text-[11px] text-gray-500" v-if="mode==='sent'">보낸이: 나</div>
                        <div class="shrink-0 text-[11px] text-gray-500" v-else-if="n.sender_name || n.sender_username">보낸이: {{ n.sender_name || n.sender_username }}</div>
                      </div>
                      <div class="text-gray-500 whitespace-pre-wrap break-words">{{ n.message }}</div>
                    </div>
                  </div>
                </td>
                <td class="py-2">
                  <div class="flex items-center justify-end gap-2">
                    <Button label="상세" text size="small" @click.stop="openDetail(n)" />
                    <span v-if="mode==='inbox' && n.is_read" class="text-[12px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">읽음</span>
                    <Button v-else-if="mode==='inbox'" icon="pi pi-check" text size="small" v-tooltip.bottom="'읽음 표시'" @click.stop="notificationStore.markRead([n.id])" />
                    <Button icon="pi pi-trash" text size="small" severity="danger" v-tooltip.bottom="'삭제'" @click.stop="deleteOne(n.id)" />
                  </div>
                  <div class="mt-1 text-[11px] text-gray-400 text-right leading-tight">
                    <div>수신: {{ n.created_at_text || n.created_at }}</div>
                    <div>읽음: {{ n.read_at_text || n.read_at || '-' }}</div>
                  </div>
                </td>
              </tr>
              <tr v-if="!notificationStore.items.length">
                <td colspan="3" class="py-6 text-center text-gray-500">알림이 없습니다.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <Dialog v-model:visible="showDetail" header="알림 상세" modal :style="{ width: '520px', maxWidth: '95vw' }">
      <div v-if="detailItem" class="p-2 space-y-2">
        <div class="text-sm font-semibold">{{ detailItem.title }}</div>
        <div class="text-sm text-gray-600 whitespace-pre-wrap break-words">{{ detailItem.message || '' }}</div>
        <div class="text-[11px] text-gray-400">{{ detailItem.created_at_text || detailItem.created_at }}</div>
      </div>
      <template #footer>
        <Button label="닫기" @click="showDetail = false" />
      </template>
    </Dialog>
  </div>
  
</template>

