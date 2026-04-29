/**
 * Playwright config for the sharpee multi-user web client e2e suite.
 *
 * Public interface: default export consumed by `playwright test`.
 *
 * Targets:
 *   - default (PLAYWRIGHT_TARGET unset or "local"): http://localhost:8080
 *     — expects docker container `server-server-1` running with CAPTCHA_BYPASS=1
 *   - PLAYWRIGHT_TARGET=live: https://sharpee.net/play/dungeo/
 *     — only @smoke-tagged tests run; keep that subset read-mostly so we never
 *       create real rooms in production
 *
 * Bounded context: tools/server/e2e — autonomous tooling scope.
 */

import { defineConfig, devices } from '@playwright/test';

const target = process.env.PLAYWRIGHT_TARGET ?? 'local';

const baseURL =
  target === 'live'
    ? 'https://sharpee.net/play/dungeo/'
    : 'http://localhost:8080';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  grep: target === 'live' ? /@smoke/ : undefined,
  use: {
    baseURL,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
