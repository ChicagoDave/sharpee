/**
 * Playwright config — theme-engine visual harness (ADR-188).
 *
 * Owner: @sharpee/platform-browser visual QA.
 *
 * Verifies the engine CSS contract (AC-1, AC-7) by loading the REAL
 * `styles/engine.css` + `styles/base.css` against the REAL `.sharpee-*`
 * shell DOM (read from the platform's own browser `index.html`) in real
 * Chromium, then asserting computed styles. No mocks, no stubs — the
 * artifact under test (the engine CSS) is exercised directly (CLAUDE.md
 * rule 13a, REAL-PATH).
 *
 * Fixtures are file:// pages generated at runtime (see fixture.ts), so no
 * server is needed. Specs are `*.spec.ts` — vitest only collects
 * `*.test.ts`, so the two runners never overlap.
 */

import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const VISUAL_DIR = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: VISUAL_DIR,
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  outputDir: `${VISUAL_DIR}/.playwright-output`,
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
