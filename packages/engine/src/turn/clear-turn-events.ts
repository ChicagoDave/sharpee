/**
 * The clear stage: empty the turn's stored events once they are rendered.
 *
 * Meta commands and repeated inputs reuse a turn number, so the events
 * of a finished turn must not accumulate under it. Runs after the prose
 * and the channel packet have read them and after death detection has
 * scanned them.
 *
 * Public interface: `clearTurnEventsStage`.
 * Owner context: `@sharpee/engine` — the turn cycle.
 */

import type { TurnStage } from './context.js';

export const clearTurnEventsStage: TurnStage = {
  name: 'clear-turn-events',
  requires: ['channel-packet', 'detect-death'],
  async run(context) {
    context.engine.turnEvents.set(context.turn, []);
    return 'continue';
  }
};
