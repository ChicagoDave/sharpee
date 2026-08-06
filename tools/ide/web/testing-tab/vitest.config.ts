/**
 * vitest.config.ts — the Testing tab's unit-test setup.
 *
 * Purpose: the fold in `model.ts` is pure, so it is tested here rather than
 *   through the app. The alias must stay in step with `build.mjs` and
 *   `tsconfig.json`: all three point at the wire's SOURCE, so what the tests
 *   check, what the type-checker checks, and what the bundle carries are one file.
 * Owner context: tools/ide — the Testing tab's web bundle.
 */

import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@sharpee/ide-protocol/run-events': resolve(
        __dirname,
        '../../../../packages/ide-protocol/src/run-events.ts',
      ),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
