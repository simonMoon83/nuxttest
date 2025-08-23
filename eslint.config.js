// @ts-check
import antfu from '@antfu/eslint-config'
import nuxt from './.nuxt/eslint.config.mjs'

export default antfu(
  {
    unocss: true,
    formatters: true,
    pnpm: true,
  },
).append(
  nuxt(),
  {
    files: ['app/**/*.vue'],
    rules: {
      // Vue 템플릿 스타일 규칙 완화 (디자인/기성 코드 보존)
      'vue/html-indent': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/multiline-html-element-content-newline': 'off',
      'vue/html-self-closing': 'off',
      'vue/attribute-hyphenation': 'off',
      'vue/v-on-event-hyphenation': 'off',
      'vue/component-tags-order': 'off',
      'vue/attributes-order': 'off',
      // UnoCSS 유틸리티 정렬 강제 해제
      'unocss/order': 'off',
      // 스타일 규칙 완화 (템플릿/스크립트 손상 방지)
      'style/indent': 'off',
      'style/no-trailing-spaces': 'off',
      'style/comma-dangle': 'off',
      'style/brace-style': 'off',
      'style/if-newline': 'off',
      'style/arrow-parens': 'off',
      // antfu 커스텀 규칙 완화
      'antfu/top-level-function': 'off',
      'antfu/component-tags-order': 'off',
      'antfu/if-newline': 'off',
      // 선언 전 사용 허용 (SFC 내 함수 순서 유연성)
      'no-use-before-define': 'off',
      '@typescript-eslint/no-use-before-define': 'off',
    },
  },
)
