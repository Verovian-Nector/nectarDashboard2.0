import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: [
      'tests/**/*.test.ts',
      'tests/**/*.test.tsx',
      'tests/**/__tests__/**/*.ts',
      'tests/**/__tests__/**/*.tsx',
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'src/**/__tests__/**/*.ts',
      'src/**/__tests__/**/*.tsx',
    ],
    exclude: ['tests/e2e/**'],
    setupFiles: ['src/test-setup.ts'],
  },
})