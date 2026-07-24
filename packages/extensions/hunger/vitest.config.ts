import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
  resolve: {
    alias: {
      '@sharpee/core': path.resolve(__dirname, '../../core/src/index.ts'),
      '@sharpee/if-domain': path.resolve(__dirname, '../../if-domain/src/index.ts'),
      '@sharpee/world-model': path.resolve(__dirname, '../../world-model/src/index.ts'),
      '@sharpee/plugins': path.resolve(__dirname, '../../plugins/src/index.ts'),
    }
  }
})
