/**
 * fork-save.ts — the engine's save, captured in memory and restored on the
 * same game within one run (ADR-307 D5, amended 2026-11-12).
 *
 * Purpose: the one place a branch-tester runner that holds a loaded game
 * takes a fork save and puts it back. The tree walker starts a branch line
 * from the save at its fork card; the derived runner starts every row from
 * the save of the game as booted. Both go through the save fork
 * `@sharpee/transcript-tester` owns (`captureSave` / `restoreSave`), which
 * drives the engine's own save and restore and leaves the engine's hooks as
 * it found them. What this module adds is the harness's side of a restore.
 *
 * Invariants:
 * - A save is only ever restored on the engine it was captured on, in the
 *   run that captured it. Nothing here persists one (ADR-307 D4).
 * - A restore empties the harness's record of the last turn, which would
 *   otherwise describe a turn the restored world never took (ADR-348 D1).
 *
 * Public interface: `captureForkSave`, `restoreForkSave`, and the
 *   `ForkSaveEngine`, `ForkSave`, `LastTurnRecord` types.
 * Owner context: @sharpee/branch-tester — shared by `tree-walker.ts` and
 *   `derived-runner.ts`.
 */

import { captureSave, restoreSave, type SaveForkPlatform } from '@sharpee/transcript-tester';

/** The engine slice a fork save needs — the save fork's own platform. */
export type ForkSaveEngine = SaveForkPlatform;

/** The engine's save data, as `captureSave` returns it. */
export type ForkSave = NonNullable<Awaited<ReturnType<typeof captureSave>>>;

/**
 * Bootstrap's record of the last turn, as it sits on a loaded game. A fork
 * restore replaces the world under these, so they are emptied at the restore.
 */
export interface LastTurnRecord {
  lastOutput?: string;
  lastEvents?: readonly { type: string }[];
  lastTurnResult?: object | null;
  lastChannels?: Record<string, string[]>;
  lastChannelValues?: Record<string, unknown[]>;
  lastError?: string;
}

/**
 * Capture the engine's save as the game stands now.
 *
 * @param engine the engine of the game being run
 * @returns the save, or undefined when the engine refused to save
 */
export async function captureForkSave(engine: ForkSaveEngine): Promise<ForkSave | undefined> {
  return (await captureSave(engine)) ?? undefined;
}

/**
 * Restore a fork save onto the game it was captured on, and empty the
 * harness's record of the last turn. The engine re-derives its own phase
 * from the restored world. Entity instances are replaced by a restore; ids
 * survive, so a caller holding an entity looks it up through the world again.
 *
 * @param engine the engine the save was captured on
 * @param game the loaded game that engine belongs to
 * @param save the save to restore
 * @returns whether the engine accepted the restore; on false nothing is cleared
 */
export async function restoreForkSave(engine: ForkSaveEngine, game: LastTurnRecord, save: ForkSave): Promise<boolean> {
  if (!(await restoreSave(engine, save))) return false;
  game.lastOutput = '';
  game.lastEvents = [];
  game.lastTurnResult = null;
  game.lastChannels = {};
  game.lastChannelValues = {};
  game.lastError = undefined;
  return true;
}
