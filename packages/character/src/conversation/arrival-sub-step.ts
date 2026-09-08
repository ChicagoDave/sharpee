/**
 * The arrival reactions sub-step: the story's reaction to every
 * arrival-narrated fact that landed this tick runs last, in arrival order,
 * so the goals and scenes sub-steps saw the world as it stood when each fact
 * arrived. Nothing bound, or nothing arrived, means no events.
 *
 * Public interface: runArrivalReactions.
 * Owner context: @sharpee/character — conversation.
 *
 * References:
 *   GH #353 — arrival reactions on the tick the fact lands.
 *   ADR-332 — why last: the scheduler used to run these clauses after the actor phase.
 *   ADR-339 D1 — this body moved here from tick-phases.ts unchanged.
 */

import type { ISemanticEvent } from '@sharpee/core';
import type { TickContext, SceneTickSurface } from '../tick-support.js';
import type { CharacterPhaseRegistry } from '../tick-phases.js';

// ---------------------------------------------------------------------------
// Arrival reactions (GH #353) — last, after scenes
// ---------------------------------------------------------------------------

/**
 * Run the story's reaction to every arrival-narrated fact that landed this
 * tick, in arrival order. Last on purpose: the clauses these reactions run
 * may move or re-mood their owner, and the goals and scenes sub-steps must
 * see the world as it stood when the fact arrived — the order the scheduler
 * gave those clauses before ADR-332 moved it ahead of the actor phase.
 * Nothing bound, or nothing arrived: no events.
 *
 * @param ctx - The tick context
 * @param registry - Character phase registry (carries the bound reaction)
 * @param surface - This tick's surface, with the queued arrivals
 * @returns The reactions' events, in arrival order
 */
export function runArrivalReactions(
  ctx: TickContext,
  registry: CharacterPhaseRegistry,
  surface: SceneTickSurface,
): ISemanticEvent[] {
  const react = registry.getArrivalReaction();
  if (!react || surface.arrivals.length === 0) return [];
  const events: ISemanticEvent[] = [];
  for (const arrival of surface.arrivals) {
    events.push(...react(arrival, ctx.world));
  }
  return events;
}
