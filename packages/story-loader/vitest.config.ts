import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import { workspaceAliases } from '../../vitest.shared';

export default defineConfig({
  resolve: { alias: workspaceAliases() },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    env: {
      // The test stories the opening block's real-path test compiles (five
      // rooms at most, written to be tested). Declared here so the test
      // never walks up from its own file.
      SHARPEE_TEST_STORIES: resolve(__dirname, '../../test-stories'),
    },
  },
});
