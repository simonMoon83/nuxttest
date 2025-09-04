<script setup lang='ts'>
const router = useRouter()

function go(path: string) {
  router.push(path)
}
</script>

<template>
  <div class="card surface-0 bg-white border border-gray-300 shadow-sm dark:bg-gray-800 dark:border-gray-700">
    <div class="p-4">
      <h3 class="text-lg font-semibold mb-3">빠른 작업</h3>
      <div class="grid grid-cols-2 gap-2">
        <button class="p-button p-component p-button-sm p-button-outlined" @click="go('/admin/users')">사용자 관리</button>
        <button class="p-button p-component p-button-sm p-button-outlined" @click="go('/admin/departments')">부서 관리</button>
        <button class="p-button p-component p-button-sm p-button-outlined" @click="go('/form')">폼 예제</button>
        <button class="p-button p-component p-button-sm p-button-outlined" @click="go('/prime/datatable')">데이터 테이블</button>
      </div>
    </div>
  </div>
</template>

<style scoped></style>


