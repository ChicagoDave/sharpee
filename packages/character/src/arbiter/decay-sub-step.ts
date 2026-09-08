/**
 * The decay sub-step: each turn, mood drifts toward its authored baseline and
 * the lucidity window counts down. The curves are the runtime's, never
 * declared by a story. Emits a mood-changed event when the drift crosses a
 * mood-word boundary, and whatever the lucidity decay emits.
 *
 * Public interface: runDecaySubStep.
 * Owner context: @sharpee/character — arbiter (the per-turn decays sit together).
 *
 * References:
 *   ADR-310 D6 — runtime-owned curves; the author declares a starting state.
 *   ADR-339 D1 — this body moved here from tick-phases.ts unchanged.
 */

import type { ISemanticEvent } from '@sharpee/core';
import { type IFEntity, TraitType, type CharacterModelTrait } from '@sharpee/world-model';
import { processLucidityDecay, CharacterMessages } from '@sharpee/stdlib';
import { type TickContext, createEvent } from '../tick-support.js';
import type { CharacterPhaseRegistry } from '../tick-phases.js';

// ---------------------------------------------------------------------------
// Decay sub-step (ADR-310 D6 — runtime-owned curves, never declared)
// ---------------------------------------------------------------------------

/** Fraction of the mood-to-baseline distance that survives each turn. */
const MOOD_DECAY_FACTOR = 0.85;
/** Distance under which mood snaps to baseline (ends the drift). */
const MOOD_DECAY_SNAP = 0.02;

/**
 * Decay mutable per-NPC curves toward their authored baselines: mood
 * (valence-arousal, exponential approach) and lucidity (window countdown,
 * folded from stdlib's `processLucidityDecay` — the call that used to be
 * inlined in `NpcService.tick`).
 *
 * Emits `CharacterMessages.MOOD_CHANGED` when the drift crosses a mood-word
 * boundary, and whatever lucidity events stdlib's decay emits.
 */
export function runDecaySubStep(
  npcs: IFEntity[],
  ctx: TickContext,
  registry: CharacterPhaseRegistry,
): ISemanticEvent[] {
  const events: ISemanticEvent[] = [];
  const { world, turn } = ctx;

  for (const npc of npcs) {
    const trait = npc.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait | undefined;
    if (!trait) continue;

    // Mood toward authored baseline (only for NPCs whose config carries one)
    const baseline = registry.getConfig(npc.id)?.baselineMood;
    if (baseline) {
      const previousMood = trait.getMood();
      const dv = trait.moodValence - baseline.valence;
      const da = trait.moodArousal - baseline.arousal;
      if (Math.abs(dv) > 0 || Math.abs(da) > 0) {
        const targetValence = Math.abs(dv) <= MOOD_DECAY_SNAP
          ? baseline.valence
          : baseline.valence + dv * MOOD_DECAY_FACTOR;
        const targetArousal = Math.abs(da) <= MOOD_DECAY_SNAP
          ? baseline.arousal
          : baseline.arousal + da * MOOD_DECAY_FACTOR;
        trait.adjustMood(targetValence - trait.moodValence, targetArousal - trait.moodArousal);
        const newMood = trait.getMood();
        if (newMood !== previousMood) {
          events.push(createEvent(CharacterMessages.MOOD_CHANGED, {
            from: previousMood, to: newMood,
          }, npc.id));
        }
      }
    }

    // Lucidity window countdown (fold of the old NpcService.tick inline call)
    events.push(...processLucidityDecay(npc, world, turn));
  }

  return events;
}
