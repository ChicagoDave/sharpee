import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '*.config.ts'
      ]
    }
  },
  resolve: {
    alias: {
      '@sharpee/core': path.resolve(__dirname, '../../core/src'),
      '@sharpee/world-model': path.resolve(__dirname, '../../world-model/src'),
      '@sharpee/stdlib': path.resolve(__dirname, '../../stdlib/src'),
      '@sharpee/if-domain': path.resolve(__dirname, '../../if-domain/src')
    }
  }
});