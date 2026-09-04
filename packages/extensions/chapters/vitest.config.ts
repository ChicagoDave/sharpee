import { defineConfig } from 'vitest/config'
import { workspaceAliases } from '../../../vitest.shared'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
  resolve: { alias: workspaceAliases() },
})
