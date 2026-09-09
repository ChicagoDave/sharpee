/**
 * The stage runner: runs a turn's stages in order, switching to the meta
 * list when the parse stage routes there, and pairs `turn:failed` with a
 * `turn:start` that was emitted.
 *
 * The runner starts on the regular list. After the parse stage it reads
 * the route the stage set; a meta route continues on the meta list from
 * the stage after its own parse entry (both lists share the stages up to
 * and including parse, which the order test pins). A `'stop'` outcome
 * ends the list with the result as it stands; a stage that ends the list
 * without a result is a programming error and throws. An error thrown by
 * a stage after `turn:start` was emitted is reported as `turn:failed`
 * and rethrown; before it, the turn has not begun and the error simply
 * propagates.
 *
 * Public interface: `runTurnStages`, `requiresOrderViolations`,
 * `OrderViolation`.
 * Owner context: `@sharpee/engine` — the turn cycle.
 *
 * References: ADR-334 D1 (the runner), D1a (the route switch at parse),
 * D2 (the order pinned by `requires` and the order test).
 */

import type { TurnResult } from '../types.js';
import type { TurnStage, TurnStageContext } from './context.js';

/** The stage where the regular and meta lists part. */
export const ROUTE_STAGE = 'parse';

/**
 * Run the stages of a turn over its context and return the result.
 *
 * @param context - The turn's context, built by the engine
 * @param turnStages - The regular list; the runner starts here
 * @param metaStages - The meta list; entered after parse when the route is meta
 */
export async function runTurnStages(
  context: TurnStageContext,
  turnStages: readonly TurnStage[],
  metaStages: readonly TurnStage[]
): Promise<TurnResult> {
  try {
    let stages = turnStages;
    for (let index = 0; index < stages.length; index++) {
      const stage = stages[index];
      const outcome = await stage.run(context);
      if (outcome === 'stop') break;
      if (stage.name === ROUTE_STAGE && context.route === 'meta' && stages !== metaStages) {
        stages = metaStages;
        index = metaStages.findIndex((s) => s.name === ROUTE_STAGE);
      }
    }
  } catch (error) {
    if (context.started) {
      context.engine.emit('turn:failed', error as Error, context.turn);
    }
    throw error;
  }
  if (!context.result) {
    throw new Error('The turn ended without a result');
  }
  return context.result;
}

/** One ordering fault: `name` requires `requires`, which is absent or not earlier. */
export interface OrderViolation {
  readonly name: string;
  readonly requires: string;
}

/**
 * Every `requires` an ordered stage list fails to satisfy — a required
 * name absent from the list, or present but not earlier.
 *
 * @param stages - The list in run order
 */
export function requiresOrderViolations(
  stages: ReadonlyArray<Pick<TurnStage, 'name' | 'requires'>>
): OrderViolation[] {
  const violations: OrderViolation[] = [];
  stages.forEach((stage, index) => {
    for (const required of stage.requires) {
      const at = stages.findIndex((s) => s.name === required);
      if (at === -1 || at >= index) violations.push({ name: stage.name, requires: required });
    }
  });
  return violations;
}
