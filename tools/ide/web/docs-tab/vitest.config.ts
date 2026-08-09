/**
 * vitest.config.ts — the Documentation tab's unit-test setup.
 *
 * Purpose: the markdown renderer and the MDX reducer are pure, and they are the
 *   two places this tab can go wrong quietly — a mis-rendered construct does not
 *   crash, it just shows the author something the website does not. So they are
 *   tested here rather than through the app.
 *
 *   Run with: `npx vitest run --root tools/ide/web/docs-tab`
 * Owner context: tools/ide — the Documentation tab's web bundle.
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.mjs'],
    environment: 'node',
  },
});
