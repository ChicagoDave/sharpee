/**
 * Health-endpoint smoke check.
 *
 * Public interface: one Playwright test file consumed by `playwright test`.
 *
 * Trivial Phase-1 test: the server's /health endpoint responds 200. Proves the
 * Playwright pipeline can reach the configured target. Tagged @smoke so the
 * same test runs against the live URL when PLAYWRIGHT_TARGET=live (path is
 * relative, so it joins onto the /play/dungeo/ baseURL correctly).
 *
 * Bounded context: tools/server/e2e.
 */

import { test, expect } from '@playwright/test';

test('health endpoint returns 200 @smoke', async ({ request }) => {
  const response = await request.get('health');
  expect(response.status()).toBe(200);
});
