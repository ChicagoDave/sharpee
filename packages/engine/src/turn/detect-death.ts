/**
 * The death-detection stage: read the turn's event stream for a canonical
 * player-death event before the stream is cleared.
 *
 * The death may have been emitted this turn by the action, an
 * interceptor, or a scheduler daemon — all have landed in the turn's
 * events by now, and story policy (event handlers in the executor, state
 * machines in the plugin tick) has had its first crack at a veto by
 * resetting the player's health. The cause found here is what the
 * ending stage routes to defeat, after its own live-state re-check.
 *
 * Public interface: `detectDeathStage`.
 * Owner context: `@sharpee/engine` — the turn cycle.
 *
 * References: ADR-224 (death detection; the engine's final word is the
 * live re-check, not the event's flag).
 */

import { PLAYER_DIED_EVENT } from '@sharpee/stdlib';
import type { TurnStage, TurnEngine } from './context.js';

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

export const detectDeathStage: TurnStage = {
  name: 'detect-death',
  requires: ['plugin-tick', 'platform-operations'],
  async run(context) {
    context.deathCause = playerDeathCauseThisTurn(context.engine, context.turn);
    return 'continue';
  }
};
