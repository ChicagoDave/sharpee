/**
 * @module tests/e2e/ac-3-reconnect
 * @purpose AC-3 (ADR-175): the WebSocket reconnect path is idempotent.
 *   After Alice's WS is forcibly closed and reopens, her prose-pane
 *   matches Bob's (no duplicate transcript rows) and her presence
 *   list does not double-list anyone.
 * @owner Zifmia E2E tests.
 */

import { expect, test } from '@playwright/test';

import {
  closeLatestWebSocket,
  createRoom,
  openRoom,
  registerUser,
  seedSessionAndInstrument,
  uniqueHandle
} from './helpers';

test.describe('AC-3 — WebSocket reconnect is idempotent', () => {
  test("Alice's WS drop → reconnect → prose pane matches Bob, no dupes", async ({
    browser,
    baseURL
  }) => {
    const baseUrl = baseURL!;
    const alice = await registerUser(baseUrl, uniqueHandle('alice'));
    const bob = await registerUser(baseUrl, uniqueHandle('bob'));
    const roomId = await createRoom(baseUrl, alice, 'AC-3 room');

    const aliceCtx = await browser.newContext();
    const bobCtx = await browser.newContext();
    const alicePage = await aliceCtx.newPage();
    const bobPage = await bobCtx.newPage();

    await seedSessionAndInstrument(alicePage, alice);
    await seedSessionAndInstrument(bobPage, bob);

    await openRoom(alicePage, baseUrl, roomId);
    await openRoom(bobPage, baseUrl, roomId);

    // Wait for Alice to see Bob in her roster before disrupting —
    // otherwise the drop fires before the initial subscribe has
    // round-tripped.
    await expect(
      alicePage.locator(`.sharpee-presence-item[data-identity-id="${bob.id}"]`)
    ).toBeVisible();

    // Land one turn before the drop so the transcript has something
    // to compare against post-reconnect.
    const aliceInput = alicePage.locator('input.sharpee-input-field');
    await aliceInput.fill('look');
    await aliceInput.press('Enter');
    await expect(
      alicePage.locator('.sharpee-prose-pane .main-entry').first()
    ).toBeVisible();
    const aliceEntriesBefore = await alicePage
      .locator('.sharpee-prose-pane .main-entry')
      .count();

    // Forcibly close Alice's WebSocket. The WsClient's reconnect
    // schedule starts at 500 ms; with `{ scheduler }` defaulting to
    // setTimeout, the new socket fires shortly after.
    const closed = await closeLatestWebSocket(alicePage);
    expect(closed).toBe(true);

    // Drive a SECOND turn from Bob while Alice is presumed-offline.
    // After Alice's WsClient reopens it will fetch state + replay the
    // transcript; the new entry should appear without duplicating the
    // first.
    const bobInput = bobPage.locator('input.sharpee-input-field');
    await bobInput.fill('look');
    await bobInput.press('Enter');
    await expect(
      bobPage
        .locator('.sharpee-prose-pane .main-entry')
        .nth(aliceEntriesBefore)
    ).toBeVisible();

    // After reconnect + state refresh, Alice's pane should match Bob's
    // count exactly. The Phase 6e RoomManager.refresh clears the pane
    // before re-replay, so the original entries are not duplicated.
    await expect
      .poll(
        async () =>
          await alicePage.locator('.sharpee-prose-pane .main-entry').count(),
        { timeout: 15_000 }
      )
      .toBe(
        await bobPage.locator('.sharpee-prose-pane .main-entry').count()
      );

    // Presence: Alice's WS resubscribed; the server resends the
    // roster. The list should still contain exactly one entry per
    // identity, not duplicated.
    const aliceBobRows = await alicePage
      .locator(`.sharpee-presence-item[data-identity-id="${bob.id}"]`)
      .count();
    expect(aliceBobRows).toBe(1);
    const aliceSelfRows = await alicePage
      .locator(
        `.sharpee-presence-item[data-identity-id="${alice.id}"]`
      )
      .count();
    expect(aliceSelfRows).toBe(1);

    await aliceCtx.close();
    await bobCtx.close();
  });
});
