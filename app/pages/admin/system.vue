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

// 파일 업로드 관련 상태
const selectedFile = ref<File | null>(null)
const fileInput = ref()

// 디바운스 타이머 참조
const debounceTimer = ref<NodeJS.Timeout | null>(null)

// 기본 로고 설정
const defaultLogo = '/primevue-logo.webp'

// 현재 로고 상태
const currentLogo = ref(defaultLogo)

// 로고 설정 입력값
const logoSettings = ref(defaultLogo)

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

// 파일 선택 트리거
const triggerFileSelect = () => {
  const input = fileInput.value
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

// 로고 설정 저장
const saveLogo = async () => {
  saving.value = true
  
  try {
    // 로컬 스토리지에 저장
    const logoData = {
      logo: logoSettings.value,
      updatedAt: new Date().toISOString()
    }
    
    localStorage.setItem('customLogo', JSON.stringify(logoData))
    
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
    
  } catch (error) {
    console.error('로고 저장 실패:', error)
    toast.add({
      severity: 'error',
      summary: '저장 실패',
      detail: '로고 설정 저장 중 오류가 발생했습니다',
      life: 3000
    })
  } finally {
    saving.value = false
  }
}

// 기본값 복원
const restoreDefault = () => {
  logoSettings.value = defaultLogo
  currentLogo.value = defaultLogo
  
  // 로컬 스토리지에서 제거
  localStorage.removeItem('customLogo')
  
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
}

// 앱 설정 저장
const saveAppSettings = async () => {
  savingApp.value = true
  
  try {
    localStorage.setItem('appSettings', JSON.stringify(appSettings.value))
    
    toast.add({
      severity: 'success',
      summary: '설정 저장',
      detail: '애플리케이션 설정이 저장되었습니다',
      life: 3000
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: '저장 실패',
      detail: '설정 저장 중 오류가 발생했습니다',
      life: 3000
    })
  } finally {
    savingApp.value = false
  }
}

// 설정 로드
const loadSettings = () => {
  try {
    // 로고 설정 로드
    const savedLogo = localStorage.getItem('customLogo')
    if (savedLogo) {
      const parsed = JSON.parse(savedLogo)
      logoSettings.value = parsed.logo
      currentLogo.value = parsed.logo
    }
    
    // 앱 설정 로드
    const savedAppSettings = localStorage.getItem('appSettings')
    if (savedAppSettings) {
      appSettings.value = { ...appSettings.value, ...JSON.parse(savedAppSettings) }
    }
  } catch (error) {
    console.error('설정 로드 실패:', error)
  }
}

// 컴포넌트 언마운트 시 타이머 정리
onUnmounted(() => {
  if (debounceTimer.value) {
    clearTimeout(debounceTimer.value)
  }
})

// 컴포넌트 마운트 시 설정 로드
onMounted(() => {
  loadSettings()
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
</style> 