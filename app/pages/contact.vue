<script setup lang="ts">
definePageMeta({ layout: 'marketing' })

const settings = ref<any>({})
try {
  const res: any = await $fetch('/api/settings')
  settings.value = res?.data || {}
} catch {}

const name = ref('')
const email = ref('')
const message = ref('')
const sending = ref(false)
const sent = ref(false)
const toast = useToast?.() as any

function showToast(summary: string, detail?: string, severity: 'success' | 'warn' | 'error' = 'success') {
  try { toast?.add?.({ severity, summary, detail, life: 3500 }) } catch {}
}

async function submit() {
  if (sending.value) return
  const em = email.value.trim()
  const msg = message.value.trim()
  if (!em) { showToast('이메일을 입력하세요', undefined, 'warn'); return }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { showToast('유효한 이메일을 입력하세요', undefined, 'warn'); return }
  if (!msg) { showToast('메시지를 입력하세요', undefined, 'warn'); return }
  sending.value = true
  try {
    await $fetch('/api/contact', { method: 'POST', body: { name: name.value, email: em, message: msg } })
    sent.value = true
    name.value = ''
    email.value = ''
    message.value = ''
    showToast('문의가 접수되었습니다.')
  } catch (e: any) {
    const m = e?.data?.message || e?.message || '전송 중 오류가 발생했습니다.'
    showToast('전송 실패', m, 'error')
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <section class="px-4 py-10">
    <div class="max-w-3xl mx-auto">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-semibold">{{ settings.contact?.headline || 'Contact Us' }}</h1>
        <p class="text-gray-600 mt-2">{{ settings.contact?.subtext || '제품 문의, 데모 요청, 파트너십 제안 등 무엇이든 편히 남겨주세요.' }}</p>
      </div>

      <div class="bg-white rounded-lg border p-5 shadow-sm">
        <div class="grid gap-4">
          <div>
            <label class="block text-sm text-gray-600 mb-1">이름(선택)</label>
            <input v-model="name" type="text" class="p-inputtext w-full" placeholder="홍길동" />
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">이메일</label>
            <input v-model="email" type="email" class="p-inputtext w-full" placeholder="you@example.com" />
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">메시지</label>
            <textarea v-model="message" rows="6" class="p-inputtext w-full" placeholder="내용을 입력하세요"></textarea>
          </div>
          <div class="flex items-center gap-2">
            <Button :label="sending ? '전송중...' : '전송'" :disabled="sending" @click="submit" />
            <span v-if="sent" class="text-sm text-emerald-600">전송되었습니다. 곧 연락드리겠습니다.</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
</style>


