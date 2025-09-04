<script setup lang='ts'>
const auth = useAuthStore()
const router = useRouter()

function goDashboard() {
  router.push('/dashboard')
}

function goQuick() {
  router.push('/admin/users')
}
</script>

<template>
  <div class="rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 shadow">
    <div class="p-6">
      <div class="mt-1 mb-3">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">안녕하세요 👋</h1>
        <p v-if="auth.user" class="text-sm text-gray-600 dark:text-gray-400">{{ auth.user.full_name || auth.user.username }}님</p>
      </div>
      <div class="mt-4 flex gap-2 flex-wrap">
        <button class="p-button p-component p-button-rounded p-button-sm" @click="goDashboard">
          대시보드 이동
        </button>
        <button class="p-button p-component p-button-outlined p-button-rounded p-button-sm" @click="goQuick">
          빠른 작업 열기
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped></style>


