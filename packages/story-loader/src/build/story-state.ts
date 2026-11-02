/**
 * story-state.ts — the `story-state` step: the story object's opening values.
 *
 * Seeds world state with what the story declares at the top level: the
 * first declared story phase, each counter's starting value, the score
 * ceiling the declared scores sum to, and the rank ladder. All of it is
 * world state, serialized, so it survives save and restore; none of it
 * reads an entity, so the step requires no other.
 *
 * Public interface: seedStoryState (the `story-state` step).
 * Owner context: @sharpee/story-loader (language-neutral IR consumer).
 *
 * References:
 * - ADR-389 D2 — the world build as a named step list.
 * - ADR-264 D1, D5 — counters live in world state (the hunger.severity seam).
 * - ADR-129 — the declared scores set the ceiling.
 * - ADR-260 D2, D5; ADR-261 D7 — ranks lower onto the world's seam, name-agnostic.
 */
import type { WorldModel } from '@sharpee/world-model';
import { CHORD_STORY_STATE_KEY, counterKey } from '../state-keys.js';
import type { BuildContext } from './context.js';

/**
 * The `story-state` step: story phase, counters, score ceiling, ranks.
 * @param story the build context
 * @param world the world being built
 */
export function seedStoryState(story: BuildContext, world: WorldModel): void {
  // The story object starts in its first declared phase (ratchet D2).
  if (story.ir.story.states.length > 0) {
    world.setStateValue(CHORD_STORY_STATE_KEY, story.ir.story.states[0]);
  }

  // ADR-264 D1/D5: seed each story-global counter's initial value into world
  // state (serialized, so it survives save/restore — the hunger.severity seam).
  for (const counter of story.ir.counters) {
    world.setStateValue(counterKey(counter.name), counter.starts);
  }

  // Declared scores set the ceiling (dedup-by-identity makes the sum
  // exact — ADR-129).
  if (story.ir.scores.length > 0) {
    world.setMaxScore(story.ir.scores.reduce((sum, s) => sum + s.worth, 0));
  }

  // The rank ladder lowers onto ADR-260 D2's seam, beside the ceiling it
  // is independent of (thresholds are absolute points, so the two never
  // interact). Generic and name-agnostic: the loader lowers `ir.ranks` the
  // way it lowers any other IR field and never learns that `scoring` is the
  // extension consuming it — which is what keeps ADR-260 D5's
  // no-special-casing rule intact. `phraseKey` stays behind, in the story
  // layer, where the promotion reaction reads it (ADR-261 D7).
  if (story.ir.ranks.length > 0) {
    world.setRanks(story.ir.ranks.map((r) => ({
      id: r.id,
      name: r.name,
      threshold: r.threshold,
    })));
  }
}
