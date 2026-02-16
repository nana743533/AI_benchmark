import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'tests/e2e/**'],
    testTimeout: 30000,
    reporters: ['verbose'],
  },
});
