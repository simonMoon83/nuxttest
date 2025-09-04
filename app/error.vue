<script setup lang="ts">
const props = defineProps<{ error: any }>()

const status = computed(() => Number(props.error?.statusCode) || 500)
const title = computed(() => props.error?.statusMessage || 'Error')

function goHome() { return navigateTo('/') }
function goBack() { if (process.client && history.length > 1) history.back(); else goHome() }
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-6">
    <div class="w-full max-w-lg rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-8 text-center">
      <div class="mb-2 text-5xl font-bold" :class="status === 403 ? 'text-orange-500' : status === 404 ? 'text-blue-500' : 'text-red-500'">
        {{ status }}
      </div>
      <div class="text-xl font-semibold mb-4">
        {{ status === 403 ? '접근 권한이 없습니다.' : status === 404 ? '페이지를 찾을 수 없습니다.' : title }}
      </div>
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
        <span v-if="status === 403">이 페이지에 접근하려면 적절한 권한이 필요합니다. 관리자에게 권한을 요청하거나, 권한 있는 계정으로 로그인하세요.</span>
        <span v-else-if="status === 404">입력한 주소가 정확한지 확인해주세요.</span>
        <span v-else>문제가 지속되면 관리자에게 문의해 주세요.</span>
      </p>
      <div class="flex gap-2 justify-center">
        <Button label="이전으로" icon="pi pi-arrow-left" outlined @click="goBack" />
        <Button label="홈으로" icon="pi pi-home" @click="goHome" />
        <NuxtLink v-if="status === 403" to="/admin/roles" class="no-underline">
          <Button label="권한 요청" icon="pi pi-lock" severity="secondary" outlined />
        </NuxtLink>
      </div>
    </div>
  </div>
  
</template>

<style scoped>
.min-h-screen { min-height: 100vh; }
</style>


