import Aura from '@primeuix/themes/aura'
// Single source for chat upload limits
const CHAT_MAX_FILE_MB = 150
const CHAT_ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.txt', '.zip', '.doc', '.docx', '.xls', '.xlsx']
import pkg from './package.json'

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
    },
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

})
