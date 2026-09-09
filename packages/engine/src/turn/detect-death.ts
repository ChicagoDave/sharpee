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

import type { TurnStage } from './context.js';

export const detectDeathStage: TurnStage = {
  name: 'detect-death',
  requires: ['plugin-tick', 'platform-operations'],
  async run(context) {
    context.deathCause = context.engine.playerDeathCauseThisTurn(context.turn);
    return 'continue';
  }
};
