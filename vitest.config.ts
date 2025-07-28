import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/*/tests/**/*.test.ts', 'stories/*/tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.test.ts.removed', '**/*.test.ts.template'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'lcov', 'json'],
      include: ['packages/*/src/**/*.ts'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.d.ts',
        '**/index.ts',
        '**/__tests__/**',
        '**/*.test.ts',
        '**/.archived/**'
      ]
    },
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 2,
        minThreads: 1
      }
    }
  },
  resolve: {
    alias: {
      '@sharpee/core': resolve(__dirname, './packages/core/src'),
      '@sharpee/world-model': resolve(__dirname, './packages/world-model/src'),
      '@sharpee/if-domain': resolve(__dirname, './packages/if-domain/src'),
      '@sharpee/stdlib': resolve(__dirname, './packages/stdlib/src'),
      '@sharpee/engine': resolve(__dirname, './packages/engine/src'),
      '@sharpee/event-processor': resolve(__dirname, './packages/event-processor/src'),
      '@sharpee/lang-en-us': resolve(__dirname, './packages/lang-en-us/src'),
      '@sharpee/parser-en-us': resolve(__dirname, './packages/parser-en-us/src'),
      '@sharpee/if-services': resolve(__dirname, './packages/if-services/src')
    }
  }
})
