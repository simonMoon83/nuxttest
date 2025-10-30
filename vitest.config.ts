import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    include: ['test/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-secret-key-for-testing-purposes-only',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['server/**/*.ts'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '.nuxt/**',
        'test/**',
        '**/*.config.*',
        '**/*.d.ts',
      ],
    },
  },
  // any custom Vitest config you require
})
