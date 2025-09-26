<template>
  <Dialog
    v-model:visible="visible"
    modal
    :draggable="false"
    :style="{ width: '720px', maxWidth: '95vw' }"
    :header="title"
  >
    <table class="detail-table w-full">
      <tbody>
        <tr v-for="([key, val], idx) in displayEntries" :key="String(key)" class="detail-row">
          <td class="detail-label">{{ key }}</td>
          <td class="detail-value">
            <template v-if="isYN(val)">
              <Checkbox :binary="true" :model-value="toBool(localRow[key])" @update:modelValue="(v:boolean) => onToggleYN(key, v)" />
            </template>
            <template v-else>
              <InputText v-model.trim="localRow[key]" class="detail-input p-inputtext-sm" />
            </template>
          </td>
        </tr>
      </tbody>
    </table>

    <template #footer>
      <Button label="닫기" @click="close" />
    </template>
  </Dialog>
</template>

<script setup lang='ts'>
interface Props {
  modelValue?: boolean
  row?: Record<string, any> | null
  title?: string
  excludeKeys?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  row: null,
  title: '상세',
  excludeKeys: () => ['__status', '__rownum']
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'close': []
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v)
})

const localRow = ref<Record<string, any>>({})

watch(() => props.row, (r) => {
  localRow.value = r ? { ...r } : {}
}, { immediate: true, deep: false })

const displayEntries = computed<[string, any][]>(() => {
  const r = localRow.value || {}
  const excludes = new Set(props.excludeKeys || [])
  return Object.entries(r).filter(([k]) => !excludes.has(k))
})

function close() {
  visible.value = false
  emit('close')
}

function formatValue(v: any): string {
  if (v == null) return ''
  if (v instanceof Date) return v.toISOString()
  if (typeof v === 'object') {
    try { return JSON.stringify(v, null, 2) } catch { return String(v) }
  }
  return String(v)
}

function isYN(v: any): boolean {
  if (typeof v === 'string') {
    const s = v.trim().toUpperCase()
    return s === 'Y' || s === 'N'
  }
  return false
}

function toBool(v: any): boolean {
  return String(v).trim().toUpperCase() === 'Y'
}

function onToggleYN(key: string, checked: boolean) {
  localRow.value[key] = checked ? 'Y' : 'N'
}
</script>

<style scoped>
.detail-table { border-collapse: collapse; width: 100%; }
.detail-row { border-bottom: 1px solid var(--p-content-border-color, #e5e7eb); }
.detail-label { width: 200px; padding: 8px 12px; text-align: right; color: var(--p-text-color-secondary, #6b7280); vertical-align: top; }
.detail-value { padding: 8px 12px; }
.detail-input { width: 100%; }
</style>
