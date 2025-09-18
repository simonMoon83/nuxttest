<template>
  <div class="w-full" @wheel.passive="onWheel">
    <div class="flex items-center justify-between mb-2">
      <h5 class="m-0">{{ title }}</h5>
      <div class="flex items-center gap-2 text-sm">
        <span class="text-color-secondary">{{ currentIndex + 1 }} / {{ filteredItems.length }}</span>
        <span class="text-color-secondary">(총 {{ filteredItems.length }}건)</span>
        <Button icon="pi pi-chevron-left" text size="small" @click="prev" :disabled="!canNavigate" />
        <Button icon="pi pi-chevron-right" text size="small" @click="next" :disabled="!canNavigate" />
      </div>
    </div>

    <div v-if="currentItem" class="card p-0 overflow-hidden" @dblclick="onCardDblClick(currentItem)">
      <div class="h-1.5 bg-gradient-to-r from-blue-500 to-purple-600" />
      <div class="p-4">
        <div class="flex items-start justify-between mb-3">
          <div class="font-semibold text-lg truncate">{{ getTitle(currentItem) }}</div>
          <div class="text-xs text-color-secondary">#{{ currentIndex + 1 }}</div>
        </div>

        <div class="rounded-md border border-gray-200 dark:border-gray-700 p-3 bg-white/70 dark:bg-gray-900/40">
          <div class="grid grid-cols-2 gap-x-4 gap-y-2 items-center">
            <template v-for="col in visibleColumns" :key="col.field">
              <div class="text-xs uppercase tracking-wide text-color-secondary truncate">{{ col.headerName || col.field }}</div>
              <div>
                <input
                  type="text"
                  class="w-full text-sm px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-primary"
                  :placeholder="col.headerName || col.field"
                  :value="editableItem[col.field] ?? ''"
                  @input="onInput($event, col.field)"
                />
              </div>
            </template>
          </div>
        </div>
      </div>
      <div class="px-4 pb-3 flex items-center justify-between text-xs text-color-secondary">
        <div>마우스 휠로 다음/이전 항목 보기</div>
        <div>더블클릭으로 상세 이벤트</div>
      </div>
    </div>

    <div v-else class="card p-6 text-center text-color-secondary">
      데이터가 없습니다.
    </div>
  </div>
  
</template>

<script setup lang="ts">
interface ColumnDef { field: string; headerName?: string; hide?: boolean }

interface Props {
  title?: string
  rowData?: any[]
  columnDefs?: ColumnDef[]
  searchQuery?: string
  cols?: number | string
}

const props = withDefaults(defineProps<Props>(), {
  title: '카드 목록',
  rowData: () => [],
  columnDefs: () => [],
  searchQuery: '',
  cols: 3
})

const emit = defineEmits<{
  'card-double-clicked': [row: any]
}>()

// 단일 카드뷰로 표시하므로 gridClass는 사용하지 않음(호환성 유지)
const gridClass = computed(() => 'grid-cols-1')

const visibleColumns = computed<ColumnDef[]>(() => {
  const defs = Array.isArray(props.columnDefs) ? props.columnDefs : []
  const filtered = defs.filter(d => d && d.field && !d.hide)
  if (filtered.length > 0) return filtered
  // columnDefs가 없을 경우: 첫 아이템의 키를 사용
  const first = props.rowData?.[0]
  if (!first) return []
  return Object.keys(first).map((k) => ({ field: k, headerName: k }))
})

const filteredItems = computed(() => {
  const q = (props.searchQuery || '').toString().toLowerCase().trim()
  const items = Array.isArray(props.rowData) ? props.rowData : []
  if (!q) return items
  return items.filter(row => {
    try {
      // 모든 표시 컬럼을 대상으로 quick filter 적용
      return visibleColumns.value.some(col => {
        const v = row?.[col.field]
        return formatValue(v).toLowerCase().includes(q)
      })
    } catch { return true }
  })
})

// 현재 인덱스 및 아이템
const currentIndex = ref(0)
const currentItem = computed<any | null>(() => filteredItems.value[currentIndex.value] ?? null)
const canNavigate = computed(() => filteredItems.value.length > 1)

// 입력 편집용 반응 객체
const editableItem = reactive<Record<string, any>>({})

watch(currentItem, (row) => {
  // 현재 아이템 변경 시 입력값 동기화
  for (const key of Object.keys(editableItem)) delete editableItem[key]
  if (row && typeof row === 'object') {
    Object.keys(row).forEach(k => { editableItem[k] = row[k] })
  }
}, { immediate: true })

watch(filteredItems, (list) => {
  if (!list || list.length === 0) { currentIndex.value = 0; return }
  if (currentIndex.value >= list.length) currentIndex.value = list.length - 1
  if (currentIndex.value < 0) currentIndex.value = 0
})

function formatValue(v: any): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') {
    try { return JSON.stringify(v) } catch { return String(v) }
  }
  return String(v)
}

function getTitle(row: any): string {
  // title 후보: headerName이 있는 첫 컬럼 값 또는 name/title/href 순서
  const first = visibleColumns.value[0]?.field
  const fallback = row?.title || row?.name || row?.href || ''
  if (!first) return fallback
  const v = row?.[first]
  const s = formatValue(v)
  return s || fallback || '항목'
}

function onCardDblClick(row: any) {
  emit('card-double-clicked', row)
}

function onInput(e: Event, field: string) {
  const target = e.target as HTMLInputElement
  editableItem[field] = target?.value
}

// expose
function applyFilter() { /* no-op: computed가 반응 */ }
function getItems() { return filteredItems.value }
function next() { if (!filteredItems.value.length) return; currentIndex.value = (currentIndex.value + 1) % filteredItems.value.length }
function prev() { if (!filteredItems.value.length) return; currentIndex.value = (currentIndex.value - 1 + filteredItems.value.length) % filteredItems.value.length }
const wheelCooldownMs = 200
let lastWheelAt = 0
function onWheel(e: WheelEvent) {
  const now = Date.now()
  if (now - lastWheelAt < wheelCooldownMs) return
  lastWheelAt = now
  if (e.deltaY > 0) next()
  else if (e.deltaY < 0) prev()
}

defineExpose({ applyFilter, getItems, next, prev })
</script>

<style scoped>
</style>


