/**
 * The ending stage: after the turn is complete, stop the engine when the
 * world says the story reached a conclusion.
 *
 * Runs last, and asks the world one question — does it carry an Ending
 * (ADR-347 D1, D2a)? A `win`/`lose` or any other declaring site set it
 * during the turn through stdlib's `endStory`; the stage does not
 * recompute it from events, a flag, or a per-turn poll of the story.
 *
 * It declares nothing itself, not even for a death: `detect-death` owns
 * that, and owns it early enough that the ending turn renders with the
 * end-game prompt and carries the `story-ending` channel. Whatever
 * happens, the turn's result is the result as it stood.
 *
 * Public interface: `endingStage`.
 * Owner context: `@sharpee/engine` — the turn cycle.
 *
 * References: ADR-347 (the ending is an explicit concept; the poll that
 * used to live here is retired by D2b). ADR-224 (death detection and the
 * live-state re-check).
 */

import type { TurnStage } from './context.js';

export const endingStage: TurnStage = {
  name: 'ending',
  requires: ['turn-complete', 'detect-death', 'emit-events'],
  async run(context) {
    const { engine } = context;

    const ending = engine.world.getEnding();
    if (!ending) return 'continue';

    if (ending.kind === 'victory') {
      engine.stop('victory', { reason: 'Story completed', score: 0 });
    } else {
      // A death carries a cause; a story that declared defeat outright does
      // not, and `createGameLostEvent` supplies its own default reason there.
      engine.stop(
        'defeat',
        ending.cause !== undefined ? { reason: 'You have died.', cause: ending.cause } : {},
      );
    }
    return 'stop';
  }
};
