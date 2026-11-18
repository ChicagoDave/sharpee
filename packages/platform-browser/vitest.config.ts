import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import { workspaceAliases } from '../../vitest.shared';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    env: {
      // The test stories the opening's real-path test compiles (five rooms at
      // most, written to be tested), and the recording it compares against.
      // Declared here so the test never walks up from its own file: outside
      // the repository neither is configured and the test skips.
      SHARPEE_TEST_STORIES: resolve(__dirname, '../../test-stories'),
      SHARPEE_OPENING_BASELINE: resolve(__dirname, '../../docs/work/opening-routine/baseline'),
    },
  },
  resolve: { alias: workspaceAliases() },
});
