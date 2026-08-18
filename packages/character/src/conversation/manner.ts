/**
 * Manner beat selection (ADR-320 D5)
 *
 * A `define manner` block's rows are condition-gated beat sets. Selection
 * picks the first row whose condition holds (declaration order — the
 * analyzer already proved overlap rules at compile), then rotates through
 * that row's beats without back-to-back repeats. The rotation cursor
 * rides the scene store, so delivery replays byte-identically across
 * save/restore at the pinned seed. Silence is a manner-colored rendered
 * response like any other delivery (D8) — `renderSilence` builds its wire
 * event from the same selection path.
 *
 * Public interface: MannerSelection, selectMannerBeat, renderSilence.
 * Owner context: @sharpee/character / conversation
 */

import type { WorldModel, SceneWireEvent } from '@sharpee/world-model';
import type { IRMannerRow } from '@sharpee/chord';
import { readSceneStore, writeSceneStore } from './scene-store.js';

/** A selected delivery coloring: the beat to emit and the row's voice. */
export interface MannerSelection {
  /** The beat phrase key to emit. */
  beatKey: string;

  /** The matched row's `voice` word, if declared (open vocabulary, data). */
  voice?: string;

  /** Index of the matched row (callers correlate with authored order). */
  rowIndex: number;
}

/**
 * Select the delivery beat for a speaker (ADR-320 D5): first matching row
 * in declaration order, then beat rotation within the row — the cursor
 * advances one beat per delivery and a row with two or more beats never
 * repeats back-to-back. Mutates the rotation cursor in the scene store.
 *
 * @param world - The live world (rotation cursor home)
 * @param ownerId - The speaking entity (cursor scope)
 * @param rows - The owner's compiled manner rows, declaration order
 * @param evalCondition - Row-condition evaluator (the loader's, bound by the caller)
 * @returns The selection, or undefined when no row matches (no manner coloring)
 */
export function selectMannerBeat(
  world: WorldModel,
  ownerId: string,
  rows: IRMannerRow[],
  evalCondition: (row: IRMannerRow) => boolean,
): MannerSelection | undefined {
  const rowIndex = rows.findIndex((row) => evalCondition(row));
  if (rowIndex < 0) return undefined;

  const row = rows[rowIndex];
  if (row.beatKeys.length === 0) return undefined;

  const store = readSceneStore(world);
  const cursorKey = `${ownerId}:${rowIndex}`;
  const last = store.mannerRotation[cursorKey];
  // Advance one beat per delivery; a fresh cursor starts at the first beat.
  const next = last === undefined ? 0 : (last + 1) % row.beatKeys.length;
  store.mannerRotation[cursorKey] = next;
  writeSceneStore(world, store);

  return { beatKey: row.beatKeys[next], voice: row.voice, rowIndex };
}

/**
 * Render a silence (ADR-320 D8): a withheld reply is a delivery like any
 * other — manner-colored through the same selection path, emitted as a
 * `rendered-silence` wire event, never a bare absence.
 *
 * @param world - The live world (rotation cursor home)
 * @param sceneId - The scene the silence lands in
 * @param speakerId - The character staying silent
 * @param rows - The speaker's compiled manner rows, declaration order
 * @param evalCondition - Row-condition evaluator (the loader's, bound by the caller)
 * @returns The rendered-silence wire event (beats empty when no row matches)
 */
export function renderSilence(
  world: WorldModel,
  sceneId: string,
  speakerId: string,
  rows: IRMannerRow[],
  evalCondition: (row: IRMannerRow) => boolean,
): SceneWireEvent {
  const selection = selectMannerBeat(world, speakerId, rows, evalCondition);
  return {
    kind: 'rendered-silence',
    sceneId,
    speakerId,
    beats: selection ? [selection.beatKey] : [],
  };
}
