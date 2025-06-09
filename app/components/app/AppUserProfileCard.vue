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
  navigateTo('/profile/edit')
  closeProfile()
}

function handleSettings() {
  navigateTo('/settings')
  closeProfile()
}

function handleHelp() {
  navigateTo('/help')
  closeProfile()
}

// FormKit 스키마 정의
const profileCardSchema = computed(() => [
  {
    $el: 'div',
    attrs: {
      class: 'bg-gradient-to-r from-gray-50 to-gray-100 dark:from-blue-600 dark:to-blue-700 px-6 py-5 text-gray-800 dark:text-white relative overflow-hidden border-b border-gray-200 dark:border-blue-500'
    },
    children: [
      // 배경 패턴
      {
        $el: 'div',
        attrs: {
          class: 'absolute inset-0 opacity-10'
        },
        children: [
          {
            $el: 'div',
            attrs: {
              class: 'absolute -top-2 -right-2 w-20 h-20 bg-blue-500 dark:bg-white rounded-full opacity-20'
            }
          },
          {
            $el: 'div',
            attrs: {
              class: 'absolute -bottom-4 -left-4 w-16 h-16 bg-blue-300 dark:bg-white rounded-full opacity-10'
            }
          }
        ]
      },
      // 헤더 컨텐츠
      {
        $el: 'div',
        attrs: {
          class: 'flex items-center justify-between relative z-10'
        },
        children: [
          {
            $el: 'div',
            attrs: {
              class: 'flex items-center space-x-3'
            },
            children: [
              {
                $el: 'div',
                attrs: {
                  class: 'w-12 h-12 bg-blue-500 dark:bg-white dark:bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0 backdrop-blur-sm shadow-sm'
                },
                children: [
                  {
                    $el: 'i',
                    attrs: {
                      class: 'pi pi-user text-xl text-white dark:text-white',
                      'aria-hidden': 'true'
                    }
                  }
                ]
              },
              {
                $el: 'div',
                attrs: {
                  class: 'min-w-0 flex-1'
                },
                children: [
                  {
                    $el: 'h3',
                    attrs: {
                      id: 'profile-card-title',
                      class: 'font-semibold text-lg leading-tight truncate mb-0.5 text-gray-800 dark:text-white'
                    },
                    children: props.user?.full_name || props.user?.username || '사용자'
                  },
                  {
                    $el: 'p',
                    attrs: {
                      class: 'text-gray-600 dark:text-blue-100 text-sm leading-tight truncate m-0'
                    },
                    children: props.user?.email || 'email@example.com'
                  }
                ]
              }
            ]
          },
          {
            $cmp: 'Button',
            props: {
              icon: 'pi pi-times',
              size: 'small',
              text: true,
              rounded: true,
              class: 'text-gray-600 dark:text-white hover:bg-gray-200 dark:hover:bg-white dark:hover:bg-opacity-20 flex-shrink-0 transition-all duration-200',
              onClick: closeProfile,
              'aria-label': '프로필 카드 닫기'
            }
          }
        ]
      }
    ]
  },
  // 사용자 정보 섹션
  {
    $el: 'div',
    attrs: {
      class: 'p-6 bg-gray-50 dark:bg-gray-800/50'
    },
    children: [
      {
        $el: 'div',
        attrs: {
          class: 'grid grid-cols-2 gap-4'
        },
        children: [
          // 상태 카드
          {
            $el: 'div',
            attrs: {
              class: 'bg-white dark:bg-gray-700 p-3 rounded-lg shadow-sm'
            },
            children: [
              {
                $el: 'span',
                attrs: {
                  class: 'text-gray-600 dark:text-gray-400 text-xs font-medium block mb-1'
                },
                children: '상태'
              },
              {
                $cmp: 'Tag',
                props: {
                  value: props.user?.status || '활성',
                  severity: 'success',
                  rounded: true,
                  class: 'text-xs'
                }
              }
            ]
          },
          // 역할 카드
          {
            $el: 'div',
            attrs: {
              class: 'bg-white dark:bg-gray-700 p-3 rounded-lg shadow-sm'
            },
            children: [
              {
                $el: 'span',
                attrs: {
                  class: 'text-gray-600 dark:text-gray-400 text-xs font-medium block mb-1'
                },
                children: '역할'
              },
              {
                $cmp: 'Tag',
                props: {
                  value: props.user?.role || '사용자',
                  severity: 'info',
                  rounded: true,
                  class: 'text-xs'
                }
              }
            ]
          },
          // 가입일 카드
          {
            $el: 'div',
            attrs: {
              class: 'bg-white dark:bg-gray-700 p-3 rounded-lg shadow-sm'
            },
            children: [
              {
                $el: 'span',
                attrs: {
                  class: 'text-gray-600 dark:text-gray-400 text-xs font-medium block mb-1'
                },
                children: '가입일1'
              },
              {
                $el: 'span',
                attrs: {
                  class: 'text-gray-800 dark:text-gray-200 text-sm font-medium'
                },
                children: props.user?.created_at ? new Date(props.user.created_at).toLocaleDateString('ko-KR') : '2024.01.01'
              }
            ]
          },
          // 최근 로그인 카드
          {
            $el: 'div',
            attrs: {
              class: 'bg-white dark:bg-gray-700 p-3 rounded-lg shadow-sm'
            },
            children: [
              {
                $el: 'span',
                attrs: {
                  class: 'text-gray-600 dark:text-gray-400 text-xs font-medium block mb-1'
                },
                children: '최근 로그인'
              },
              {
                $el: 'span',
                attrs: {
                  class: 'text-gray-800 dark:text-gray-200 text-sm font-medium'
                },
                children: props.user?.last_login ? new Date(props.user.last_login).toLocaleDateString('ko-KR') : '오늘'
              }
            ]
          }
        ]
      }
    ]
  },
  // 액션 버튼 섹션
  {
    $el: 'div',
    attrs: {
      class: 'p-4 bg-white dark:bg-gray-800 space-y-2'
    },
    children: [
      {
        $cmp: 'Button',
        props: {
          label: '프로필 편집',
          icon: 'pi pi-user-edit',
          class: 'w-full justify-start hover:scale-[1.02] transition-transform duration-200',
          outlined: true,
          size: 'small',
          onClick: handleProfileEdit
        }
      },
      {
        $cmp: 'Button',
        props: {
          label: '계정 설정',
          icon: 'pi pi-cog',
          class: 'w-full justify-start hover:scale-[1.02] transition-transform duration-200',
          outlined: true,
          size: 'small',
          onClick: handleSettings
        }
      },
      {
        $cmp: 'Button',
        props: {
          label: '도움말',
          icon: 'pi pi-question-circle',
          class: 'w-full justify-start hover:scale-[1.02] transition-transform duration-200',
          outlined: true,
          size: 'small',
          onClick: handleHelp
        }
      },
      {
        $cmp: 'Divider',
        props: {
          class: 'my-3'
        }
      },
      {
        $cmp: 'Button',
        props: {
          label: '로그아웃',
          icon: 'pi pi-sign-out',
          class: 'w-full justify-start hover:scale-[1.02] transition-transform duration-200',
          severity: 'danger',
          size: 'small',
          onClick: handleLogout
        }
      }
    ]
  }
])
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
            <!-- FormKit 스키마로 렌더링 -->
            <FormKitSchema :schema="profileCardSchema" />
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