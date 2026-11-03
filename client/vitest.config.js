// Vitest settings for the client tests (pnpm test): unit, component and integration tests (Week 10a / 10b).
// The browser tests (Playwright, Week 10c) are in the separate e2e/ folder.
// jsdom gives Vitest a pretend browser, so Vue components can be mounted without opening one.
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    // Test files sit in a __tests__ folder next to the code they test, named like Something.spec.js
    include: ['src/**/__tests__/**/*.spec.js'],
  },
})
