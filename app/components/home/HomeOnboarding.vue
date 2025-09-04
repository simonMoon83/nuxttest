<script setup lang='ts'>
const auth = useAuthStore()
const steps = ref([
  { key: 'profile', label: '프로필 설정', done: false, to: '/admin/users' },
  { key: '2fa', label: '2단계 인증', done: false, to: '/admin/system' },
  { key: 'notifications', label: '알림 설정', done: false, to: '/prime/messages' },
])
const percent = computed(() => Math.round(steps.value.filter(s => s.done).length / steps.value.length * 100))
const router = useRouter()

function open(s: any) {
  router.push(s.to)
}
</script>

<template>
  <div class="card surface-0 bg-white border border-gray-300 shadow-sm dark:bg-gray-800 dark:border-gray-700">
    <div class="p-4">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">온보딩 체크리스트</h3>
        <div class="text-sm text-gray-600 dark:text-gray-400">진행률 {{ percent }}%</div>
      </div>
      <ul class="space-y-2">
        <li v-for="s in steps" :key="s.key" class="flex items-center justify-between p-2 border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-700 rounded">
          <span class="text-gray-900 dark:text-gray-100">{{ s.label }}</span>
          <button class="p-button p-component p-button-text p-button-sm" @click="open(s)">바로가기</button>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped></style>


