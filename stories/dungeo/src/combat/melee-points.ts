/**
 * Melee choice points (ADR-293 D2/D10) — the three blow points over the
 * shared MDL tables, plus the numeric-outcome → class-label mapping.
 *
 * D10's ruling: hero and villain blows are two outcome-spaces wearing shared
 * tables (UNCONSCIOUS negates defender strength only for hero blows; the
 * def<0 auto-kill exists only downstream of hero blows; `villain → KILLED`
 * is player death and gets its own coverage row). `vsUnconscious` splits on
 * class-set grounds — every outcome remaps to HESITATE or SITTING_DUCK.
 *
 * Public interface: `HERO_BLOW_POINT`, `VILLAIN_BLOW_POINT`,
 * `VS_UNCONSCIOUS_BLOW_POINT`, `HERO_MESSAGE_VARIANT_POINT`,
 * `VILLAIN_MESSAGE_VARIANT_POINT`, `meleeOutcomeClass`.
 * Owner context: stories/dungeo combat.
 */

import { definePoint } from '@sharpee/core';
import { MeleeOutcome, MeleeOutcomeType } from './melee-tables.js';

/** The full seven-class blow taxonomy (D10) — both blow points declare it. */
export const MELEE_BLOW_CLASSES = [
  'MISSED',
  'STAGGER',
  'LOSE_WEAPON',
  'LIGHT_WOUND',
  'SERIOUS_WOUND',
  'UNCONSCIOUS',
  'KILLED',
] as const;
export type MeleeBlowClass = (typeof MELEE_BLOW_CLASSES)[number];

/** vsUnconscious genuinely differs: every outcome remaps to one of these. */
export const VS_UNCONSCIOUS_CLASSES = ['HESITATE', 'SITTING_DUCK'] as const;
export type VsUnconsciousClass = (typeof VS_UNCONSCIOUS_CLASSES)[number];

export const HERO_BLOW_POINT = definePoint('dungeo.melee.blow.hero', {
  classes: MELEE_BLOW_CLASSES,
});
export const VILLAIN_BLOW_POINT = definePoint('dungeo.melee.blow.villain', {
  classes: MELEE_BLOW_CLASSES,
});
export const VS_UNCONSCIOUS_BLOW_POINT = definePoint('dungeo.melee.blow.vsUnconscious', {
  classes: VS_UNCONSCIOUS_CLASSES,
});

/** Message-variant picks — plain draws (D4), one per party. */
export const HERO_MESSAGE_VARIANT_POINT = definePoint('dungeo.melee.hero-message-variant');
export const VILLAIN_MESSAGE_VARIANT_POINT = definePoint('dungeo.melee.villain-message-variant');

const OUTCOME_LABELS: Record<MeleeOutcomeType, MeleeBlowClass | VsUnconsciousClass> = {
  [MeleeOutcome.MISSED]: 'MISSED',
  [MeleeOutcome.UNCONSCIOUS]: 'UNCONSCIOUS',
  [MeleeOutcome.KILLED]: 'KILLED',
  [MeleeOutcome.LIGHT_WOUND]: 'LIGHT_WOUND',
  [MeleeOutcome.SERIOUS_WOUND]: 'SERIOUS_WOUND',
  [MeleeOutcome.STAGGER]: 'STAGGER',
  [MeleeOutcome.LOSE_WEAPON]: 'LOSE_WEAPON',
  [MeleeOutcome.HESITATE]: 'HESITATE',
  [MeleeOutcome.SITTING_DUCK]: 'SITTING_DUCK',
};

/**
 * Class label for a numeric melee outcome.
 *
 * @param outcome the numeric `MeleeOutcome` value a blow resolved to
 */
export function meleeOutcomeClass(outcome: MeleeOutcomeType): MeleeBlowClass | VsUnconsciousClass {
  return OUTCOME_LABELS[outcome];
}

const CLASS_OUTCOMES = Object.fromEntries(
  (Object.entries(OUTCOME_LABELS) as Array<[string, MeleeBlowClass | VsUnconsciousClass]>).map(
    ([outcome, cls]) => [cls, Number(outcome) as MeleeOutcomeType]
  )
) as Record<MeleeBlowClass | VsUnconsciousClass, MeleeOutcomeType>;

/**
 * Numeric melee outcome for a class label — the forced-path inverse of
 * `meleeOutcomeClass` (ADR-293 D8, Phase C `materialize`).
 *
 * @param cls a declared blow class
 */
export function meleeOutcomeFromClass(cls: MeleeBlowClass | VsUnconsciousClass): MeleeOutcomeType {
  return CLASS_OUTCOMES[cls];
}
