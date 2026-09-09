/**
 * The player-switch stage: land a mid-play change of player at the turn
 * boundary.
 *
 * The story loader holds no engine handle, so `change the player to X`
 * reaches the engine as an event and the switch happens here, after the
 * turn counter has advanced — never mid-action, where half the turn
 * would have run as one character and half as another.
 *
 * Public interface: `playerSwitchStage`.
 * Owner context: `@sharpee/engine` — the turn cycle.
 *
 * References: ADR-327 D9 (the player-switch drain at the turn boundary).
 */

import type { TurnStage } from './context.js';

export const playerSwitchStage: TurnStage = {
  name: 'player-switch',
  requires: ['advance-turn'],
  async run(context) {
    context.engine.drainPlayerSwitch(context.turn);
    return 'continue';
  }
};
