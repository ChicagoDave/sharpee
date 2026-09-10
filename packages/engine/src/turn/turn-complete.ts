/**
 * The turn-complete stage: announce the finished turn to listeners.
 *
 * Emits `turn:complete` with the turn's result once its events are
 * rendered and cleared; the ending stage's stops come after, so a
 * listener sees the completed turn before the story ends on it.
 *
 * Public interface: `turnCompleteStage`.
 * Owner context: `@sharpee/engine` — the turn cycle.
 */

import type { TurnStage } from './context.js';

export const turnCompleteStage: TurnStage = {
  name: 'turn-complete',
  requires: ['clear-turn-events'],
  async run(context) {
    context.engine.emit('turn:complete', context.result!);
    return 'continue';
  }
};
