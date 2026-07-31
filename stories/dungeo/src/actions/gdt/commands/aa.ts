/**
 * GDT Alter Adventurer Command (AA)
 *
 * Alters player attributes for testing. Currently supports SCORE, which sets the
 * player's total to an exact value so a test can start from a scored position
 * without replaying a walkthrough.
 *
 * Usage: AA SCORE <points>
 *
 * Owner context: dungeo story GDT (see src/actions/gdt/). Story-tier debug only.
 */

import { GDTCommandHandler, GDTContext, GDTCommandResult } from '../types';

/**
 * Reserved ledger id for GDT's score adjustment.
 *
 * The score ledger (ADR-129) is append-only with unique ids and has no setter, so
 * AA reaches an arbitrary total by carrying the difference in this one entry.
 * Keeping it under a single reserved id means earned entries are never rewritten
 * and repeated `AA SCORE` calls replace the adjustment rather than stacking.
 */
const GDT_SCORE_ENTRY_ID = 'gdt.score.adjustment';

/** Attributes AA understands, for usage and error text. */
const SUPPORTED_ATTRIBUTES = ['SCORE'];

/**
 * Set the player's total score to an exact value.
 *
 * Revokes any previous adjustment first, so the delta is computed against genuinely
 * earned points and calling AA twice does not compound.
 *
 * @param context GDT context (supplies the world model).
 * @param target Desired total score; must be a non-negative integer.
 * @returns Command result reporting the before/after totals.
 */
function setScore(context: GDTContext, target: number): GDTCommandResult {
  const { world } = context;

  const before = world.getScore();

  // Drop any prior adjustment so `earned` reflects only real achievements.
  world.revokeScore(GDT_SCORE_ENTRY_ID);
  const earned = world.getScore();

  const delta = target - earned;
  if (delta !== 0) {
    world.awardScore(GDT_SCORE_ENTRY_ID, delta, 'GDT score adjustment');
  }

  const after = world.getScore();
  return {
    success: true,
    output: [
      `Score: ${before} -> ${after} (of ${world.getMaxScore()})`,
      `  earned ${earned}, GDT adjustment ${delta >= 0 ? '+' : ''}${delta}`
    ]
  };
}

export const aaHandler: GDTCommandHandler = {
  code: 'AA',
  name: 'Alter Adventurer',
  description: 'Alter player attributes (usage: AA SCORE <points>)',

  execute(context: GDTContext, args: string[]): GDTCommandResult {
    if (args.length === 0) {
      return {
        success: false,
        output: [`Usage: AA <${SUPPORTED_ATTRIBUTES.join('|')}> <value>`],
        error: 'MISSING_ARGUMENT'
      };
    }

    const attribute = args[0].toUpperCase();

    if (attribute !== 'SCORE') {
      return {
        success: false,
        output: [
          `Unknown adventurer attribute: ${args[0]}`,
          `Supported: ${SUPPORTED_ATTRIBUTES.join(', ')}`
        ],
        error: 'UNKNOWN_ATTRIBUTE'
      };
    }

    if (args.length < 2) {
      return {
        success: false,
        output: ['Usage: AA SCORE <points>'],
        error: 'MISSING_ARGUMENT'
      };
    }

    const raw = args[1];
    const target = Number(raw);
    if (!Number.isInteger(target) || target < 0) {
      return {
        success: false,
        output: [`Not a non-negative integer: ${raw}`],
        error: 'INVALID_ARGUMENT'
      };
    }

    return setScore(context, target);
  }
};
