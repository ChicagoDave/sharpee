/**
 * vitest.config.ts — the testing play surface's unit-test setup.
 *
 * Purpose: the segment/naming model in `model.ts` is pure, so it is tested
 *   here rather than through the app; the DOM layer and the Swift bridges are
 *   covered by the IDE's real-path XCTest suite instead.
 * Owner context: tools/ide — the testing play surface's web bundle.
 */

import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // The synthesis module's extractor, from source — the same file
    // build.mjs bundles and tsconfig.json checks (ADR-306 D2 / rule 8b).
    alias: {
      '@sharpee/branch-tester/auto-assertion': resolve(
        __dirname,
        '../../../../packages/branch-tester/src/auto-assertion.ts',
      ),
      '@sharpee/branch-tester/types': resolve(
        __dirname,
        '../../../../packages/branch-tester/src/types.ts',
      ),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
