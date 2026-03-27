import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**']
  },
  resolve: {
    alias: {
      '@sharpee/core': resolve(__dirname, '../../packages/core/src'),
      '@sharpee/if-domain': resolve(__dirname, '../../packages/if-domain/src'),
      '@sharpee/world-model': resolve(__dirname, '../../packages/world-model/src'),
      '@sharpee/stdlib': resolve(__dirname, '../../packages/stdlib/src'),
      '@sharpee/event-processor': resolve(__dirname, '../../packages/event-processor/src'),
      '@sharpee/engine': resolve(__dirname, '../../packages/engine/src'),
      '@sharpee/lang-en-us': resolve(__dirname, '../../packages/lang-en-us/src'),
      '@sharpee/parser-en-us': resolve(__dirname, '../../packages/parser-en-us/src'),
      '@sharpee/plugin-scheduler': resolve(__dirname, '../../packages/plugin-scheduler/src')
    }
  }
})
