<template>
  <div class="flex flex-col gap-6 p-6">
    <!-- 페이지 헤더 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-color">시스템 설정</h1>
        <p class="text-color-secondary mt-2">로고 및 애플리케이션 설정을 관리합니다</p>
      </div>
    </div>

    <!-- 현재 로고 미리보기 -->
    <Card>
      <template #title>
        <div class="flex items-center gap-2">
          <i class="pi pi-image text-primary"></i>
          현재 로고
        </div>
      </template>
      <template #content>
        <div class="flex items-center justify-center">
          <div class="text-center">
            <div class="logo-preview-container">
              <img 
                :src="currentLogo" 
                alt="Application Logo" 
                class="logo-preview"
                @error="handleImageError"
                @load="onImageLoad"
              >
              <div v-if="imageLoading" class="loading-overlay">
                <i class="pi pi-spin pi-spinner text-2xl text-primary"></i>
              </div>
            </div>
            <p class="text-sm text-color-secondary mt-2">애플리케이션 로고</p>
          </div>
        </div>
      </template>
    </Card>

    <!-- 로고 변경 설정 -->
    <Card>
      <template #title>
        <div class="flex items-center gap-2">
          <i class="pi pi-cog text-primary"></i>
          로고 변경
        </div>
      </template>
      <template #content>
        <div class="flex flex-col gap-6">
          <!-- 로고 크기 가이드 -->
          <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
            <div class="flex items-start gap-3">
              <i class="pi pi-info-circle text-blue-600 mt-1"></i>
              <div>
                <h4 class="font-semibold text-blue-900 dark:text-blue-100 mb-2">로고 크기 가이드라인</h4>
                <ul class="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li><strong>권장 크기:</strong> 200 × 60px (가로세로 비율 3.3:1)</li>
                  <li><strong>최소 크기:</strong> 120 × 40px</li>
                  <li><strong>최대 크기:</strong> 400 × 120px</li>
                  <li><strong>파일 형식:</strong> PNG, SVG, WebP (투명 배경 권장)</li>
                  <li><strong>파일 크기:</strong> 최대 2MB</li>
                  <li><strong>배경:</strong> 투명 또는 흰색 배경 권장</li>
                </ul>
              </div>
            </div>
          </div>

          <!-- 로고 설정 -->
          <div class="flex flex-col gap-3">
            <label class="font-semibold text-color">애플리케이션 로고</label>
            
            <!-- 파일 업로드 -->
            <div class="upload-section">
              <div class="file-upload-wrapper">
                <input 
                  ref="fileInput"
                  type="file" 
                  accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                  @change="handleFileSelect"
                  style="display: none"
                />
                <Button 
                  @click="triggerFileSelect"
                  icon="pi pi-upload"
                  label="파일 선택"
                  outlined
                  class="w-full mb-3"
                />
                
                <!-- 선택된 파일 정보 -->
                <div v-if="selectedFile" class="selected-file-info p-3 border border-surface-border rounded">
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                      <i class="pi pi-file text-primary"></i>
                      <span class="text-sm font-medium">{{ selectedFile.name }}</span>
                    </div>
                    <Button 
                      @click="clearFile"
                      icon="pi pi-times"
                      size="small"
                      text
                      severity="secondary"
                    />
                  </div>
                  <div class="text-xs text-color-secondary mb-3">
                    크기: {{ formatFileSize(selectedFile.size) }} | 타입: {{ selectedFile.type }}
                  </div>
                  <Button 
                    @click="uploadFile"
                    icon="pi pi-cloud-upload"
                    label="업로드"
                    class="w-full"
                    :loading="uploading"
                    :disabled="!selectedFile"
                  />
                </div>
              </div>
              
              <small class="text-color-secondary mt-2">
                또는 직접 경로를 입력하세요
              </small>
            </div>
            
            <!-- 직접 경로 입력 -->
            <div class="flex gap-3">
              <InputText 
                v-model="logoSettings" 
                placeholder="/path/to/your/logo.png"
                class="flex-1"
                @input="debouncedPreview"
              />
              <Button 
                @click="previewLogo"
                icon="pi pi-eye"
                severity="secondary"
                label="미리보기"
              />
            </div>
            <small class="text-color-secondary">
              권장 형식: PNG, SVG, WebP (최대 2MB)
            </small>
          </div>

          <!-- 액션 버튼들 -->
          <div class="flex gap-3 pt-4 border-t border-surface-border">
            <Button 
              @click="saveLogo"
              icon="pi pi-save"
              label="변경사항 저장"
              :loading="saving"
            />
            <Button 
              @click="restoreDefault"
              icon="pi pi-refresh"
              severity="secondary"
              label="기본값 복원"
              outlined
            />
          </div>
        </div>
      </template>
    </Card>

    <!-- Favicon 설정 -->
    <Card>
      <template #title>
        <div class="flex items-center gap-2">
          <i class="pi pi-bookmark text-primary"></i>
          Favicon 설정
        </div>
      </template>
      <template #content>
        <div class="flex flex-col gap-6">
          <!-- 현재 Favicon 미리보기 -->
          <div class="flex items-center justify-center">
            <div class="text-center">
              <div class="favicon-preview-container">
                <img 
                  :src="currentFavicon" 
                  alt="Current Favicon" 
                  class="favicon-preview"
                  @error="handleFaviconError"
                  @load="onFaviconLoad"
                >
                <div v-if="faviconLoading" class="loading-overlay">
                  <i class="pi pi-spin pi-spinner text-xl text-primary"></i>
                </div>
              </div>
              <p class="text-sm text-color-secondary mt-2">현재 Favicon (32x32)</p>
            </div>
          </div>

          <!-- Favicon 가이드 -->
          <div class="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border-l-4 border-purple-500">
            <div class="flex items-start gap-3">
              <i class="pi pi-info-circle text-purple-600 mt-1"></i>
              <div>
                <h4 class="font-semibold text-purple-900 dark:text-purple-100 mb-2">Favicon 가이드라인</h4>
                <ul class="text-sm text-purple-800 dark:text-purple-200 space-y-1">
                  <li><strong>권장 크기:</strong> 32×32px, 16×16px</li>
                  <li><strong>파일 형식:</strong> ICO, PNG, SVG</li>
                  <li><strong>파일 크기:</strong> 최대 1MB</li>
                  <li><strong>배경:</strong> 투명 또는 브랜드 색상</li>
                  <li><strong>디자인:</strong> 간단하고 식별 가능한 아이콘</li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Favicon 설정 -->
          <div class="flex flex-col gap-3">
            <label class="font-semibold text-color">Favicon</label>
            
            <!-- 파일 업로드 -->
            <div class="upload-section">
              <div class="file-upload-wrapper">
                <input 
                  ref="faviconInput"
                  type="file" 
                  accept=".ico,.png,.svg,image/x-icon,image/png,image/svg+xml"
                  @change="handleFaviconSelect"
                  style="display: none"
                />
                <Button 
                  @click="triggerFaviconSelect"
                  icon="pi pi-upload"
                  label="Favicon 선택"
                  outlined
                  class="w-full mb-3"
                />
                
                <!-- 선택된 파일 정보 -->
                <div v-if="selectedFavicon" class="selected-file-info p-3 border border-surface-border rounded">
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                      <i class="pi pi-file text-primary"></i>
                      <span class="text-sm font-medium">{{ selectedFavicon.name }}</span>
                    </div>
                    <Button 
                      @click="clearFavicon"
                      icon="pi pi-times"
                      size="small"
                      text
                      severity="secondary"
                    />
                  </div>
                  <div class="text-xs text-color-secondary mb-3">
                    크기: {{ formatFileSize(selectedFavicon.size) }} | 타입: {{ selectedFavicon.type }}
                  </div>
                  <Button 
                    @click="uploadFavicon"
                    icon="pi pi-cloud-upload"
                    label="업로드"
                    class="w-full"
                    :loading="uploadingFavicon"
                    :disabled="!selectedFavicon"
                  />
                </div>
              </div>
              
              <small class="text-color-secondary mt-2">
                또는 직접 경로를 입력하세요
              </small>
            </div>
            
            <!-- 직접 경로 입력 -->
            <div class="flex gap-3">
              <InputText 
                v-model="faviconSettings" 
                placeholder="/favicon.ico"
                class="flex-1"
                @input="debouncedFaviconPreview"
              />
              <Button 
                @click="previewFavicon"
                icon="pi pi-eye"
                severity="secondary"
                label="미리보기"
              />
            </div>
            <small class="text-color-secondary">
              권장 형식: ICO, PNG, SVG (최대 1MB)
            </small>
          </div>

          <!-- 액션 버튼들 -->
          <div class="flex gap-3 pt-4 border-t border-surface-border">
            <Button 
              @click="saveFavicon"
              icon="pi pi-save"
              label="Favicon 저장"
              :loading="savingFavicon"
            />
            <Button 
              @click="forceFaviconRefresh"
              icon="pi pi-refresh"
              severity="info"
              label="강제 새로고침"
              outlined
            />
            <Button 
              @click="restoreFaviconDefault"
              icon="pi pi-refresh"
              severity="secondary"
              label="기본값 복원"
              outlined
            />
          </div>
        </div>
      </template>
    </Card>

    <!-- 애플리케이션 설정 -->
    <Card>
      <template #title>
        <div class="flex items-center gap-2">
          <i class="pi pi-sliders-h text-primary"></i>
          애플리케이션 설정
        </div>
      </template>
      <template #content>
        <div class="flex flex-col gap-6">
          <div class="flex flex-col gap-3">
            <label class="font-semibold text-color">애플리케이션 이름</label>
            <InputText 
              v-model="appSettings.name" 
              placeholder="My Application"
            />
          </div>

          <div class="flex flex-col gap-3">
            <label class="font-semibold text-color">애플리케이션 설명</label>
            <Textarea 
              v-model="appSettings.description" 
              placeholder="애플리케이션에 대한 설명을 입력하세요"
              rows="3"
            />
          </div>

          <div class="flex gap-3 pt-4 border-t border-surface-border">
            <Button 
              @click="saveAppSettings"
              icon="pi pi-save"
              label="설정 저장"
              :loading="savingApp"
            />
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
// 페이지 메타 설정 (레이아웃 적용)
definePageMeta({
  middleware: 'auth'
})

// 상태 관리
const saving = ref(false)
const savingApp = ref(false)
const uploading = ref(false)
const imageLoading = ref(false)
const faviconLoading = ref(false)
const uploadingFavicon = ref(false)
const savingFavicon = ref(false)

// 파일 업로드 관련 상태
const selectedFile = ref<File | null>(null)
const selectedFavicon = ref<File | null>(null)
const fileInput = ref()
const faviconInput = ref()

// 디바운스 타이머 참조
const debounceTimer = ref<NodeJS.Timeout | null>(null)
const debounceFaviconTimer = ref<NodeJS.Timeout | null>(null)

// 기본 로고 설정
const defaultLogo = '/primevue-logo.webp'
const defaultFavicon = '/favicon.ico'

// 현재 로고 상태
const currentLogo = ref(defaultLogo)
const currentFavicon = ref(defaultFavicon)

// 로고 설정 입력값
const logoSettings = ref(defaultLogo)
const faviconSettings = ref(defaultFavicon)

// 앱 설정
const appSettings = ref({
  name: 'PrimeVue-Nuxt Starter',
  description: 'Modern full-stack application built with Nuxt 3 and PrimeVue'
})

// Toast 알림
const toast = useToast()

// 이미지 로드 이벤트
const onImageLoad = () => {
  imageLoading.value = false
}

const onFaviconLoad = () => {
  faviconLoading.value = false
}

// 이미지 에러 처리
const handleImageError = () => {
  imageLoading.value = false
  currentLogo.value = defaultLogo
  toast.add({
    severity: 'warn',
    summary: '이미지 로드 실패',
    detail: '로고를 기본값으로 복원했습니다',
    life: 3000
  })
}

const handleFaviconError = () => {
  faviconLoading.value = false
  currentFavicon.value = defaultFavicon
  toast.add({
    severity: 'warn',
    summary: '이미지 로드 실패',
    detail: 'Favicon을 기본값으로 복원했습니다',
    life: 3000
  })
}

// 디바운스된 미리보기 함수
const debouncedPreview = () => {
  // 기존 타이머 클리어
  if (debounceTimer.value) {
    clearTimeout(debounceTimer.value)
  }
  
  // 새 타이머 설정
  debounceTimer.value = setTimeout(() => {
    if (logoSettings.value.trim() && logoSettings.value !== currentLogo.value) {
      updatePreview()
    }
  }, 800)
}

const debouncedFaviconPreview = () => {
  // 기존 타이머 클리어
  if (debounceFaviconTimer.value) {
    clearTimeout(debounceFaviconTimer.value)
  }
  
  // 새 타이머 설정
  debounceFaviconTimer.value = setTimeout(() => {
    if (faviconSettings.value.trim() && faviconSettings.value !== currentFavicon.value) {
      updateFaviconPreview()
    }
  }, 800)
}

// 미리보기 업데이트 함수
const updatePreview = () => {
  if (!logoSettings.value.trim()) return
  
  imageLoading.value = true
  currentLogo.value = logoSettings.value
  
  // 이미지 로드 테스트를 위한 임시 이미지 객체 생성
  const testImg = new Image()
  
  testImg.onload = () => {
    imageLoading.value = false
    toast.add({
      severity: 'success',
      summary: '미리보기 업데이트',
      detail: '로고 미리보기가 업데이트되었습니다',
      life: 2000
    })
  }
  
  testImg.onerror = () => {
    imageLoading.value = false
    currentLogo.value = defaultLogo
    logoSettings.value = defaultLogo
    toast.add({
      severity: 'error',
      summary: '이미지 로드 실패',
      detail: '올바른 이미지 경로를 입력해주세요. 기본값으로 복원했습니다.',
      life: 3000
    })
  }
  
  testImg.src = logoSettings.value
}

const updateFaviconPreview = () => {
  if (!faviconSettings.value.trim()) return
  
  faviconLoading.value = true
  currentFavicon.value = faviconSettings.value
  
  // 이미지 로드 테스트를 위한 임시 이미지 객체 생성
  const testImg = new Image()
  
  testImg.onload = () => {
    faviconLoading.value = false
    toast.add({
      severity: 'success',
      summary: '미리보기 업데이트',
      detail: 'Favicon 미리보기가 업데이트되었습니다',
      life: 2000
    })
  }
  
  testImg.onerror = () => {
    faviconLoading.value = false
    currentFavicon.value = defaultFavicon
    faviconSettings.value = defaultFavicon
    toast.add({
      severity: 'error',
      summary: '이미지 로드 실패',
      detail: '올바른 이미지 경로를 입력해주세요. 기본값으로 복원했습니다.',
      life: 3000
    })
  }
  
  testImg.src = faviconSettings.value
}

// 로고 미리보기 (수동)
const previewLogo = () => {
  if (logoSettings.value.trim()) {
    updatePreview()
    toast.add({
      severity: 'info',
      summary: '미리보기 시작',
      detail: '로고를 미리보기하고 있습니다...',
      life: 2000
    })
  } else {
    toast.add({
      severity: 'warn',
      summary: '경로 입력 필요',
      detail: '로고 경로를 먼저 입력해주세요',
      life: 2000
    })
  }
}

// Favicon 미리보기 (수동)
const previewFavicon = () => {
  if (faviconSettings.value.trim()) {
    updateFaviconPreview()
    
    // 즉시 Favicon 적용
    const { setFavicon } = useFavicon()
    setFavicon(faviconSettings.value)
    
    toast.add({
      severity: 'info',
      summary: '미리보기 적용',
      detail: 'Favicon을 미리보기하고 브라우저에 적용했습니다',
      life: 2000
    })
  } else {
    toast.add({
      severity: 'warn',
      summary: '경로 입력 필요',
      detail: 'Favicon 경로를 먼저 입력해주세요',
      life: 2000
    })
  }
}

// 파일 선택 이벤트
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files
  
  if (!files || files.length === 0) {
    return
  }
  
  const file = files[0]
  
  // 파일이 실제로 존재하는지 확인
  if (!file) {
    return
  }
  
  // 파일 크기 검증 (2MB)
  if (file.size > 2 * 1024 * 1024) {
    toast.add({
      severity: 'error',
      summary: '파일 크기 초과',
      detail: '파일 크기는 2MB를 초과할 수 없습니다',
      life: 3000
    })
    target.value = '' // 입력 초기화
    return
  }
  
  // 파일 형식 검증
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    toast.add({
      severity: 'error',
      summary: '지원되지 않는 형식',
      detail: 'PNG, JPG, SVG, WebP 파일만 업로드 가능합니다',
      life: 3000
    })
    target.value = '' // 입력 초기화
    return
  }
  
  selectedFile.value = file
  toast.add({
    severity: 'success',
    summary: '파일 선택 완료',
    detail: `${file.name} 파일이 선택되었습니다`,
    life: 2000
  })
}

const handleFaviconSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files
  
  if (!files || files.length === 0) {
    return
  }
  
  const file = files[0]
  
  // 파일이 실제로 존재하는지 확인
  if (!file) {
    return
  }
  
  // 파일 크기 검증 (1MB)
  if (file.size > 1 * 1024 * 1024) {
    toast.add({
      severity: 'error',
      summary: '파일 크기 초과',
      detail: '파일 크기는 1MB를 초과할 수 없습니다',
      life: 3000
    })
    target.value = '' // 입력 초기화
    return
  }
  
  // 파일 형식 검증
  const allowedFaviconTypes = ['.ico', '.png', '.svg', 'image/x-icon', 'image/png', 'image/svg+xml']
  if (!allowedFaviconTypes.includes(file.type)) {
    toast.add({
      severity: 'error',
      summary: '지원되지 않는 형식',
      detail: 'ICO, PNG, SVG 파일만 업로드 가능합니다',
      life: 3000
    })
    target.value = '' // 입력 초기화
    return
  }
  
  selectedFavicon.value = file
  toast.add({
    severity: 'success',
    summary: '파일 선택 완료',
    detail: `${file.name} 파일이 선택되었습니다`,
    life: 2000
  })
}

// 파일 선택 트리거
const triggerFileSelect = () => {
  const input = fileInput.value
  if (input) {
    input.click()
  }
}

const triggerFaviconSelect = () => {
  const input = faviconInput.value
  if (input) {
    input.click()
  }
}

// 파일 크기 포맷터
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 파일 선택 취소
const clearFile = () => {
  selectedFile.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
  toast.add({
    severity: 'info',
    summary: '선택 취소',
    detail: '파일 선택이 취소되었습니다',
    life: 2000
  })
}

const clearFavicon = () => {
  selectedFavicon.value = null
  if (faviconInput.value) {
    faviconInput.value.value = ''
  }
  toast.add({
    severity: 'info',
    summary: '선택 취소',
    detail: 'Favicon 선택이 취소되었습니다',
    life: 2000
  })
}

// 파일 업로드
const uploadFile = async () => {
  if (!selectedFile.value) {
    toast.add({
      severity: 'warn',
      summary: '파일 선택 필요',
      detail: '업로드할 파일을 먼저 선택해주세요',
      life: 3000
    })
    return
  }

  uploading.value = true

  try {
    const formData = new FormData()
    formData.append('logo', selectedFile.value)

    const response = await $fetch('/api/upload/logo', {
      method: 'POST',
      body: formData
    })

    if (response.success && response.path) {
      logoSettings.value = response.path
      currentLogo.value = response.path
      
      // 파일 선택 초기화
      selectedFile.value = null
      if (fileInput.value) {
        fileInput.value.value = ''
      }

      toast.add({
        severity: 'success',
        summary: '업로드 완료',
        detail: '로고가 성공적으로 업로드되었습니다',
        life: 3000
      })
    } else {
      throw new Error('Upload failed')
    }
  } catch (error: any) {
    console.error('업로드 실패:', error)
    toast.add({
      severity: 'error',
      summary: '업로드 실패',
      detail: error.data?.message || '파일 업로드 중 오류가 발생했습니다',
      life: 5000
    })
  } finally {
    uploading.value = false
  }
}

const uploadFavicon = async () => {
  if (!selectedFavicon.value) {
    toast.add({
      severity: 'warn',
      summary: '파일 선택 필요',
      detail: '업로드할 파일을 먼저 선택해주세요',
      life: 3000
    })
    return
  }

  uploadingFavicon.value = true

  try {
    const formData = new FormData()
    formData.append('favicon', selectedFavicon.value)

    const response = await $fetch('/api/upload/favicon', {
      method: 'POST',
      body: formData
    })

    if (response.success && response.path) {
      faviconSettings.value = response.path
      currentFavicon.value = response.path
      
      // 즉시 Favicon 적용
      const { setFavicon } = useFavicon()
      setFavicon(response.path)
      
      // 파일 선택 초기화
      selectedFavicon.value = null
      if (faviconInput.value) {
        faviconInput.value.value = ''
      }

      toast.add({
        severity: 'success',
        summary: '업로드 완료',
        detail: 'Favicon이 성공적으로 업로드되고 적용되었습니다',
        life: 3000
      })
    } else {
      throw new Error('Upload failed')
    }
  } catch (error: any) {
    console.error('업로드 실패:', error)
    toast.add({
      severity: 'error',
      summary: '업로드 실패',
      detail: error.data?.message || '파일 업로드 중 오류가 발생했습니다',
      life: 5000
    })
  } finally {
    uploadingFavicon.value = false
  }
}

// 로고 설정 저장
const saveLogo = async () => {
  saving.value = true
  
  try {
    // 서버에 설정 저장
    const response = await $fetch('/api/settings', {
      method: 'POST',
      body: {
        logo: logoSettings.value,
        appName: appSettings.value.name,
        appDescription: appSettings.value.description
      }
    })

    if (response.success) {
      // 현재 로고 업데이트
      currentLogo.value = logoSettings.value
      
      // 사이드바 새로고침을 위한 이벤트 발생
      window.dispatchEvent(new CustomEvent('logo-updated'))
      
      toast.add({
        severity: 'success',
        summary: '저장 완료',
        detail: '로고 설정이 성공적으로 저장되었습니다',
        life: 3000
      })
      
      // 페이지 새로고침으로 사이드바 업데이트
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } else {
      throw new Error('서버 저장 실패')
    }
    
  } catch (error: any) {
    console.error('로고 저장 실패:', error)
    toast.add({
      severity: 'error',
      summary: '저장 실패',
      detail: error.data?.message || '로고 설정 저장 중 오류가 발생했습니다',
      life: 3000
    })
  } finally {
    saving.value = false
  }
}

// 기본값 복원
const restoreDefault = async () => {
  logoSettings.value = defaultLogo
  currentLogo.value = defaultLogo
  
  try {
    // 서버에 기본값 저장
    await $fetch('/api/settings', {
      method: 'POST',
      body: {
        logo: defaultLogo,
        appName: appSettings.value.name,
        appDescription: appSettings.value.description
      }
    })
    
    toast.add({
      severity: 'info',
      summary: '기본값 복원',
      detail: '로고가 기본값으로 복원되었습니다',
      life: 3000
    })
    
    // 페이지 새로고침으로 사이드바 업데이트
    setTimeout(() => {
      window.location.reload()
    }, 1000)
    
  } catch (error) {
    console.error('기본값 복원 실패:', error)
    toast.add({
      severity: 'error',
      summary: '복원 실패',
      detail: '기본값 복원 중 오류가 발생했습니다',
      life: 3000
    })
  }
}

// 앱 설정 저장
const saveAppSettings = async () => {
  savingApp.value = true
  
  try {
    // 서버에 설정 저장
    const response = await $fetch('/api/settings', {
      method: 'POST',
      body: {
        logo: logoSettings.value,
        appName: appSettings.value.name,
        appDescription: appSettings.value.description
      }
    })

    if (response.success) {
      // 사이드바 업데이트를 위한 이벤트 발생
      window.dispatchEvent(new CustomEvent('app-settings-updated'))
      
      toast.add({
        severity: 'success',
        summary: '설정 저장',
        detail: '애플리케이션 설정이 저장되었습니다',
        life: 3000
      })
      
      // 설정이 즉시 반영되도록 약간의 지연 후 페이지 새로고침
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } else {
      throw new Error('서버 저장 실패')
    }
    
  } catch (error: any) {
    console.error('앱 설정 저장 실패:', error)
    toast.add({
      severity: 'error',
      summary: '저장 실패',
      detail: error.data?.message || '설정 저장 중 오류가 발생했습니다',
      life: 3000
    })
  } finally {
    savingApp.value = false
  }
}

// 설정 로드
const loadSettings = async () => {
  try {
    // 서버에서 설정 로드
    const response = await $fetch('/api/settings') as any
    
    if (response?.success && response?.data) {
      const { logo, favicon, appName, appDescription } = response.data
      
      // 로고 설정 로드
      if (logo) {
        logoSettings.value = logo
        currentLogo.value = logo
      }
      
      // Favicon 설정 로드
      if (favicon) {
        faviconSettings.value = favicon
        currentFavicon.value = favicon
      }
      
      // 앱 설정 로드
      if (appName || appDescription) {
        appSettings.value = {
          name: appName || appSettings.value.name,
          description: appDescription || appSettings.value.description
        }
      }
    }
  } catch (error) {
    console.error('서버 설정 로드 실패:', error)
    
    // 서버 연결 실패 시 로컬 스토리지에서 폴백
    try {
      // 로고 설정 로드
      const savedLogo = localStorage.getItem('customLogo')
      if (savedLogo) {
        const parsed = JSON.parse(savedLogo)
        logoSettings.value = parsed.logo
        currentLogo.value = parsed.logo
      }
      
      // Favicon 설정 로드
      const savedFavicon = localStorage.getItem('customFavicon')
      if (savedFavicon) {
        const parsed = JSON.parse(savedFavicon)
        faviconSettings.value = parsed.favicon
        currentFavicon.value = parsed.favicon
      }
      
      // 앱 설정 로드
      const savedAppSettings = localStorage.getItem('appSettings')
      if (savedAppSettings) {
        appSettings.value = { ...appSettings.value, ...JSON.parse(savedAppSettings) }
      }
    } catch (localError) {
      console.error('로컬 설정 로드도 실패:', localError)
    }
  }
}

// Favicon 설정 저장
const saveFavicon = async () => {
  savingFavicon.value = true
  
  try {
    // 서버에 설정 저장
    const response = await $fetch('/api/settings', {
      method: 'POST',
      body: {
        logo: logoSettings.value,
        favicon: faviconSettings.value,
        appName: appSettings.value.name,
        appDescription: appSettings.value.description
      }
    })

    if (response.success) {
      // 현재 favicon 업데이트
      currentFavicon.value = faviconSettings.value
      
      // Favicon 즉시 적용
      const { setFavicon } = useFavicon()
      setFavicon(faviconSettings.value)
      
      toast.add({
        severity: 'success',
        summary: '저장 완료',
        detail: 'Favicon 설정이 성공적으로 저장되었습니다',
        life: 3000
      })
    } else {
      throw new Error('서버 저장 실패')
    }
    
  } catch (error: any) {
    console.error('Favicon 저장 실패:', error)
    toast.add({
      severity: 'error',
      summary: '저장 실패',
      detail: error.data?.message || 'Favicon 설정 저장 중 오류가 발생했습니다',
      life: 3000
    })
  } finally {
    savingFavicon.value = false
  }
}

// Favicon 기본값 복원
const restoreFaviconDefault = async () => {
  faviconSettings.value = defaultFavicon
  currentFavicon.value = defaultFavicon
  
  try {
    // 서버에 기본값 저장
    await $fetch('/api/settings', {
      method: 'POST',
      body: {
        logo: logoSettings.value,
        favicon: defaultFavicon,
        appName: appSettings.value.name,
        appDescription: appSettings.value.description
      }
    })
    
    // Favicon 즉시 적용
    const { setFavicon } = useFavicon()
    setFavicon(defaultFavicon)
    
    toast.add({
      severity: 'info',
      summary: '기본값 복원',
      detail: 'Favicon이 기본값으로 복원되었습니다',
      life: 3000
    })
    
  } catch (error) {
    console.error('기본값 복원 실패:', error)
    toast.add({
      severity: 'error',
      summary: '복원 실패',
      detail: '기본값 복원 중 오류가 발생했습니다',
      life: 3000
    })
  }
}

// Favicon 강제 새로고침
const forceFaviconRefresh = () => {
  const { setFavicon } = useFavicon()
  
  // 현재 favicon을 강제로 다시 적용
  setFavicon(currentFavicon.value)
  
  toast.add({
    severity: 'success',
    summary: '새로고침 완료',
    detail: 'Favicon이 강제로 새로고침되었습니다',
    life: 2000
  })
}

// 컴포넌트 언마운트 시 타이머 정리
onUnmounted(() => {
  if (debounceTimer.value) {
    clearTimeout(debounceTimer.value)
  }
  if (debounceFaviconTimer.value) {
    clearTimeout(debounceFaviconTimer.value)
  }
})

// 컴포넌트 마운트 시 설정 로드
onMounted(async () => {
  await loadSettings()
})
</script>

<style scoped>
.logo-preview-container {
  position: relative;
  width: 80px;
  height: 80px;
  border: 2px solid var(--p-surface-border);
  border-radius: 8px;
  padding: 8px;
  background: var(--p-surface-ground);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.logo-preview {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transition: opacity 0.3s ease;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(2px);
}

.upload-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-upload-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.selected-file-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.upload-component {
  width: 100%;
}

.upload-component :deep(.p-fileupload-basic) {
  justify-content: flex-start;
}

.upload-component :deep(.p-button) {
  background: var(--p-primary-color);
  border: 1px solid var(--p-primary-color);
  color: white;
}

.upload-component :deep(.p-button:hover) {
  background: var(--p-primary-600);
  border-color: var(--p-primary-600);
}

.favicon-preview-container {
  position: relative;
  width: 80px;
  height: 80px;
  border: 2px solid var(--p-surface-border);
  border-radius: 8px;
  padding: 8px;
  background: var(--p-surface-ground);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.favicon-preview {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transition: opacity 0.3s ease;
}
</style> 