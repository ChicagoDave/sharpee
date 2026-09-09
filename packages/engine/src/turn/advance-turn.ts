/**
 * The advance stage: move the turn counter and the session statistics
 * past this turn.
 *
 * The engine's context takes the result (turn counter, player state)
 * and the session counts one more turn, plus one more move when the
 * command succeeded. Meta commands never reach this stage.
 *
 * Public interface: `advanceTurnStage`.
 * Owner context: `@sharpee/engine` — the turn cycle.
 */

import type { TurnStage } from './context.js';

export const advanceTurnStage: TurnStage = {
  name: 'advance-turn',
  requires: ['sound-dispatch'],
  async run(context) {
    const result = context.result!;
    context.engine.updateContext(result);
    context.engine.countSessionTurn(result.success);
    return 'continue';
  }
};
