<script setup lang="ts">
const mode = useColorMode({
  emitAuto: true,
  modes: {
    contrast: 'dark contrast',
    cafe: 'cafe',
  },
})

const modes = ['dark', 'light', 'auto']
// const allModes = [...modes, 'cafe', 'contrast']

const { state, next } = useCycleList(modes, { initialValue: mode })

watchEffect(() => mode.value = state.value)
</script>

<template>
  <div>
    <client-only>
      <button class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 bg-white/70 dark:bg-gray-800/60 backdrop-blur-sm shadow-sm" @click="next()">
        <i v-if="mode === 'dark'" class="pi pi-moon text-gray-700 dark:text-gray-200"></i>
        <i v-else-if="mode === 'light'" class="pi pi-sun text-gray-700 dark:text-gray-200"></i>
        <i v-else class="pi pi-desktop text-gray-700 dark:text-gray-200"></i>
      </button>
    </client-only>
  </div>
</template>

<style>
html.cafe {
  filter: sepia(0.9) hue-rotate(315deg) brightness(0.9);
}
html.contrast {
  filter: contrast(2);
}
</style>
