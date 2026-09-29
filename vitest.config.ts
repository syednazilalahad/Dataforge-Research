import { defineConfig } from 'vitest/config';
import path from 'node:path';
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve('src')
    }
  },
  test: {
    include: ['tests/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
    env: {
      LOCAL_DATABASE_PATH: ':memory:',
      NODE_ENV: 'test',
      AI_PROVIDER: 'offline'
    }
  }
});
