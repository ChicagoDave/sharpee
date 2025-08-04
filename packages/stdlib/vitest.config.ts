import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/tests/**/*.test.ts'],
    exclude: ['**/tests/**/*.test.ts.removed', '**/tests/**/*.test.ts.template'],
    reporters: process.env.CI ? ['default', 'hanging-process'] : ['default'],
    teardownTimeout: 20000, // Increase teardown timeout
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'lcov', 'json'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.d.ts.map',
        'src/**/*.js.map',
        'src/**/__tests__/**',
        'src/**/*.test.ts',
        'src/**/index.ts',
        'src/**/.archived/**'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 85,
          lines: 90,
          statements: 90
        },
        'src/actions/': {
          branches: 85,
          functions: 90,
          lines: 90,
          statements: 90
        },
        'src/parser/': {
          branches: 80,
          functions: 85,
          lines: 85,
          statements: 85
        },
        'src/validation/': {
          branches: 85,
          functions: 90,
          lines: 90,
          statements: 90
        }
      }
    },
    testTimeout: 10000
  },
  resolve: {
    alias: {
      '@sharpee/world-model': path.resolve(__dirname, '../world-model/src/index.ts'),
      '@sharpee/core': path.resolve(__dirname, '../core/src/index.ts'),
      '@sharpee/if-domain': path.resolve(__dirname, '../if-domain/src/index.ts')
    }
  }
})
