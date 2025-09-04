<script setup lang='ts'>
import HomeHero from '@/components/home/HomeHero.vue'
import HomeKpis from '@/components/home/HomeKpis.vue'
import HomeQuickActions from '@/components/home/HomeQuickActions.vue'
import HomeActivityTabs from '@/components/home/HomeActivityTabs.vue'
import HomeRecents from '@/components/home/HomeRecents.vue'
import HomeOnboarding from '@/components/home/HomeOnboarding.vue'
import HomeDocs from '@/components/home/HomeDocs.vue'

// 인증 미들웨어 적용
definePageMeta({
  middleware: 'auth',
  hideTitle: true,
})

const authStore = useAuthStore()
const notifications = useNotificationStore()
const chat = useChatStore()

const showOnboarding = ref(false)

onMounted(() => {
  // 알림 폴링 시작 (즉시 1회 + 주기)
  try { notifications.startPolling(30000) } catch {}
  // 채팅: 목록 1회 조회 후 SSE 시도, 실패 시 폴링 자동 대체
  chat.fetchConversations().catch(() => {})
  try { chat.startSSE() } catch {}
})

onBeforeUnmount(() => {
  try { notifications.stopPolling() } catch {}
  try { chat.stopSSE() } catch {}
  try { chat.stopPolling() } catch {}
})
</script>

<template>
  <div class="space-y-6">
    <HomeHero />

    <div class="grid grid-cols-1 xl:grid-cols-12 gap-4">
      <div class="xl:col-span-8 space-y-4">
        <HomeKpis />
        <HomeActivityTabs />
      </div>
      <div class="xl:col-span-4 space-y-4">
        <HomeQuickActions />
        <HomeRecents />
      </div>
    </div>

    <HomeOnboarding v-if="showOnboarding" />
    <HomeDocs />



  </div>
</template>

<style scoped></style>
