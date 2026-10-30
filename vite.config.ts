import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // The backend has no CORS config; the dev server proxies API calls to it instead.
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Playwright runs the end-to-end tests in e2e/ against the real backend (`npm run e2e`).
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
})
