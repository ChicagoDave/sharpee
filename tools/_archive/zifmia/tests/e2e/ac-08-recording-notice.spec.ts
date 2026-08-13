/**
 * AC-8 — recording notice persistence.
 *
 * ADR-177 §AC-8: "`GET /api/rooms/:id/state` carries the operator's
 * configured notice; the client renders it on first join. Closing /
 * reopening the room shows the indicator unchanged."
 *
 * REAL-PATH: spawned server with a known notice; real browser
 * navigation; assertion on the actual DOM the production bundle
 * renders.
 */

import { test, expect } from '@playwright/test';
import { spawnZifmiaServer, type ZifmiaProcess } from './helpers/server';
import { claimIdentity, createRoom, getJSON } from './helpers/api';

const NOTICE = 'All commands are recorded for moderation — E2E build';

let server: ZifmiaProcess;

test.beforeAll(async () => {
  server = await spawnZifmiaServer({ recordingNotice: NOTICE });
});

test.afterAll(async () => {
  await server.stop();
});

test('AC-8: GET /state carries the configured notice', async () => {
  await claimIdentity(server.baseURL, 'aaron');
  const { room } = await createRoom(server.baseURL, 'aaron', 'dungeo', 'Recording Room');

  const state = await getJSON<{ room: { recording_notice: string } }>(
    server.baseURL,
    `/api/rooms/${room.id}/state?handle=aaron`
  );
  expect(state.room.recording_notice).toBe(NOTICE);
});

test('AC-8: the web client renders the recording indicator on first join and after reload', async ({
  page,
  context
}) => {
  const identity = await claimIdentity(server.baseURL, 'bella');
  const { room } = await createRoom(server.baseURL, 'bella', 'dungeo', 'Indicator Room');

  // Seed the identity into localStorage before the SPA boots — same
  // shape the production identity-storage module writes.
  await context.addInitScript(
    ([key, value]) => {
      window.localStorage.setItem(key, value);
    },
    ['sharpee:identity', JSON.stringify({ id: identity.id, handle: identity.handle })] as const
  );

  page.on('pageerror', (err) => {
    // eslint-disable-next-line no-console
    console.error('[page error]', err.message);
  });

  await page.goto(`${server.baseURL}/#/room/${room.id}`);

  const indicator = page.locator('.sharpee-window-rec-indicator');
  await expect(indicator).toBeVisible();
  await expect(indicator).toContainText(NOTICE);
  await expect(indicator).not.toHaveClass(/sharpee-window-rec-indicator-hidden/);

  // AC-8 also says "Closing/reopening the room shows the indicator
  // unchanged." Reload the page; the indicator must reappear with the
  // same notice text.
  await page.reload();
  await expect(indicator).toBeVisible();
  await expect(indicator).toContainText(NOTICE);
});
