/**
 * @module tests/e2e/ac-10-lock
 * @purpose AC-10 (ADR-175): lock-on-typing UI propagates within
 *   200 ms; lock-on-disconnect releases within 1 s.
 *   When Alice presses her first key in the input bar, Bob should
 *   see `.sharpee-input-bar--locked` and an unhidden
 *   `.sharpee-lock-banner` reading "{handle} is typing…" within
 *   200 ms. When Alice disconnects without submitting, the server's
 *   implicit-release path should clear Bob's lock state within 1 s.
 * @owner Zifmia E2E tests.
 */

import { expect, test } from '@playwright/test';

import {
  createRoom,
  openRoom,
  registerUser,
  seedSessionAndInstrument,
  uniqueHandle
} from './helpers';

test.describe('AC-10 — lock-on-typing', () => {
  test("Alice's first keystroke → Bob locks within 200 ms; disconnect → unlocks within 1 s", async ({
    browser,
    baseURL
  }) => {
    const baseUrl = baseURL!;
    const alice = await registerUser(baseUrl, uniqueHandle('alice'));
    const bob = await registerUser(baseUrl, uniqueHandle('bob'));
    const roomId = await createRoom(baseUrl, alice, 'AC-10 room');

    const aliceCtx = await browser.newContext();
    const bobCtx = await browser.newContext();
    const alicePage = await aliceCtx.newPage();
    const bobPage = await bobCtx.newPage();

    await seedSessionAndInstrument(alicePage, alice);
    await seedSessionAndInstrument(bobPage, bob);

    await openRoom(alicePage, baseUrl, roomId);
    await openRoom(bobPage, baseUrl, roomId);

    // Wait until Bob's WS subscription is established (he sees
    // Alice in his roster) — otherwise the lock broadcast can race
    // ahead of his subscription.
    await expect(
      bobPage.locator(`.sharpee-presence-item[data-identity-id="${alice.id}"]`)
    ).toBeVisible();

    const aliceInput = alicePage.locator('input.sharpee-input-field');
    const bobInput = bobPage.locator('input.sharpee-input-field');
    const bobBanner = bobPage.locator('.sharpee-lock-banner');

    // Pre-state: Bob's input is NOT locked; banner is hidden.
    await expect(bobInput).not.toHaveClass(/sharpee-input-bar/); // input field carries no modifier
    await expect(bobBanner).toHaveClass(/sharpee-lock-banner--hidden/);

    // Alice focuses + presses a key. The CommandInputManager fires
    // `onFirstKey` → LockManager.acquire() → WS `lock:acquire` →
    // server broadcasts `lock:state {holder: alice}`.
    await aliceInput.focus();
    await aliceInput.press('a');

    // Bob's input bar should gain `--locked` within 200 ms. The lock
    // banner unhides and reads Alice's handle.
    await expect(
      bobPage.locator('.sharpee-input-bar.sharpee-input-bar--locked')
    ).toBeVisible({ timeout: 200 });
    await expect(bobBanner).not.toHaveClass(/sharpee-lock-banner--hidden/);
    await expect(bobBanner).toContainText(alice.handle);
    await expect(bobBanner).toContainText('typing');

    // Alice disconnects without submitting. Closing her page tears
    // down the WS; the server detects the close and force-releases
    // the lock. Bob should see the modifier cleared within 1 s.
    await alicePage.close();

    await expect(
      bobPage.locator('.sharpee-input-bar.sharpee-input-bar--locked')
    ).toHaveCount(0, { timeout: 1_000 });
    await expect(bobBanner).toHaveClass(/sharpee-lock-banner--hidden/);

    await aliceCtx.close();
    await bobCtx.close();
  });
});
