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

import type { TurnStage, TurnEngine } from './context.js';

/**
 * Land the turn's `player.switch_requested` events: the first wins and
 * the switch happens through the engine; a second in the same turn is
 * reported as a runtime event and ignored. A request naming the current
 * player changes nothing.
 */
function drainPlayerSwitch(engine: TurnEngine, turn: number): void {
  const requests = engine.turnEventsOf(turn).filter(
    (e) => e.type === 'if.event.player.switch_requested',
  );
  if (requests.length === 0) return;

  const first = requests[0].data as { entityId?: string };
  if (requests.length > 1) {
    const targets = requests.map((r) => (r.data as { entityId?: string }).entityId ?? '?');
    engine.emitGameEvent({
      id: `runtime-double-player-switch-${turn}`,
      type: 'runtime.double-player-switch',
      timestamp: Date.now(),
      entities: {},
      data: {
        message: `Two \`change the player to\` statements ran in one turn (${targets.join(', ')}). The first won.`,
        targets,
        turn,
      },
    });
  }
  if (first.entityId && first.entityId !== engine.context.player.id) {
    engine.switchPlayer(first.entityId);
  }
}

export const playerSwitchStage: TurnStage = {
  name: 'player-switch',
  requires: ['advance-turn'],
  async run(context) {
    drainPlayerSwitch(context.engine, context.turn);
    return 'continue';
  }
};
