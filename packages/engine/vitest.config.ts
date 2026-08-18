import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import { workspaceAliases } from '../../vitest.shared'

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
  resolve: { alias: workspaceAliases() },
})