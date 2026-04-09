import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'lcov', 'json'],
      include: ['src/**/*.ts'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.d.ts',
        '**/index.ts',
        '**/__tests__/**',
        '**/*.test.ts'
      ]
    }
  },
  resolve: {
    alias: {
      '@sharpee/core': resolve(__dirname, '../core/src'),
      '@sharpee/if-domain': resolve(__dirname, '../if-domain/src'),
      '@sharpee/world-model': resolve(__dirname, '../world-model/src'),
      '@sharpee/stdlib': resolve(__dirname, '../stdlib/src'),
      '@sharpee/event-processor': resolve(__dirname, '../event-processor/src'),
      '@sharpee/lang-en-us': resolve(__dirname, '../lang-en-us/src'),
      '@sharpee/parser-en-us': resolve(__dirname, '../parser-en-us/src'),
      '@sharpee/text-blocks': resolve(__dirname, '../text-blocks/src'),
      '@sharpee/text-service': resolve(__dirname, '../text-service/src'),
      '@sharpee/if-services': resolve(__dirname, '../if-services/src'),
      '@sharpee/plugins': resolve(__dirname, '../plugins/src'),
      '@sharpee/plugin-npc': resolve(__dirname, '../plugin-npc/src'),
      '@sharpee/plugin-scheduler': resolve(__dirname, '../plugin-scheduler/src'),
      '@sharpee/plugin-state-machine': resolve(__dirname, '../plugin-state-machine/src'),
      '@sharpee/character': resolve(__dirname, '../character/src'),
      '@sharpee/ext-testing': resolve(__dirname, '../extensions/testing/src'),
      '@sharpee/ext-basic-combat': resolve(__dirname, '../extensions/basic-combat/src'),
      '@sharpee/media': resolve(__dirname, '../media/src'),
      '@sharpee/helpers': resolve(__dirname, '../helpers/src')
    }
  }
})