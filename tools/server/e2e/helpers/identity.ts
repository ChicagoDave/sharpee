/**
 * Identity helpers for e2e tests.
 *
 * Public interface:
 *   - {@link randomHandle} — generates a unique alpha-only handle (3–12 chars).
 *   - {@link registerIdentity} — POSTs /api/identities and returns the triple.
 *   - {@link seedIdentity} — injects a stored identity into localStorage via
 *     `page.addInitScript` so the Landing page renders with the Create button
 *     already enabled.
 *
 * Bounded context: tools/server/e2e — autonomous tooling scope. Mirrors the
 * client `StoredIdentity` shape (`identity-store.ts`) and the server's
 * `/api/identities` contract (ADR-161).
 */

import type { Page, APIRequestContext } from '@playwright/test';

/** Mirror of `client/src/identity/identity-store.ts#StoredIdentity`. */
export interface StoredIdentity {
  id: string;
  handle: string;
  passcode: string;
}

/**
 * Build a random alpha-only handle. Server constraints: 3–12 chars, letters
 * only (no digits, underscores, hyphens, spaces). 8 chars gives ~10^11 of
 * collision space — enough that test runs in the same DB don't collide.
 */
export function randomHandle(): string {
  const ALPHA = 'abcdefghijklmnopqrstuvwxyz';
  let s = '';
  for (let i = 0; i < 8; i++) {
    s += ALPHA[Math.floor(Math.random() * ALPHA.length)];
  }
  return s;
}

/**
 * Create a new server-side identity by POSTing /api/identities. Returns the
 * `(id, handle, passcode)` triple — the plaintext passcode is only ever
 * surfaced once per ADR-161, so callers must capture it here.
 *
 * @param request  Playwright APIRequestContext (`page.request` or
 *                 `playwright.request.newContext()`)
 * @param handle   optional pre-chosen handle; defaults to `randomHandle()`.
 *                 Must be 3–12 alpha chars.
 * @throws if the response status is not 201
 */
export async function registerIdentity(
  request: APIRequestContext,
  handle: string = randomHandle(),
): Promise<StoredIdentity> {
  const res = await request.post('/api/identities', {
    data: { handle },
  });
  if (res.status() !== 201) {
    const body = await res.text();
    throw new Error(
      `registerIdentity: expected 201, got ${res.status()} — ${body}`,
    );
  }
  const json = (await res.json()) as StoredIdentity;
  if (!json.id || !json.handle || !json.passcode) {
    throw new Error(
      `registerIdentity: response missing fields — ${JSON.stringify(json)}`,
    );
  }
  return json;
}

/**
 * Seed `sharpee:identity` into the page's localStorage before any navigation.
 * Must be called before the first `page.goto()` — `addInitScript` runs on
 * every navigation, including reloads, so a single call covers the whole
 * test (including Phase 3's `page.reload()` round-trip).
 */
export async function seedIdentity(
  page: Page,
  identity: StoredIdentity,
): Promise<void> {
  await page.addInitScript((stored) => {
    window.localStorage.setItem('sharpee:identity', JSON.stringify(stored));
  }, identity);
}
