import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // No setup files for e2e tests - they need real file system
    testTimeout: 30000, // Longer timeout for e2e tests
    include: ['test/e2e/**/*.test.ts']
  }
});
