/**
 * Room-lifecycle helpers for e2e tests.
 *
 * Public interface:
 *   - {@link createRoom} — drives the Create Room modal from the landing page
 *     and returns the resulting `room_id`.
 *   - {@link waitForRoomReady} — waits for the Transcript to render its first
 *     turn entry (the opening room description from the sandbox).
 *
 * Bounded context: tools/server/e2e — autonomous tooling scope. Selectors
 * use existing `aria-label` attributes on production components — no
 * `data-testid` modifications needed for Phase 2.
 */

import { expect, type Page } from '@playwright/test';

export interface CreatedRoom {
  /** The room_id returned by POST /api/rooms (also the URL segment). */
  roomId: string;
}

/**
 * Drive the Landing page's Create Room modal end-to-end and return the new
 * room id. Assumes:
 *   - identity has been seeded into localStorage (so the Create button is
 *     enabled);
 *   - the page is already at `/` or about to be navigated there;
 *   - the server is running with `provider: 'none'` captcha (the
 *     `CaptchaWidget` auto-emits a `'bypass'` token in that mode).
 *
 * @param page   Playwright Page (caller has already done `page.goto('/')`)
 * @param title  optional room title; defaults to a unique e2e-prefixed name
 * @param storySlug  optional story slug; defaults to the first option in the
 *                   modal's select (matching the plan's "pick first story").
 *                   Pass an explicit slug to harden against multiple stories
 *                   being configured.
 */
export async function createRoom(
  page: Page,
  opts: { title?: string; storySlug?: string } = {},
): Promise<CreatedRoom> {
  const title =
    opts.title ?? `e2e ${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  // The Create button on the landing page header carries
  // `aria-label="Create a new room"` when identity is present.
  await page.getByRole('button', { name: 'Create a new room' }).click();

  const modal = page.getByRole('dialog');
  await expect(modal).toBeVisible();

  await modal.getByLabel('Title').fill(title);

  // Always pick a story explicitly. CreateRoomModal initializes `storySlug`
  // via `useState(stories[0]?.slug ?? '')` on its first render, but its hooks
  // run inside Landing while `state.status === 'loading'` — so the initial
  // value is the empty string and a "Pick a story" validation error fires
  // unless the user (or test) reselects.
  const storyDropdown = modal.getByLabel('Story');
  if (opts.storySlug) {
    await storyDropdown.selectOption(opts.storySlug);
  } else {
    // Pick whatever the first non-disabled option is.
    await storyDropdown.selectOption({ index: 1 });
  }

  // Submit and wait for the room URL.
  const submitPromise = page.waitForURL(/\/room\/[^/]+$/, { timeout: 15_000 });
  await modal.getByRole('button', { name: 'Create room' }).click();
  await submitPromise;

  const match = /\/room\/([^/]+)$/.exec(page.url());
  if (!match) throw new Error(`createRoom: unexpected URL after submit: ${page.url()}`);
  return { roomId: match[1]! };
}

/**
 * Wait until the Transcript has rendered at least one non-prompt turn entry.
 * The Deno sandbox boots and emits the first `narrative` event with the
 * opening room description; this typically lands within a few seconds of
 * the WS `welcome` frame.
 *
 * Uses a generous timeout so a cold container start (Deno's first-load
 * cache miss) doesn't flake the test.
 */
export async function waitForRoomReady(page: Page): Promise<void> {
  const transcript = page.getByLabel('Transcript');
  // Each turn is rendered as <article aria-label="Turn N">. Wait for ≥1 to exist.
  await expect(transcript.locator('article').first()).toBeVisible({
    timeout: 30_000,
  });
}
