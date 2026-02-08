/**
 * Canonical MDL Combat Result Tables (dung.355:1083-1130)
 *
 * The melee system uses lookup tables indexed by attacker/defender strength
 * to determine combat outcomes. Each sub-table has 9 entries; one is picked
 * at random per blow.
 *
 * Source: docs/internal/dungeon-81/original_source/dung.355
 *         docs/internal/dungeon-81/original_source/melee.137
 */

/**
 * All possible outcomes of a single blow.
 * Values match the MDL constants (melee.137:14-30).
 */
export const MeleeOutcome = {
  MISSED: 0,
  UNCONSCIOUS: 1,
  KILLED: 2,
  LIGHT_WOUND: 3,
  SERIOUS_WOUND: 4,
  STAGGER: 5,
  LOSE_WEAPON: 6,
  HESITATE: 7,
  SITTING_DUCK: 8,
} as const;

export type MeleeOutcomeType = typeof MeleeOutcome[keyof typeof MeleeOutcome];

// ============= Raw Result Arrays (dung.355:1083-1124) =============

// DEF1: defender strength = 1 (nearly dead)
// 13 entries — sub-tables are 9-element windows into this array
const DEF1: MeleeOutcomeType[] = [
  MeleeOutcome.MISSED, MeleeOutcome.MISSED, MeleeOutcome.MISSED, MeleeOutcome.MISSED,
  MeleeOutcome.STAGGER, MeleeOutcome.STAGGER,
  MeleeOutcome.UNCONSCIOUS, MeleeOutcome.UNCONSCIOUS,
  MeleeOutcome.KILLED, MeleeOutcome.KILLED, MeleeOutcome.KILLED, MeleeOutcome.KILLED, MeleeOutcome.KILLED
];

// DEF2A: defender strength = 2, low attacker
const DEF2A: MeleeOutcomeType[] = [
  MeleeOutcome.MISSED, MeleeOutcome.MISSED, MeleeOutcome.MISSED, MeleeOutcome.MISSED, MeleeOutcome.MISSED,
  MeleeOutcome.STAGGER, MeleeOutcome.STAGGER,
  MeleeOutcome.LIGHT_WOUND, MeleeOutcome.LIGHT_WOUND,
  MeleeOutcome.UNCONSCIOUS
];

// DEF2B: defender strength = 2, higher attacker
const DEF2B: MeleeOutcomeType[] = [
  MeleeOutcome.MISSED, MeleeOutcome.MISSED, MeleeOutcome.MISSED,
  MeleeOutcome.STAGGER, MeleeOutcome.STAGGER,
  MeleeOutcome.LIGHT_WOUND, MeleeOutcome.LIGHT_WOUND, MeleeOutcome.LIGHT_WOUND,
  MeleeOutcome.UNCONSCIOUS,
  MeleeOutcome.KILLED, MeleeOutcome.KILLED, MeleeOutcome.KILLED
];

// DEF3A: defender strength > 2, attacker weaker
const DEF3A: MeleeOutcomeType[] = [
  MeleeOutcome.MISSED, MeleeOutcome.MISSED, MeleeOutcome.MISSED, MeleeOutcome.MISSED, MeleeOutcome.MISSED,
  MeleeOutcome.STAGGER, MeleeOutcome.STAGGER,
  MeleeOutcome.LIGHT_WOUND, MeleeOutcome.LIGHT_WOUND,
  MeleeOutcome.SERIOUS_WOUND, MeleeOutcome.SERIOUS_WOUND
];

// DEF3B: defender strength > 2, roughly even
const DEF3B: MeleeOutcomeType[] = [
  MeleeOutcome.MISSED, MeleeOutcome.MISSED, MeleeOutcome.MISSED,
  MeleeOutcome.STAGGER, MeleeOutcome.STAGGER,
  MeleeOutcome.LIGHT_WOUND, MeleeOutcome.LIGHT_WOUND, MeleeOutcome.LIGHT_WOUND,
  MeleeOutcome.SERIOUS_WOUND, MeleeOutcome.SERIOUS_WOUND, MeleeOutcome.SERIOUS_WOUND
];

// DEF3C: defender strength > 2, attacker stronger
const DEF3C: MeleeOutcomeType[] = [
  MeleeOutcome.MISSED,
  MeleeOutcome.STAGGER, MeleeOutcome.STAGGER,
  MeleeOutcome.LIGHT_WOUND, MeleeOutcome.LIGHT_WOUND, MeleeOutcome.LIGHT_WOUND, MeleeOutcome.LIGHT_WOUND,
  MeleeOutcome.SERIOUS_WOUND, MeleeOutcome.SERIOUS_WOUND, MeleeOutcome.SERIOUS_WOUND
];

// ============= Indexed Table Construction (dung.355:1126-1130) =============
//
// MDL uses <REST array N> to create offset views into the same array.
// We replicate this by slicing 9-element windows from each raw array.
//
// DEF1-RES[ATT] where ATT is clamped to 1-3:
//   [1] = DEF1[0..8], [2] = DEF1[1..9], [3] = DEF1[2..10]
//
// DEF2-RES[ATT] where ATT is clamped to 1-4:
//   [1] = DEF2A[0..8], [2] = DEF2B[0..8], [3] = DEF2B[1..9], [4] = DEF2B[2..10]
//
// DEF3-RES[idx] where idx = clamp(ATT-DEF, -2, +2) + 3, giving 1-5:
//   [1] = DEF3A[0..8], [2] = DEF3A[1..9], [3] = DEF3B[0..8],
//   [4] = DEF3B[1..9], [5] = DEF3C[0..8]

const SUBTABLE_SIZE = 9;

function window(arr: MeleeOutcomeType[], offset: number): MeleeOutcomeType[] {
  return arr.slice(offset, offset + SUBTABLE_SIZE);
}

/** DEF=1 tables, indexed by ATT (1-based, clamped to 1-3) */
export const DEF1_RES: MeleeOutcomeType[][] = [
  window(DEF1, 0),  // ATT=1
  window(DEF1, 1),  // ATT=2
  window(DEF1, 2),  // ATT=3+
];

/** DEF=2 tables, indexed by ATT (1-based, clamped to 1-4) */
export const DEF2_RES: MeleeOutcomeType[][] = [
  window(DEF2A, 0), // ATT=1
  window(DEF2B, 0), // ATT=2
  window(DEF2B, 1), // ATT=3
  window(DEF2B, 2), // ATT=4+
];

/** DEF>2 tables, indexed by (ATT-DEF+3), clamped to 1-5 */
export const DEF3_RES: MeleeOutcomeType[][] = [
  window(DEF3A, 0), // ATT-DEF = -2 (defender much stronger)
  window(DEF3A, 1), // ATT-DEF = -1
  window(DEF3B, 0), // ATT-DEF =  0 (even)
  window(DEF3B, 1), // ATT-DEF = +1
  window(DEF3C, 0), // ATT-DEF = +2 (attacker much stronger)
];

/**
 * Look up the result sub-table for given attacker and defender strength.
 *
 * Returns a 9-element array from which one entry is picked at random.
 *
 * Implements melee.137:213-223 (table selection logic in BLOW function).
 */
export function getResultTable(att: number, def: number): MeleeOutcomeType[] {
  if (def === 1) {
    const idx = Math.min(att, 3) - 1;
    return DEF1_RES[Math.max(0, idx)];
  }
  if (def === 2) {
    const idx = Math.min(att, 4) - 1;
    return DEF2_RES[Math.max(0, idx)];
  }
  // def > 2
  const diff = Math.max(-2, Math.min(2, att - def));
  const idx = diff + 2; // maps -2..+2 to 0..4
  return DEF3_RES[idx];
}
