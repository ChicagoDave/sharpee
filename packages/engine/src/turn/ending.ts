/**
 * The ending stage: after the turn is complete, stop the engine when the
 * turn ended the story — a victory event, a player still dead, or a
 * story that reports itself complete.
 *
 * Runs last. A `story.victory` seen by `emit-events` stops the engine
 * with reason 'victory' and the event's details. A death detected this
 * turn routes to defeat only if the player's derived life-state is still
 * dead — the re-check of live state, not the event's flag, is the
 * engine's final word, so a story policy that revived the player wins.
 * Otherwise `Story.isComplete()` ends the story as a victory. Whatever
 * happens, the turn's result is the result as it stood.
 *
 * Public interface: `endingStage`.
 * Owner context: `@sharpee/engine` — the turn cycle.
 *
 * References: ADR-224 (death detection and the live-state re-check).
 */

import type { TurnStage } from './context.js';

export const endingStage: TurnStage = {
  name: 'ending',
  requires: ['turn-complete', 'detect-death', 'emit-events'],
  async run(context) {
    const { engine } = context;

    if (context.victory) {
      engine.stop('victory', context.victory);
      return 'stop';
    }

    if (context.deathCause !== undefined && engine.isPlayerDead()) {
      engine.stop('defeat', { reason: 'You have died.', cause: context.deathCause });
      return 'stop';
    }

    if (engine.isGameOver()) {
      // Completion means victory for now; stories could provide more
      // detail about the type of ending.
      engine.stop('victory', {
        reason: 'Story completed',
        score: 0
      });
    }
    return 'continue';
  }
};
