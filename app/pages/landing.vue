<script setup lang="ts">
definePageMeta({ layout: 'marketing' })
const s = ref<any>({})
try { const r: any = await $fetch('/api/settings'); s.value = r?.data || {} } catch {}

const name = ref('')
const email = ref('')
const message = ref('')
const sending = ref(false)

async function submit() {
  if (sending.value) return
  sending.value = true
  try {
    await $fetch('/api/contact', { method: 'POST', body: { name: name.value, email: email.value, message: message.value } })
    name.value = email.value = message.value = ''
  } finally { sending.value = false }
}
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="px-4 pt-16 pb-20 bg-gradient-to-b from-white via-gray-50 to-white">
      <div class="max-w-7xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
        <div class="space-y-6">
          <div class="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
            <i class="pi pi-sparkles text-emerald-600" />
            <span>Next‑gen 스마트 팩토리 플랫폼</span>
          </div>
          <h1 class="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight">
            {{ s.marketing?.title || 'Build your Smart MES' }}
          </h1>
          <p class="text-gray-600 text-lg leading-relaxed">
            {{ s.marketing?.subtitle || '현장 데이터를 연결하고, 생산성을 높이세요.' }}
          </p>
          <div class="flex flex-col sm:flex-row gap-3">
            <NuxtLink to="/contact" class="px-5 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium shadow-sm">문의하기</NuxtLink>
            <a href="#gallery" class="px-5 py-3 rounded-lg border text-sm font-medium hover:bg-gray-100">살펴보기</a>
          </div>
          <div class="grid grid-cols-3 gap-4 pt-4">
            <div class="flex items-center gap-2 text-gray-700"><i class="pi pi-shield text-green-600"></i><span class="text-sm">엔터프라이즈 보안</span></div>
            <div class="flex items-center gap-2 text-gray-700"><i class="pi pi-cloud text-blue-600"></i><span class="text-sm">클라우드 네이티브</span></div>
            <div class="flex items-center gap-2 text-gray-700"><i class="pi pi-sliders-h text-purple-600"></i><span class="text-sm">유연한 확장성</span></div>
          </div>
        </div>
        <div class="relative">
          <div class="absolute inset-0 -z-10 blur-3xl opacity-40 bg-gradient-to-tr from-blue-300 via-emerald-200 to-indigo-200 rounded-3xl"></div>
          <img :src="s.marketing?.heroImage || '/starter_4.png'" alt="hero" class="w-full max-h-[420px] object-contain rounded-2xl border shadow-sm bg-white" />
        </div>
      </div>
    </section>

    <!-- Logo strip -->
    <section class="px-4 py-8">
      <div class="max-w-7xl mx-auto">
        <div class="text-center text-xs text-gray-500 mb-5">Trusted by modern teams</div>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 items-center gap-6 opacity-80">
          <img src="/nuxt.png" alt="nuxt" class="h-8 mx-auto" />
          <img src="/primevue-logo.webp" alt="primevue" class="h-8 mx-auto" />
          <img src="/site-logo.svg" alt="site" class="h-7 mx-auto" />
          <img src="/smart-mes-logo.svg" alt="mes" class="h-7 mx-auto" />
          <img src="/icon-green.svg" alt="icon" class="h-7 mx-auto" />
          <img src="/vite.png" alt="vite" class="h-7 mx-auto" />
        </div>
      </div>
    </section>

    <!-- Value props -->
    <section class="px-4 py-14 bg-gray-50">
      <div class="max-w-7xl mx-auto grid md:grid-cols-3 gap-6">
        <div class="rounded-2xl border bg-white p-6 shadow-sm hover:shadow-md transition">
          <div class="flex items-center justify-between">
            <div class="text-lg font-semibold">실시간 가시성</div>
            <i class="pi pi-chart-line text-blue-600"></i>
          </div>
          <p class="text-gray-600 mt-2 text-sm leading-relaxed">생산·설비·품질 데이터를 실시간으로 연결해 병목과 이슈를 빠르게 파악합니다.</p>
        </div>
        <div class="rounded-2xl border bg-white p-6 shadow-sm hover:shadow-md transition">
          <div class="flex items-center justify-between">
            <div class="text-lg font-semibold">자동화와 표준화</div>
            <i class="pi pi-cog text-emerald-600"></i>
          </div>
          <p class="text-gray-600 mt-2 text-sm leading-relaxed">표준 운영 절차를 디지털화하고 반복 업무를 자동화하여 운영 효율을 높입니다.</p>
        </div>
        <div class="rounded-2xl border bg-white p-6 shadow-sm hover:shadow-md transition">
          <div class="flex items-center justify-between">
            <div class="text-lg font-semibold">확장 가능한 아키텍처</div>
            <i class="pi pi-sitemap text-purple-600"></i>
          </div>
          <p class="text-gray-600 mt-2 text-sm leading-relaxed">모듈형 구조와 API 우선 설계로 기능 확장이 쉽고 기존 시스템과의 통합이 간단합니다.</p>
        </div>
      </div>
    </section>

    <!-- Gallery -->
    <section id="gallery" class="px-4 py-14">
      <div class="max-w-7xl mx-auto">
        <div class="flex items-end justify-between mb-6">
          <h2 class="text-xl font-semibold">제품 갤러리</h2>
          <a href="#contact" class="text-sm text-blue-600 hover:underline">문의하고 데모 받기</a>
        </div>
        <div v-if="(s.marketing?.gallery || []).length === 0" class="text-sm text-gray-500">갤러리 항목이 없습니다. 관리자에서 이미지를 업로드하세요.</div>
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <a v-for="(g, i) in (s.marketing?.gallery || [])" :key="i" :href="g.link || undefined" target="_blank" class="group rounded-2xl overflow-hidden border bg-white shadow-sm hover:shadow-md transition block">
            <div class="relative">
              <img :src="g.image" alt="" class="w-full h-52 object-cover" />
              <div class="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition"></div>
            </div>
            <div class="p-4">
              <div class="font-medium" v-if="g.title">{{ g.title }}</div>
              <div class="text-sm text-gray-600" v-if="g.subtitle">{{ g.subtitle }}</div>
              <span v-if="g.link" class="inline-flex items-center gap-1 text-xs text-blue-600 group-hover:underline">자세히 보기 <i class="pi pi-arrow-right"/></span>
            </div>
          </a>
        </div>
      </div>
    </section>

    <!-- Compact Contact widget -->
    <section id="contact" class="px-4 py-16 bg-gray-50">
      <div class="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
        <div class="md:col-span-2 space-y-3">
          <h2 class="text-xl font-semibold">{{ s.contact?.headline || 'Contact Us' }}</h2>
          <p class="text-gray-600">{{ s.contact?.subtext || '제품 문의, 데모 요청, 파트너십 제안 등 무엇이든 남겨주세요.' }}</p>
        </div>
        <div class="md:col-span-1">
          <div class="bg-white border rounded-xl p-4 shadow-sm space-y-2">
            <input v-model="name" type="text" class="p-inputtext w-full" placeholder="이름(선택)" />
            <input v-model="email" type="email" class="p-inputtext w-full" placeholder="이메일" />
            <textarea v-model="message" rows="3" class="p-inputtext w-full" placeholder="메시지"></textarea>
            <Button :label="sending ? '전송중...' : '보내기'" :disabled="sending" class="w-full" @click="submit" />
          </div>
        </div>
      </div>
    </section>

    <!-- CTA band -->
    <section class="px-4 py-12">
      <div class="max-w-6xl mx-auto bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 md:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div class="text-lg md:text-xl font-semibold">지금 바로 운영 혁신을 시작하세요</div>
          <div class="text-white/80 text-sm">데모를 요청하고, 팀에 맞춘 적용 방법을 상담받으세요.</div>
        </div>
        <NuxtLink to="/contact" class="px-5 py-3 bg-white text-blue-700 rounded-lg text-sm font-medium hover:bg-gray-100">데모 요청</NuxtLink>
      </div>
    </section>
  </div>
  
</template>

<style scoped>
</style>


