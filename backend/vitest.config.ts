import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      // Measure source files only — build scripts and output are not runtime code.
      exclude: ['scripts/**', 'dist/**', 'eslint.config.mjs', 'vitest.config.ts', '**/*.test.ts'],
    },
  },
});
