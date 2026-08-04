import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.spec.ts'],
    setupFiles: ['tests/setup.ts'],
    globals: true,
    // Spec files share the `fuurin_test` database and truncate it in
    // beforeEach. Serialize files so truncations can't clobber rows a
    // parallel file is asserting on.
    fileParallelism: false,
  },
})