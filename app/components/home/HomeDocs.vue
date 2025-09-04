<script setup lang='ts'>
const router = useRouter()
function go(path: string) { router.push(path) }
</script>

<template>
  <div class="card surface-0 bg-white border border-gray-300 shadow-sm dark:bg-gray-800 dark:border-gray-700">
    <div class="p-4">
      <h3 class="text-lg font-semibold mb-3">문서 / 가이드</h3>
      <div class="grid grid-cols-2 gap-2">
        <button class="p-button p-component p-button-sm p-button-outlined" @click="go('/ui/tiptap')">에디터(TipTap)</button>
        <button class="p-button p-component p-button-sm p-button-outlined" @click="go('/prime/messages')">Prime Messages</button>
        <button class="p-button p-component p-button-sm p-button-outlined" @click="go('/data/server')">서버 데이터</button>
        <button class="p-button p-component p-button-sm p-button-outlined" @click="go('/exam/demo')">데모 페이지</button>
      </div>
    </div>
  </div>
</template>

<style scoped></style>


