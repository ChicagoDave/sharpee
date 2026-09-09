/**
 * The turn-start stage: announce the turn to listeners and mark it begun,
 * so an error from here on is reported as `turn:failed`.
 *
 * Public interface: `turnStartStage`.
 * Owner context: `@sharpee/engine` — the turn cycle.
 */

import type { TurnStage } from './context.js';

export const turnStartStage: TurnStage = {
  name: 'turn-start',
  requires: ['validate-input'],
  async run(context) {
    context.engine.emit('turn:start', context.turn, context.input);
    context.started = true;
    return 'continue';
  }
};
