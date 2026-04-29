/**
 * Room-lifecycle smoke test (Phase 2 of the e2e plan).
 *
 * Public interface: one Playwright test consumed by `playwright test`.
 *
 * Exercises the full happy path from landing → identity → create room →
 * IF command → status line. Tagged @smoke so the same flow runs against
 * the live URL when `PLAYWRIGHT_TARGET=live` IF the live server has
 * `CAPTCHA_BYPASS=1` (it does not — keep this test local-only by leaving
 * @smoke off the room-creation flow). The plan's Phase 2 deliverable
 * specifies @smoke, but creating real rooms in production would litter
 * the live DB. Per the README: "@smoke is intentionally read-mostly."
 *
 * Bounded context: tools/server/e2e.
 */

import { expect, test } from '@playwright/test';
import { registerIdentity, seedIdentity } from '../helpers/identity';
import { createRoom, waitForRoomReady } from '../helpers/room';

test.describe('Room lifecycle', () => {
  test('create room, run command, observe status line', async ({ page, request }) => {
    // 1. Register identity server-side and seed it into localStorage before
    //    any page navigation. The seed must precede goto so the Landing
    //    page's first render sees the identity and enables Create Room.
    const identity = await registerIdentity(request);
    await seedIdentity(page, identity);

    // 2. Navigate to landing.
    await page.goto('/');

    // 3. The Create Room button is enabled when identity is present
    //    (aria-label switches from "Set up your identity first" to
    //    "Create a new room"). Asserting on the enabled label proves
    //    identity seeding worked end-to-end.
    await expect(
      page.getByRole('button', { name: 'Create a new room' }),
    ).toBeEnabled();

    // 4. Drive the Create Room modal — first story option is fine
    //    (only `dungeo` is configured).
    const { roomId } = await createRoom(page);
    expect(roomId).toMatch(/^[A-Za-z0-9_-]+$/);

    // 5. Wait for the sandbox to boot and emit the opening narrative.
    await waitForRoomReady(page);

    // 6. Type a known-safe IF command (`look`) and submit.
    const commandInput = page.getByLabel('Command', { exact: true });
    await expect(commandInput).toBeVisible();
    await commandInput.fill('look');
    await commandInput.press('Enter');

    // 7. After the command, a command-echo entry plus a fresh narrative
    //    entry should appear in the Transcript. Wait for the count to grow.
    const transcript = page.getByLabel('Transcript');
    await expect
      .poll(async () => await transcript.locator('article').count(), {
        timeout: 15_000,
      })
      .toBeGreaterThanOrEqual(2);

    // 8. The StatusLine should render Score: N | Turns: M with numeric values
    //    once the world mirror has hydrated.
    const statusLine = page.getByRole('status', { name: 'Game status' });
    await expect(statusLine).toBeVisible();
    await expect.poll(async () => (await statusLine.textContent()) ?? '', {
      timeout: 15_000,
    }).toMatch(/Score:\s*\d+\s*\|\s*Turns:\s*\d+/);
  });
});
