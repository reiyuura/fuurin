import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    // Any colocated spec under src/ runs — the previous narrow glob
    // (src/lib/repositories only) would silently skip future tests.
    include: ['src/**/*.spec.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})