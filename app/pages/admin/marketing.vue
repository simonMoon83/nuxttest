<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: ['auth', 'role'], permission: { resource: 'menu:/admin/marketing', action: 'read' } })

interface GalleryItem {
  image: string
  title?: string
  subtitle?: string
  link?: string
}

const loading = ref(false)
const form = reactive({
  logo: '',
  favicon: '',
  appName: '',
  appDescription: '',
  marketingTitle: '',
  marketingSubtitle: '',
  heroImage: '',
  contactHeadline: '',
  contactSubtext: '',
  marketingGallery: [] as GalleryItem[],
})

const toast = useToast()

async function load() {
  loading.value = true
  try {
    const res: any = await $fetch('/api/settings')
    const s = res?.data || {}
    form.logo = s.logo || ''
    form.favicon = s.favicon || ''
    form.appName = s.appName || ''
    form.appDescription = s.appDescription || ''
    form.marketingTitle = s.marketing?.title || ''
    form.marketingSubtitle = s.marketing?.subtitle || ''
    form.heroImage = s.marketing?.heroImage || ''
    form.contactHeadline = s.contact?.headline || ''
    form.contactSubtext = s.contact?.subtext || ''
    form.marketingGallery = Array.isArray(s.marketing?.gallery) ? s.marketing.gallery : []
  } finally { loading.value = false }
}

onMounted(load)

async function save() {
  loading.value = true
  try {
    const body = { ...form }
    await $fetch('/api/settings', { method: 'POST', body })
    toast.add({ severity: 'success', summary: '저장 완료', life: 2000 })
  } catch (e: any) {
    toast.add({ severity: 'error', summary: '저장 실패', detail: e?.data?.message || e?.message, life: 3500 })
  } finally { loading.value = false }
}

function setNestedValue(target: any, path: string, value: any) {
  const parts = String(path).split('.')
  let current: any = target
  for (let i = 0; i < parts.length - 1; i++) {
    const raw = parts[i]
    const idx = Number(raw)
    const key: any = Number.isNaN(idx) ? raw : idx
    if (current[key] == null) {
      current[key] = Number.isNaN(idx) ? {} : []
    }
    current = current[key]
  }
  const lastRaw = parts[parts.length - 1]
  const lastIdx = Number(lastRaw)
  const lastKey: any = Number.isNaN(lastIdx) ? lastRaw : lastIdx
  current[lastKey] = value
}

async function uploadAsset(field: string) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.png,.jpg,.jpeg,.svg,.webp'
  input.onchange = async () => {
    const f = input.files?.[0]
    if (!f) return
    const fd = new FormData()
    fd.append('file', f, f.name)
    try {
      const res: any = await $fetch('/api/upload/asset', { method: 'POST', body: fd })
      setNestedValue(form, field, res?.path || '')
    } catch (e: any) {
      toast.add({ severity: 'error', summary: '업로드 실패', detail: e?.data?.message || e?.message })
    }
  }
  input.click()
}
</script>

<template>
  <div class="p-4 space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold">마케팅/Contact 설정</h1>
      <Button :label="loading ? '저장중...' : '저장'" :disabled="loading" @click="save" />
    </div>

    <div class="grid md:grid-cols-2 gap-4">
      <div class="space-y-3">
        <h2 class="font-semibold">브랜딩</h2>
        <div>
          <label class="block text-sm text-gray-600 mb-1">앱 이름</label>
          <input v-model="form.appName" class="p-inputtext w-full" />
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-1">앱 설명</label>
          <textarea v-model="form.appDescription" rows="3" class="p-inputtext w-full" />
        </div>
        <div class="flex items-end gap-2">
          <div class="flex-1">
            <label class="block text-sm text-gray-600 mb-1">로고 경로</label>
            <input v-model="form.logo" class="p-inputtext w-full" placeholder="/uploads/..." />
          </div>
          <Button label="업로드" outlined @click="uploadAsset('logo')" />
        </div>
        <div class="flex items-end gap-2">
          <div class="flex-1">
            <label class="block text-sm text-gray-600 mb-1">파비콘 경로</label>
            <input v-model="form.favicon" class="p-inputtext w-full" placeholder="/uploads/..." />
          </div>
          <Button label="업로드" outlined @click="uploadAsset('favicon')" />
        </div>
      </div>

      <div class="space-y-3">
        <h2 class="font-semibold">히어로 섹션</h2>
        <div>
          <label class="block text-sm text-gray-600 mb-1">타이틀</label>
          <input v-model="form.marketingTitle" class="p-inputtext w-full" />
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-1">서브타이틀</label>
          <textarea v-model="form.marketingSubtitle" rows="3" class="p-inputtext w-full" />
        </div>
        <div class="flex items-end gap-2">
          <div class="flex-1">
            <label class="block text-sm text-gray-600 mb-1">히어로 이미지</label>
            <input v-model="form.heroImage" class="p-inputtext w-full" placeholder="/uploads/..." />
          </div>
          <Button label="업로드" outlined @click="uploadAsset('heroImage')" />
        </div>
      </div>
    </div>

    <div class="space-y-3">
      <h2 class="font-semibold">Contact 섹션</h2>
      <div>
        <label class="block text-sm text-gray-600 mb-1">헤드라인</label>
        <input v-model="form.contactHeadline" class="p-inputtext w-full" />
      </div>
      <div>
        <label class="block text-sm text-gray-600 mb-1">서브텍스트</label>
        <textarea v-model="form.contactSubtext" rows="3" class="p-inputtext w-full" />
      </div>
    </div>

    <div class="space-y-3">
      <h2 class="font-semibold">갤러리</h2>
      <div class="text-xs text-gray-500">제품 스크린샷/배너를 추가하세요. 카드형 갤러리로 노출됩니다.</div>
      <div class="space-y-2">
        <div v-for="(g, idx) in form.marketingGallery" :key="idx" class="border rounded p-3 flex flex-col gap-2 bg-white">
          <div class="flex items-end gap-2">
            <div class="flex-1">
              <label class="block text-xs text-gray-600 mb-1">이미지</label>
              <input v-model="g.image" class="p-inputtext w-full" placeholder="/uploads/..." />
            </div>
            <Button label="업로드" outlined @click="uploadAsset(`marketingGallery.${idx}.image` as any)" />
          </div>
          <div class="grid md:grid-cols-3 gap-2">
            <div>
              <label class="block text-xs text-gray-600 mb-1">타이틀</label>
              <input v-model="g.title" class="p-inputtext w-full" />
            </div>
            <div>
              <label class="block text-xs text-gray-600 mb-1">서브타이틀</label>
              <input v-model="g.subtitle" class="p-inputtext w-full" />
            </div>
            <div>
              <label class="block text-xs text-gray-600 mb-1">링크(선택)</label>
              <input v-model="g.link" class="p-inputtext w-full" placeholder="https://..." />
            </div>
          </div>
          <div class="flex justify-end">
            <Button label="삭제" text severity="danger" @click="form.marketingGallery.splice(idx, 1)" />
          </div>
        </div>
      </div>
      <div>
        <Button label="갤러리 추가" outlined icon="pi pi-plus" @click="form.marketingGallery.push({ image: '', title: '', subtitle: '', link: '' })" />
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
