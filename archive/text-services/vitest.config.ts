import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**']
  },
  resolve: {
    alias: {
      '@sharpee/core': resolve(__dirname, '../core/src'),
      '@sharpee/if-domain': resolve(__dirname, '../if-domain/src'),
      '@sharpee/if-services': resolve(__dirname, '../if-services/src'),
      '@sharpee/world-model': resolve(__dirname, '../world-model/src')
    }
  }
})