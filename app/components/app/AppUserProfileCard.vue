<script setup lang="ts">
interface Props {
  visible: boolean
  user: any
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'logout'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const profileCardRef = ref<HTMLElement>()

// 외부 클릭 시 프로필 카드 닫기
onClickOutside(profileCardRef, () => {
  emit('update:visible', false)
})

// ESC 키로 프로필 카드 닫기
onKeyStroke('Escape', () => {
  if (props.visible) {
    emit('update:visible', false)
  }
})

// 프로필 카드가 열릴 때 포커스 설정
watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    nextTick(() => {
      profileCardRef.value?.focus()
    })
  }
})

function handleLogout() {
  emit('logout')
  emit('update:visible', false)
}

function closeProfile() {
  emit('update:visible', false)
}

function handleProfileEdit() {
  // 프로필 편집 페이지로 이동
  navigateTo('/profile/edit')
  closeProfile()
}

function handleSettings() {
  // 설정 페이지로 이동
  navigateTo('/settings')
  closeProfile()
}

function handleHelp() {
  // 도움말 페이지로 이동
  navigateTo('/help')
  closeProfile()
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div 
        v-if="visible"
        class="fixed inset-0 z-50"
      >
        <!-- 배경 오버레이 -->
        <div 
          class="absolute inset-0 bg-black bg-opacity-20 backdrop-blur-sm"
          @click="closeProfile"
        />
        
        <!-- 프로필 카드 -->
        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="opacity-0 scale-95 translate-y-4"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100 scale-100 translate-y-0"
          leave-to-class="opacity-0 scale-95 translate-y-4"
        >
          <div 
            v-if="visible"
            ref="profileCardRef"
            class="absolute top-20 right-4 sm:right-6 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-80 max-w-[calc(100vw-2rem)] sm:max-w-80 overflow-hidden focus:outline-none transform"
            tabindex="-1"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-card-title"
          >
            <!-- 헤더 -->
            <div class="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 px-6 py-5 text-white relative overflow-hidden">
              <!-- 배경 패턴 -->
              <div class="absolute inset-0 opacity-10">
                <div class="absolute -top-2 -right-2 w-20 h-20 bg-white rounded-full opacity-20"></div>
                <div class="absolute -bottom-4 -left-4 w-16 h-16 bg-white rounded-full opacity-10"></div>
              </div>
              
              <div class="flex items-center justify-between relative z-10">
                <div class="flex items-center space-x-3">
                  <div class="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                    <i class="pi pi-user text-xl" aria-hidden="true"></i>
                  </div>
                  <div class="min-w-0 flex-1">
                    <h3 id="profile-card-title" class="font-semibold text-lg leading-tight truncate mb-0.5">
                      {{ user?.full_name || user?.username || '사용자' }}
                    </h3>
                    <p class="text-blue-100 text-sm leading-tight truncate m-0">
                      {{ user?.email || 'email@example.com' }}
                    </p>
                  </div>
                </div>
                <Button 
                  icon="pi pi-times" 
                  size="small"
                  text
                  rounded
                  class="text-white hover:bg-white hover:bg-opacity-20 flex-shrink-0 transition-all duration-200"
                  @click="closeProfile"
                  aria-label="프로필 카드 닫기"
                />
              </div>
            </div>

            <!-- 사용자 정보 -->
            <div class="p-6 bg-gray-50 dark:bg-gray-800/50">
              <div class="grid grid-cols-2 gap-4">
                <!-- 상태 -->
                <div class="bg-white dark:bg-gray-700 p-3 rounded-lg shadow-sm">
                  <span class="text-gray-600 dark:text-gray-400 text-xs font-medium block mb-1">상태</span>
                  <Tag 
                    :value="user?.status || '활성'"
                    severity="success"
                    rounded
                    class="text-xs"
                  />
                </div>

                <!-- 역할 -->
                <div class="bg-white dark:bg-gray-700 p-3 rounded-lg shadow-sm">
                  <span class="text-gray-600 dark:text-gray-400 text-xs font-medium block mb-1">역할</span>
                  <Tag 
                    :value="user?.role || '사용자'"
                    severity="info"
                    rounded
                    class="text-xs"
                  />
                </div>

                <!-- 가입일 -->
                <div class="bg-white dark:bg-gray-700 p-3 rounded-lg shadow-sm">
                  <span class="text-gray-600 dark:text-gray-400 text-xs font-medium block mb-1">가입일</span>
                  <span class="text-gray-800 dark:text-gray-200 text-sm font-medium">
                    {{ user?.created_at ? new Date(user.created_at).toLocaleDateString('ko-KR') : '2024.01.01' }}
                  </span>
                </div>

                <!-- 최근 로그인 -->
                <div class="bg-white dark:bg-gray-700 p-3 rounded-lg shadow-sm">
                  <span class="text-gray-600 dark:text-gray-400 text-xs font-medium block mb-1">최근 로그인</span>
                  <span class="text-gray-800 dark:text-gray-200 text-sm font-medium">
                    {{ user?.last_login ? new Date(user.last_login).toLocaleDateString('ko-KR') : '오늘' }}
                  </span>
                </div>
              </div>
            </div>

            <!-- 액션 버튼들 -->
            <div class="p-4 bg-white dark:bg-gray-800 space-y-2">
              <Button 
                label="프로필 편집"
                icon="pi pi-user-edit"
                class="w-full justify-start hover:scale-[1.02] transition-transform duration-200"
                outlined
                size="small"
                @click="handleProfileEdit"
              />
              <Button 
                label="계정 설정"
                icon="pi pi-cog"
                class="w-full justify-start hover:scale-[1.02] transition-transform duration-200"
                outlined
                size="small"
                @click="handleSettings"
              />
              <Button 
                label="도움말"
                icon="pi pi-question-circle"
                class="w-full justify-start hover:scale-[1.02] transition-transform duration-200"
                outlined
                size="small"
                @click="handleHelp"
              />
              <Divider class="my-3" />
              <Button 
                label="로그아웃"
                icon="pi pi-sign-out"
                class="w-full justify-start hover:scale-[1.02] transition-transform duration-200"
                severity="danger"
                size="small"
                @click="handleLogout"
              />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
/* 커스텀 스크롤바 (필요한 경우) */
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 2px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}
</style> 