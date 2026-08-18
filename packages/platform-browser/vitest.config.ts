import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import { workspaceAliases } from '../../vitest.shared';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
  resolve: { alias: workspaceAliases() },
});
