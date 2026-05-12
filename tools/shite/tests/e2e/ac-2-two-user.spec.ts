/**
 * @module tests/e2e/ac-2-two-user
 * @purpose AC-2 (ADR-175): two users in the same room see each other's
 *   presence, chat, and narrative in real time. Drives a real Chromium
 *   against a real Fastify + SQLite + the built web bundle. No mocks.
 * @owner Zifmia E2E tests.
 *
 * Integration Reality Statement:
 *  - OWNED: Zifmia server (Node, in-process via webServer config),
 *    SQLite (tmpdir file), web bundle (vite-built), Playwright
 *    Chromium driver.
 *  - EXTERNAL: none.
 *  - REAL-PATH: this test exercises the full HTTP + WS + DOM stack.
 *  - STUB JUSTIFICATION: none — the phase is the integration.
 */

import { expect, test } from '@playwright/test';

import {
  createRoom,
  openRoom,
  registerUser,
  seedSessionAndInstrument,
  uniqueHandle
} from './helpers';

test.describe('AC-2 — two-user end-to-end', () => {
  test('alice and bob see each other in presence, chat, and narrative', async ({
    browser,
    baseURL
  }) => {
    const baseUrl = baseURL!;

    // Register two identities via the public HTTP surface.
    const alice = await registerUser(baseUrl, uniqueHandle('alice'));
    const bob = await registerUser(baseUrl, uniqueHandle('bob'));

    // Alice creates a room pinned to the fixture story.
    const roomId = await createRoom(baseUrl, alice, 'AC-2 room');

    // Two independent contexts → two separate localStorage scopes →
    // two distinct sessions. Each opens its own Page.
    const aliceCtx = await browser.newContext();
    const bobCtx = await browser.newContext();
    const alicePage = await aliceCtx.newPage();
    const bobPage = await bobCtx.newPage();

    await seedSessionAndInstrument(alicePage, alice);
    await seedSessionAndInstrument(bobPage, bob);

    await openRoom(alicePage, baseUrl, roomId);
    await openRoom(bobPage, baseUrl, roomId);

    // ── Presence ─────────────────────────────────────────────────
    // Each side renders an `.sharpee-presence-item[data-identity-id]`
    // per identity in the room. Alice should see Bob; Bob should see
    // Alice (in addition to themselves).
    await expect(
      alicePage.locator(`.sharpee-presence-item[data-identity-id="${bob.id}"]`)
    ).toBeVisible();
    await expect(
      bobPage.locator(`.sharpee-presence-item[data-identity-id="${alice.id}"]`)
    ).toBeVisible();
    // Self row carries the ADR-176 `--self` modifier.
    await expect(
      alicePage.locator(
        `.sharpee-presence-item[data-identity-id="${alice.id}"]`
      )
    ).toHaveClass(/sharpee-presence-item--self/);

    // ── Chat ─────────────────────────────────────────────────────
    // Alice types a chat message; both clients should see the
    // server-echoed row land in their `.sharpee-chat-history`.
    const aliceChatInput = alicePage.locator('input.sharpee-chat-input');
    await aliceChatInput.fill('hello bob');
    await aliceChatInput.press('Enter');

    await expect(
      bobPage.locator('.sharpee-chat-message-text', { hasText: 'hello bob' })
    ).toBeVisible();
    await expect(
      alicePage.locator('.sharpee-chat-message-text', { hasText: 'hello bob' })
    ).toBeVisible();
    // Sender's own row gets the `--self` modifier on Alice's side
    // (and NOT on Bob's side).
    await expect(
      alicePage.locator('.sharpee-chat-message--self', { hasText: 'hello bob' })
    ).toBeVisible();
    await expect(
      bobPage.locator('.sharpee-chat-message--self', { hasText: 'hello bob' })
    ).toHaveCount(0);

    // ── Narrative ────────────────────────────────────────────────
    // Alice submits a command. The server runs the turn, returns the
    // TurnPacket as Alice's HTTP response, AND broadcasts to Bob via
    // WS `turn:broadcast`. Both prose panes should grow.
    const aliceCommandInput = alicePage.locator('input.sharpee-input-field');
    await aliceCommandInput.fill('look');
    await aliceCommandInput.press('Enter');

    // The fixture story's "look" emits at least one main-channel entry.
    // The platform-browser main renderer appends `<p class="main-entry">`.
    await expect(
      alicePage.locator('.sharpee-prose-pane .main-entry').first()
    ).toBeVisible();
    await expect(
      bobPage.locator('.sharpee-prose-pane .main-entry').first()
    ).toBeVisible();

    // Identical entry count on both panes — narrative is canonical.
    const aliceEntries = await alicePage
      .locator('.sharpee-prose-pane .main-entry')
      .count();
    const bobEntries = await bobPage
      .locator('.sharpee-prose-pane .main-entry')
      .count();
    expect(bobEntries).toBe(aliceEntries);

    await aliceCtx.close();
    await bobCtx.close();
  });
});
