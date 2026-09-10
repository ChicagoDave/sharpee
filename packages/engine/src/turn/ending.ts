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

import { TraitType, HealthBehavior, type HealthTrait } from '@sharpee/world-model';
import type { TurnStage, TurnEngine } from './context.js';

/**
 * Whether the player is currently dead by their derived `HealthTrait`
 * state (ADR-226/ADR-224). A player with no `HealthTrait` is alive by
 * default (the opt-in rule) — `killPlayer` lazily attaches one, so a real
 * death always has a trait to read. This is the engine's "final word"
 * after story policy has run.
 */
function isPlayerDead(engine: TurnEngine): boolean {
  const player = engine.context.player;
  if (!player) return false;
  const health = player.get(TraitType.HEALTH) as HealthTrait | undefined;
  return health ? !HealthBehavior.isAlive(health) : false;
}

/** Whether the story reports itself complete; a story without `isComplete` never ends by itself. */
function isGameOver(engine: TurnEngine): boolean {
  // `engine.story` is no longer optional (ADR-345 D7) — a turn runs only
  // while playing, which always carries a story. `isComplete` itself stays
  // optional: a story without one never ends by itself.
  if (engine.story.isComplete) {
    return engine.story.isComplete();
  }
  return false;
}

export const endingStage: TurnStage = {
  name: 'ending',
  requires: ['turn-complete', 'detect-death', 'emit-events'],
  async run(context) {
    const { engine } = context;

    if (context.victory) {
      engine.stop('victory', context.victory);
      return 'stop';
    }

    if (context.deathCause !== undefined && isPlayerDead(engine)) {
      engine.stop('defeat', { reason: 'You have died.', cause: context.deathCause });
      return 'stop';
    }

    if (isGameOver(engine)) {
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
