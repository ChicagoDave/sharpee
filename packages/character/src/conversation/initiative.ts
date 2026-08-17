/**
 * Authored initiative (ADR-320 D7)
 *
 * `define initiative` rows force or suppress a seizure at their occasion —
 * most-specific-wins: an authored row always beats disposition scoring, in
 * either direction. This module matches a character's compiled rows
 * against a live occasion; the caller feeds the answer into `scoreFloor`
 * as the bid's `authored` field and runs a forcing row's body. A row whose
 * body is the lone `hold their tongue` statement suppresses (the analyzer
 * guarantees the alone-gate at compile).
 *
 * Public interface: AuthoredInitiative, authoredInitiativeFor.
 * Owner context: @sharpee/character / conversation
 */

import type { IRInitiativeRow } from '@sharpee/chord';
import type { SceneOccasion } from './scene-scoring.js';

/** An authored row's answer to an occasion. */
export interface AuthoredInitiative {
  /** Suppress when the body is the lone hold-tongue statement; else force. */
  authored: 'forces' | 'suppresses';

  /** The matching row (a forcing row's body is the seizure's script). */
  row: IRInitiativeRow;
}

/** Whether a compiled row's occasion head answers a live occasion. */
function occasionMatches(
  row: IRInitiativeRow,
  occasion: SceneOccasion,
  witnessedAction: string | undefined,
): boolean {
  switch (row.occasion.kind) {
    case 'open-floor':
      return occasion.kind === 'open-floor';
    case 'silence':
      return occasion.kind === 'silence';
    case 'subject-change':
      return occasion.kind === 'subject-change';
    case 'act':
      // Witnessed acts carry an event id on the occasion; the caller — who
      // classified the event — names the action it committed.
      return occasion.kind === 'witnessed-event' && row.occasion.action === witnessedAction;
  }
}

/**
 * The authored answer to an occasion, if any (ADR-320 D7): the first row
 * in declaration order whose occasion head matches and whose `, when`
 * refinement holds. `goal-step` occasions never match — the goal surface
 * is deliberately unsurfaced in initiative authoring (Phase 4 freeze).
 *
 * @param rows - The character's compiled initiative rows, declaration order
 * @param occasion - The live occasion
 * @param evalCondition - Refinement evaluator (the loader's, bound by the caller)
 * @param witnessedAction - For witnessed-event occasions, the committed action id
 * @returns The authored answer, or undefined when disposition decides
 */
export function authoredInitiativeFor(
  rows: IRInitiativeRow[],
  occasion: SceneOccasion,
  evalCondition: (row: IRInitiativeRow) => boolean,
  witnessedAction?: string,
): AuthoredInitiative | undefined {
  for (const row of rows) {
    if (!occasionMatches(row, occasion, witnessedAction)) continue;
    if (row.condition !== null && !evalCondition(row)) continue;
    const suppresses = row.body.length === 1 && row.body[0].kind === 'hold-tongue';
    return { authored: suppresses ? 'suppresses' : 'forces', row };
  }
  return undefined;
}
