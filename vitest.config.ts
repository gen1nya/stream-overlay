import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'backend',
    environment: 'node',
    include: ['services/**/*.test.ts', '*.test.ts'],
    exclude: ['node_modules/**', 'dist/**', 'dist-backend/**', 'release/**'],
  },
});
