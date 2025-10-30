import Aura from '@primeuix/themes/aura'
// Single source for chat upload limits
const CHAT_MAX_FILE_MB = 150
const CHAT_ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.txt', '.zip', '.doc', '.docx', '.xls', '.xlsx']
import pkg from './package.json'

// Environment detection
// eslint-disable-next-line node/prefer-global/process
const isDevelopment = process.env.NODE_ENV === 'development'

export const wrappedPrimeInputs: string[] = ['AutoComplete', 'CascadeSelect', 'Checkbox', 'Chip', 'ColorPicker', 'DatePicker', 'Editor', 'InputMask', 'InputNumber', 'InputOtp', 'InputText', 'Knob', 'Listbox', 'MultiSelect', 'Password', 'RadioButton', 'Rating', 'Select', 'SelectButton', 'Slider', 'Textarea', 'ToggleButton', 'ToggleSwitch', 'TreeSelect', 'Button']

export default defineNuxtConfig({
  css: ['~/App.scss'],

  modules: [
    '@pinia/nuxt',
    '@nuxt/content',
    '@vueuse/nuxt',
    '@nuxt/test-utils/module',
    '@nuxt/eslint',
    '@nuxt/image',
    '@nuxt/fonts',
    '@sfxcode/formkit-primevue-nuxt',
    '@unocss/nuxt',
    '@pinia/colada-nuxt',
  ],

  ssr: true,
  devtools: { enabled: true },
  runtimeConfig: {
    public: {
      APP_VERSION: pkg.version,
      APP_NAME: pkg.name,
      // eslint-disable-next-line node/prefer-global/process
      APP_MODE: process.env?.NODE_ENV,
      // Expose for client-side hints (UI validations, accept attr etc.)
      chatUpload: {
        maxFileMb: CHAT_MAX_FILE_MB,
        allowedExts: CHAT_ALLOWED_EXTS,
      },
    },
    // Server-only usage
    chatUpload: {
      maxFileMb: CHAT_MAX_FILE_MB,
      allowedExts: CHAT_ALLOWED_EXTS,
    },
  },

  build: {
    transpile: ['nuxt', 'primevue', '@sfxcode/formkit-primevue'],
  },

  sourcemap: {
    client: false,
    server: false,
  },
  future: {
    compatibilityVersion: 4,
  },
  experimental: {
    appManifest: false,
  },

  nitro: {
    serveStatic: true,
    publicAssets: [
      { dir: 'public', baseURL: '/' },
    ],
    routeRules: {
      // Use the same single source limit above and disable parser to avoid early body parsing
      '/api/chats/**': { body: { maxSize: `${CHAT_MAX_FILE_MB}mb`, parser: false } },

      // Global security headers
      '/**': {
        headers: {
          // Content Security Policy - 엄격한 XSS 방지
          // 개발: Nuxt/Vue HMR을 위해 unsafe-inline/unsafe-eval 허용
          // 프로덕션: 더 엄격한 정책 적용 (향후 nonce 기반 CSP 권장)
          'Content-Security-Policy': [
            "default-src 'self'",
            // 개발 환경에서는 HMR과 devtools를 위해 느슨한 정책 사용
            isDevelopment
              ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
              : "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // 프로덕션도 Vue 특성상 필요
            isDevelopment
              ? "style-src 'self' 'unsafe-inline'"
              : "style-src 'self' 'unsafe-inline'", // 프로덕션도 동적 스타일링을 위해 필요
            "img-src 'self' data: blob:",
            "font-src 'self' data:",
            "connect-src 'self'", // API 호출 제한
            "media-src 'self'",
            "object-src 'none'", // Flash 등 플러그인 차단
            "frame-ancestors 'self'",
            "base-uri 'self'",
            "form-action 'self'",
            ...(!isDevelopment ? ["upgrade-insecure-requests"] : []), // 프로덕션에서만 HTTPS 강제
          ].join('; '),

          // 클릭재킹 방지 (CSP frame-ancestors의 백업)
          'X-Frame-Options': 'SAMEORIGIN',

          // MIME 스니핑 방지
          'X-Content-Type-Options': 'nosniff',

          // XSS 필터 활성화 (구형 브라우저용)
          'X-XSS-Protection': '1; mode=block',

          // Referrer 정책 - 개인정보 보호 강화
          'Referrer-Policy': 'strict-origin-when-cross-origin',

          // 권한 정책 - 불필요한 브라우저 기능 제한
          'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',

          // HSTS - HTTPS 강제 (프로덕션에서만 활성화 권장)
          // 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        },
      },

      // 개발 서버 특수 경로에도 보안 헤더 적용
      '/_nuxt/**': {
        headers: {
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'SAMEORIGIN',
        },
      },
      '/@fs/**': {
        headers: {
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'SAMEORIGIN',
        },
      },
      '/@vite/**': {
        headers: {
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'SAMEORIGIN',
        },
      },
    },
    // X-Powered-By 헤더 제거
    compressPublicAssets: true,
  },

  compatibilityDate: '2024-07-04',
  debug: false,

  eslint: {
    config: {
      standalone: false,
      nuxt: {
        sortConfigKeys: true,
      },
    },
  },
  formkitPrimevue: {
    includePrimeIcons: true,
    includeStyles: true,
    installFormKit: true,
    installI18N: true,
  },

  i18n: {
    lazy: true,
    langDir: 'locales',
    defaultLocale: 'en',
    strategy: 'no_prefix',
    locales: [
      { code: 'en', file: 'en.json', name: 'English' },
      { code: 'de', file: 'de.json', name: 'German' },
    ],
    vueI18n: '../vue-i18n.options.ts',
    bundle: {
      optimizeTranslationDirective: false,
    },
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root',
      cookieSecure: true, // HTTPS에서만 전송
      cookieSameSite: 'lax', // CSRF 방지
      cookieCrossOrigin: false,
    },
  },
  primevue: {
    autoImport: true,
    options: {
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: '.dark',
        },
      },
      ripple: true,
    },
    components: {
      exclude: [...wrappedPrimeInputs, 'Form', 'FormField'],
    },

  },

  // Nuxt Fonts 보안 설정
  fonts: {
    // CORS 헤더 제거 (불필요한 Cross-Domain 접근 방지)
    defaults: {
      headers: {
        'Access-Control-Allow-Origin': undefined, // CORS 헤더 제거
      },
    },
  },

})
