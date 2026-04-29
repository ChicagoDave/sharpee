/**
 * Save / Restore round-trip test (Phase 3 of the e2e plan).
 *
 * Public interface: one Playwright test consumed by `playwright test`.
 *
 * The regression catcher for commit `bf9b9564`:
 *   1. seed identity, create room, wait for room ready
 *   2. advance state with 2 commands; capture preSave
 *   3. open Save panel, click Save game, wait for the row to appear
 *   4. close panel; advance state further; confirm postSave differs from preSave
 *   5. open Save panel, click Restore on the row, confirm in dialog
 *   6. wait for the Restored marker to appear in the Transcript
 *   7. capture restored — must match preSave (turns + score)
 *   8. page.reload() — exercises Room.tsx mount-path storage restoration
 *   9. wait for room ready; capture afterReload — must still match preSave
 *
 * Bounded context: tools/server/e2e. Local-only (room creation mutates DB —
 * never @smoke against live).
 */

import { expect, test } from '@playwright/test';
import { registerIdentity, seedIdentity } from '../helpers/identity';
import { createRoom, waitForRoomReady } from '../helpers/room';
import { readStatusLine } from '../helpers/statusline';

test.describe('Save / Restore round-trip', () => {
  test('preserves world state across restore + hard reload', async ({ page, request }) => {
    test.setTimeout(120_000); // 6 commands + 2 panel cycles + reload — give it room

    const identity = await registerIdentity(request);
    await seedIdentity(page, identity);
    await page.goto('/');
    await createRoom(page);
    await waitForRoomReady(page);

    // Advance state by moving the player. Location is the cleanest
    // restorable surface: the engine's spatial state IS reset by
    // `world.loadJSON()` at restore time. We deliberately avoid asserting
    // on `turns` post-restore because the sandbox owns its own monotonic
    // `turnCount` and `RESTORE` re-mirrors the live count into the
    // restored world (see deno-entry.ts:356 and prior session ADR-162
    // notes — sandbox counter is not part of the saved blob).
    //
    // Each command's WS round-trip is async; rapid-fire `fill` calls can
    // race with the input's lock-on-typing state machine, so wait for
    // the StatusLine's turn counter to bump after each press as a
    // synchronization signal.
    const commandInput = page.getByLabel('Command', { exact: true });
    const transcript = page.getByLabel('Transcript');

    async function runCommand(text: string): Promise<void> {
      const before = (await readStatusLine(page)).turns;
      await commandInput.fill(text);
      await commandInput.press('Enter');
      await expect
        .poll(async () => (await readStatusLine(page)).turns, { timeout: 10_000 })
        .toBeGreaterThan(before);
    }

    // Initial location is West of House. Move north → North of House.
    const initialStatus = await readStatusLine(page);
    expect(initialStatus.location.toLowerCase()).toContain('west of house');

    await runCommand('north');

    const preSave = await readStatusLine(page);
    expect(preSave.location.toLowerCase()).toContain('north of house');

    // 1. Open Save panel and save.
    await page.getByRole('button', { name: 'Open saves' }).click();
    const savesDialog = page.getByRole('dialog', { name: 'Saves' });
    await expect(savesDialog).toBeVisible();

    await savesDialog.getByRole('button', { name: 'Save game' }).click();

    // The save round-trips through the WS; the SaveList replaces the
    // "No saves yet." placeholder with a <ul aria-label="Saves"> once
    // the server pushes the new RoomSnapshot.saves[].
    const savesList = savesDialog.getByRole('list', { name: 'Saves' });
    await expect(savesList).toBeVisible({ timeout: 10_000 });
    await expect(savesList.locator('li')).toHaveCount(1);

    // Close the Save panel.
    await page.keyboard.press('Escape');
    await expect(savesDialog).toBeHidden();

    // 2. Advance state past the save point — move further north so the
    //    location is observably different from the saved one.
    await runCommand('north');

    const postSave = await readStatusLine(page);
    expect(postSave.location).not.toBe(preSave.location);

    // 3. Re-open Save panel and click Restore on the (only) row.
    await page.getByRole('button', { name: 'Open saves' }).click();
    await expect(savesDialog).toBeVisible();
    const restoreRow = savesDialog.getByRole('button', {
      name: /^Restore save /,
    });
    await expect(restoreRow).toBeVisible();
    await restoreRow.click();

    // RestoreConfirmDialog opens on top of the Save panel.
    await page.getByRole('button', { name: 'Confirm restore' }).click();

    // 4. The restore narrative should add a `<article aria-label="Restored ...">`
    // entry to the Transcript. Wait for it.
    await expect(transcript.locator('article[data-restored="true"]'))
      .toBeVisible({ timeout: 15_000 });

    // 5. Capture restored state — must match preSave on location and score.
    //    Poll on location rolling back from postSave to preSave so we
    //    don't capture the transitional value.
    await expect
      .poll(async () => (await readStatusLine(page)).location, { timeout: 10_000 })
      .toBe(preSave.location);
    const restored = await readStatusLine(page);
    expect(restored.score).toBe(preSave.score);

    // 6. Hard reload — exercises Room.tsx mount-path restoration via
    //    readToken/readCode. The seedIdentity addInitScript runs again
    //    on the new navigation, so identity stays present.
    await page.reload();
    await waitForRoomReady(page);

    // Poll on the post-reload location — the world mirror hydrates
    // asynchronously after the WS welcome.
    await expect
      .poll(async () => (await readStatusLine(page)).location, { timeout: 15_000 })
      .toBe(preSave.location);
    const afterReload = await readStatusLine(page);
    expect(afterReload.score).toBe(preSave.score);
  });
});
