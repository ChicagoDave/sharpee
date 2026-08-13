/**
 * Playwright config for the Phase 8 two-user E2E suite (ADR-177).
 *
 * Owner: zifmia e2e harness.
 *
 * Boot model:
 *   - `global-setup.ts` builds (or assumes built) `dist/main.js` + `dist/web/`,
 *     prepares an ephemeral SQLite + temp stories dir, spawns
 *     `node dist/main.js` on a free port, and exports the base URL.
 *   - Each spec runs against the same long-lived server. Specs that
 *     need an isolated DB/stories pair spawn their own server via the
 *     helper in `helpers/server.ts`.
 *   - `global-teardown.ts` kills the server and removes temp dirs.
 *
 * No mocks, no stubs — REAL-PATH per CLAUDE.md rule 13a.
 */

import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';

const E2E_DIR = __dirname;

export default defineConfig({
  testDir: E2E_DIR,
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  outputDir: resolve(E2E_DIR, '.playwright-output'),
  globalSetup: resolve(E2E_DIR, 'global-setup.ts'),
  globalTeardown: resolve(E2E_DIR, 'global-teardown.ts'),
  use: {
    baseURL: process.env.ZIFMIA_E2E_BASE_URL ?? 'http://127.0.0.1:0',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ]
});
