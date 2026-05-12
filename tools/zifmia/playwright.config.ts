/**
 * Playwright config for the Zifmia E2E suite (Phase 6g).
 *
 * Tests run against a real Fastify server + real SQLite + the built
 * web bundle. The `webServer` block boots `tests/e2e/start-test-server.ts`
 * which installs a fixture story before Playwright begins; tests
 * register their own users and create rooms via the public HTTP surface.
 *
 * Run: `pnpm test:e2e` (after `pnpm build:web`).
 */

import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.ZIFMIA_E2E_PORT ?? 13771);
const HOST = process.env.ZIFMIA_E2E_HOST ?? '127.0.0.1';
const BASE_URL = `http://${HOST}:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  timeout: 30_000,
  expect: {
    // AC-10 calls for sub-second lock UI transitions; bump the default
    // expect timeout up so we have headroom for the per-assertion
    // `.toBeVisible({ timeout: 200 })` calls used inline.
    timeout: 5_000
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: BASE_URL,
    headless: true,
    trace: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: {
    command: 'pnpm exec tsx tests/e2e/start-test-server.ts',
    url: `${BASE_URL}/health`,
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 30_000,
    env: {
      ZIFMIA_E2E_PORT: String(PORT),
      ZIFMIA_E2E_HOST: HOST
    }
  }
});
