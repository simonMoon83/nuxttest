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
const userSuggestions = ref<any[]>([])

async function searchUsers(event: any) {
  const q = (event?.query || '').toString().trim()
  try {
    const res: any = await $fetch('/api/users', { query: { search: q } })
    const data = Array.isArray(res?.data) ? res.data : []
    userSuggestions.value = data.map((u: any) => ({ id: u.id, label: u.full_name || u.username || u.email || `사용자#${u.id}` }))
  } catch (e) {
    userSuggestions.value = []
  }
}

async function refresh() {
  await notificationStore.fetchList()
}

async function createNotification() {
  if (!form.title.trim()) return
  isCreating.value = true
  try {
    const body: any = { title: form.title, message: form.message || undefined }
    if (isBroadcast.value) {
      body.broadcast = true
    } else if (selectedUsers.value.length > 0) {
      body.targetUserIds = selectedUsers.value.map(u => u.id)
    }
    await $fetch('/api/notifications/create', { method: 'POST', body })
    form.title = ''
    form.message = ''
    selectedUsers.value = []
    isBroadcast.value = false
    await refresh()
  } finally {
    isCreating.value = false
  }
}

async function markSelectedRead() {
  if (!selectedIds.value.length) return
  await notificationStore.markRead(selectedIds.value)
  selectedIds.value = []
}

onMounted(() => {
  refresh().catch(() => {})
})
</script>

<template>
  <div class="p-2">
    <div class="mb-3 flex items-center gap-2">
      <Button label="새로고침" @click="refresh" :loading="notificationStore.isLoading" />
      <Button label="선택 읽음" severity="secondary" :disabled="!selectedIds.length" @click="markSelectedRead" />
      <Button label="모두 읽음" severity="secondary" :disabled="!notificationStore.items.length || !notificationStore.hasUnread" @click="notificationStore.markAllRead" />
      <div class="ml-auto text-sm text-gray-600 dark:text-gray-300">미읽음: <span class="font-semibold">{{ notificationStore.unreadCount }}</span></div>
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
            <label class="block text-sm mb-1">수신자 선택 (다중)</label>
            <AutoComplete
              v-model="selectedUsers"
              :suggestions="userSuggestions"
              optionLabel="label"
              multiple
              :disabled="isBroadcast"
              placeholder="사용자 검색"
              @complete="searchUsers"
            />
            <div v-if="!isBroadcast && selectedUsers.length === 0" class="text-xs text-gray-500 mt-1">비워두면 본인에게만 발송됩니다.</div>
          </div>
          <div>
            <Button label="생성" :loading="isCreating" :disabled="!form.title.trim()" @click="createNotification" />
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
                <th class="py-2 w-28">상태</th>
                <th class="py-2 w-44">수신시각</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="n in notificationStore.items" :key="n.id" class="border-b align-top">
                <td class="py-2">
                  <Checkbox v-model="selectedIds" :value="n.id" />
                </td>
                <td class="py-2">
                  <div :class="['font-medium', n.is_read ? 'text-gray-500' : 'text-gray-900 dark:text-gray-100']">{{ n.title }}</div>
                  <div class="text-gray-500 whitespace-pre-wrap break-words">{{ n.message }}</div>
                </td>
                <td class="py-2">
                  <div class="flex items-center gap-2">
                    <InputSwitch
                      :modelValue="n.is_read"
                      :disabled="n.is_read"
                      @update:modelValue="() => notificationStore.markRead([n.id])"
                    />
                    <span :class="n.is_read ? 'text-emerald-600' : 'text-rose-600'">{{ n.is_read ? '읽음' : '미읽음' }}</span>
                  </div>
                </td>
                <td class="py-2">
                  {{ n.created_at_text || n.created_at }}
                </td>
              </tr>
              <tr v-if="!notificationStore.items.length">
                <td colspan="4" class="py-6 text-center text-gray-500">알림이 없습니다.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
  
</template>


