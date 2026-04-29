/**
 * WebSocket reconnect resilience test (Phase 4 of the e2e plan).
 *
 * Public interface: one Playwright test consumed by `playwright test`.
 *
 * Exercises the heartbeat keepalive + reconnect path landed in commit
 * `f87547ee`:
 *   1. seed identity, create room, wait for room ready
 *   2. capture a preCut StatusLine baseline
 *   3. force the page offline → browser severs the WebSocket
 *   4. force the page back online → `useWebSocket` reconnects via its
 *      exponential backoff (250 ms → 10 s cap)
 *   5. assert that issuing a command after reconnect produces a fresh
 *      Transcript turn (proves the round-trip is functional again)
 *   6. assert the StatusLine still parses (state survived the blip)
 *
 * Tagged @reconnect — not @smoke. Network emulation is invasive enough
 * that running it against the live URL would be inappropriate.
 *
 * Bounded context: tools/server/e2e.
 */

import { expect, test } from '@playwright/test';
import { registerIdentity, seedIdentity } from '../helpers/identity';
import { createRoom, waitForRoomReady } from '../helpers/room';
import { readStatusLine } from '../helpers/statusline';

test.describe('WS reconnect resilience @reconnect', () => {
  test('survives an offline/online blip and accepts new commands', async ({
    page,
    request,
    context,
  }) => {
    test.setTimeout(60_000);

    const identity = await registerIdentity(request);
    await seedIdentity(page, identity);
    await page.goto('/');
    await createRoom(page);
    await waitForRoomReady(page);

    const transcript = page.getByLabel('Transcript');
    const commandInput = page.getByLabel('Command', { exact: true });

    // Bump the turn counter once so the snapshot has something
    // observable to survive the blip.
    const initialTurns = (await readStatusLine(page)).turns;
    await commandInput.fill('look');
    await commandInput.press('Enter');
    await expect
      .poll(async () => (await readStatusLine(page)).turns, { timeout: 10_000 })
      .toBeGreaterThan(initialTurns);

    const preCut = await readStatusLine(page);

    // Sever the connection. `setOffline(true)` closes all open sockets
    // in the BrowserContext; the client's useWebSocket hook sees a
    // non-normal close and starts the reconnect backoff (which also
    // fires immediately on the first attempt).
    await context.setOffline(true);

    // Brief wait to let the close land before we restore connectivity.
    // 1.5 s is more than enough for the WS event loop to surface the
    // close in the React state, but well below the heartbeat reaper
    // window so the test stays fast.
    await page.waitForTimeout(1_500);

    await context.setOffline(false);

    // After reconnect, the server sends a fresh `welcome` carrying a
    // snapshot. Issue a command and wait for the turn counter to bump —
    // that proves both halves of the round-trip work post-reconnect.
    const articlesBefore = await transcript.locator('article').count();
    await commandInput.fill('look');
    await commandInput.press('Enter');

    await expect
      .poll(async () => await transcript.locator('article').count(), {
        timeout: 20_000,
      })
      .toBeGreaterThan(articlesBefore);

    const postReconnect = await readStatusLine(page);
    expect(postReconnect.turns).toBeGreaterThan(preCut.turns);
    // Location should not have changed across the blip — the player
    // never moved.
    expect(postReconnect.location).toBe(preCut.location);
  });
});
