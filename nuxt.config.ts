import Aura from '@primeuix/themes/aura'
import pkg from './package.json'

export const wrappedPrimeInputs: string[] = ['AutoComplete', 'CascadeSelect', 'Checkbox', 'Chip', 'ColorPicker', 'DatePicker', 'Editor', 'InputMask', 'InputNumber', 'InputOtp', 'InputText', 'Knob', 'Listbox', 'MultiSelect', 'Password', 'RadioButton', 'Rating', 'Select', 'SelectButton', 'Slider', 'Textarea', 'ToggleButton', 'ToggleSwitch', 'TreeSelect']

export default defineNuxtConfig({

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
  content: {
    highlight: {
      theme: {
        // Default theme (same as single string)
        default: 'github-light',
        // Theme used if `html.dark`
        dark: 'github-dark',

      },
    },
  },

  runtimeConfig: {
    public: {
      APP_VERSION: pkg.version,
      APP_NAME: pkg.name,
      // eslint-disable-next-line node/prefer-global/process
      APP_MODE: process.env?.NODE_ENV,
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
      exclude: [...wrappedPrimeInputs, 'Button', 'Form', 'FormField', 'Chart'],
    },

  },

})
