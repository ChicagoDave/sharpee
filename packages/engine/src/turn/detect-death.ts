/**
 * The death-detection stage: read the turn's event stream for a canonical
 * player-death event before the stream is cleared, and declare the defeat
 * Ending when the player is still dead.
 *
 * The death may have been emitted this turn by the action, an
 * interceptor, or a scheduler daemon — all have landed in the turn's
 * events by now, and story policy (event handlers in the executor, state
 * machines in the plugin tick) has had its first crack at a veto by
 * resetting the player's health. The cause found here is what the
 * ending stage routes to defeat, after this stage's live-state re-check.
 *
 * **Why the Ending is declared here rather than in the ending stage**
 * (ADR-347 D1): a death is a conclusion the story never declared for
 * itself, so the engine declares it — and it must do so before the turn
 * renders, or the turn that ends the story carries neither the end-game
 * prompt nor the `story-ending` channel, and the client is told about
 * the most common ending in IF only by prose. This stage therefore runs
 * before `render-prose`, after every site that could veto the death has
 * had its turn. `endingStage` reads the result and stops; it recomputes
 * nothing.
 *
 * Public interface: `detectDeathStage`.
 * Owner context: `@sharpee/engine` — the turn cycle.
 *
 * References: ADR-224 (death detection; the engine's final word is the
 * live re-check, not the event's flag). ADR-347 (the ending is an
 * explicit concept).
 */

import type { ISemanticEvent } from '@sharpee/core';
import { TraitType, HealthBehavior, type HealthTrait } from '@sharpee/world-model';
import { PLAYER_DIED_EVENT, endStory } from '@sharpee/stdlib';
import type { TurnStage, TurnStageContext, TurnEngine } from './context.js';

/**
 * Whether the player is currently dead by their derived `HealthTrait`
 * state (ADR-226/ADR-224). A player with no `HealthTrait` is alive by
 * default (the opt-in rule) — `killPlayer` lazily attaches one, so a real
 * death always has a trait to read. This is the engine's "final word"
 * after story policy has run.
 */
function isPlayerDead(engine: TurnEngine): boolean {
  const player = engine.context.player;
  if (!player) return false;
  const health = player.get(TraitType.HEALTH) as HealthTrait | undefined;
  return health ? !HealthBehavior.isAlive(health) : false;
}

/**
 * The `cause` of a canonical player-death event (ADR-224) emitted during
 * the given turn, or `undefined` if the player did not die this turn.
 * Scans the turn's accumulated events, so it sees deaths from the action,
 * interceptors, and scheduler daemons alike. When several fire in one
 * turn (rare), the first is authoritative — `killPlayer` is idempotent,
 * so later calls emit nothing.
 */
function playerDeathCauseThisTurn(engine: TurnEngine, turn: number): string | undefined {
  const events = engine.turnEventsOf(turn);
  for (const event of events) {
    if (event.type === PLAYER_DIED_EVENT) {
      const cause = (event.data as { cause?: unknown } | undefined)?.cause;
      return typeof cause === 'string' ? cause : 'unknown';
    }
  }
  return undefined;
}

/**
 * Put a declared ending's blessed event on the turn's streams.
 *
 * `endStory` builds the event and hands it back for its caller to route,
 * exactly as `killPlayer` does with the death event — so a story's `win`
 * or `lose` reports its outcome through the statement that declared it.
 * A death is declared by the engine rather than by the story, which is
 * why the engine owes it the same reporting: an ending that records
 * itself in the world and says nothing on the stream would be the one
 * outcome with no event, and `endings.ts` names transcript tests among
 * the consumers that assert on those types.
 *
 * The three-way delivery is `platform-operations`' (`platform-operations.ts`):
 * the event source, the turn's stored events, and the engine's emitter,
 * with the turn result refreshed so a caller reading `result.events`
 * sees it too.
 *
 * @param context the turn stage context, whose result is refreshed
 * @param event the ending event to deliver
 */
function routeEndingEvent(context: TurnStageContext, event: ISemanticEvent): void {
  const { engine, turn } = context;
  engine.eventSource.emit(event);
  engine.storeTurnEvents(turn, [event]);
  engine.emit('event', event);
  if (context.result) context.result.events = engine.turnEventsOf(turn);
}

export const detectDeathStage: TurnStage = {
  name: 'detect-death',
  requires: ['plugin-tick', 'platform-operations'],
  async run(context) {
    const { engine } = context;
    context.deathCause = playerDeathCauseThisTurn(engine, context.turn);

    // Story policy has had every chance to revive the player by now, so
    // the live re-check is final. First-ending-wins leaves a `win` or
    // `lose` that already ran this turn authoritative, and returns
    // `undefined` here rather than a second closing event.
    if (context.deathCause !== undefined && isPlayerDead(engine)) {
      const ended = endStory(engine.world, 'defeat', {
        turn: context.turn,
        cause: context.deathCause,
      });
      if (ended) routeEndingEvent(context, ended);
    }
    return 'continue';
  }
};
