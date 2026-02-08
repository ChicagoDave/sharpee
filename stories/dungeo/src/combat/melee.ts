/**
 * Canonical MDL Melee Combat Engine (melee.137)
 *
 * Implements the Mainframe Zork combat system with:
 * - Score-scaled player strength (FIGHT-STRENGTH)
 * - Villain strength with best-weapon and engrossed modifiers (VILLAIN-STRENGTH)
 * - Table-based blow resolution (BLOW)
 * - 9 outcome types: missed, unconscious, killed, light wound, serious wound,
 *   stagger, lose weapon, hesitate, sitting duck
 * - Combat disengagement (villain heals, player keeps wounds)
 * - Wound healing daemon (CURE-CLOCK, 30 turns per point)
 * - WINNING? function for thief fight/flee AI
 *
 * Source: docs/internal/dungeon-81/original_source/melee.137
 *         docs/internal/dungeon-81/original_source/dung.355
 *
 * This is a pure story-level module — no platform changes required.
 */

import { SeededRandom } from '@sharpee/core';
import { MeleeOutcome, MeleeOutcomeType, getResultTable } from './melee-tables';

export { MeleeOutcome, MeleeOutcomeType };

// ============= Constants (melee.137:32-36) =============

/** Minimum player base combat strength (at score 0) */
export const STRENGTH_MIN = 2;

/** Maximum player base combat strength (at SCORE_MAX) */
export const STRENGTH_MAX = 7;

/** Total achievable score (pre-thief-death) — used for strength scaling */
export const SCORE_MAX = 616;

/** Turns to heal one wound point */
export const CURE_WAIT = 30;

// ============= Villain Data =============

/** Canonical OSTRENGTH values from dung.355 */
export const VILLAIN_OSTRENGTH = {
  TROLL: 2,     // dung.355:5837
  THIEF: 5,     // dung.355:5764
  CYCLOPS: 10000, // dung.355:4720 — invincible in combat
} as const;

/**
 * Best-weapon configuration (dung.355:6506-6508).
 * Maps villain entity name → { weaponName, penalty }.
 * When attacking a villain with their best-weapon, reduce OSTRENGTH by penalty.
 */
export interface BestWeaponEntry {
  villainName: string;
  weaponName: string;
  penalty: number;
}

export const BEST_WEAPONS: BestWeaponEntry[] = [
  { villainName: 'troll', weaponName: 'sword', penalty: 1 },
  { villainName: 'thief', weaponName: 'knife', penalty: 1 },
];

// ============= Types =============

/**
 * Result of a single blow resolution.
 */
export interface BlowResult {
  /** The raw outcome from the table */
  outcome: MeleeOutcomeType;
  /** New defender strength after applying the outcome */
  newDefenderStrength: number;
  /** Whether the defender was staggered */
  defenderStaggered: boolean;
  /** Whether the defender lost their weapon */
  defenderLostWeapon: boolean;
  /** Whether the defender was killed */
  defenderKilled: boolean;
  /** Whether the defender was knocked unconscious */
  defenderUnconscious: boolean;
}

/**
 * Parameters for the WINNING? function (thief fight/flee AI).
 */
export interface WinningParams {
  villainStrength: number;
  heroFightStrength: number;
  random: SeededRandom;
}

// ============= Core Functions =============

/**
 * Calculate player's combat strength (FIGHT-STRENGTH, melee.137:138-149).
 *
 * Formula: base = SMIN + floor(0.5 + (SMAX - SMIN) * (score / SCORE_MAX))
 * Adjusted: base + woundAdjust (ASTRENGTH)
 *
 * @param score Current player score
 * @param woundAdjust ASTRENGTH equivalent (0 = healthy, negative = wounded)
 * @param adjust If true (default), apply wound adjustment. If false, return base only.
 * @returns Fight strength (can be 0 or negative if badly wounded)
 */
export function fightStrength(
  score: number,
  woundAdjust: number = 0,
  adjust: boolean = true
): number {
  const base = STRENGTH_MIN + Math.floor(
    0.5 + (STRENGTH_MAX - STRENGTH_MIN) * (score / SCORE_MAX)
  );
  return adjust ? base + woundAdjust : base;
}

/**
 * Calculate villain's effective combat strength (VILLAIN-STRENGTH, melee.137:149-163).
 *
 * @param ostrength Base OSTRENGTH value for the villain
 * @param isThiefEngrossed If true and villain is the thief, cap strength at 2
 * @param usingBestWeapon If true, reduce strength by best-weapon penalty
 * @param bestWeaponPenalty Penalty to subtract when using best weapon (default 1)
 * @returns Effective villain strength (0 = cannot defend, don't attack)
 */
export function villainStrength(
  ostrength: number,
  isThiefEngrossed: boolean = false,
  usingBestWeapon: boolean = false,
  bestWeaponPenalty: number = 1
): number {
  let od = ostrength;

  // If villain is dead/gone (strength <= 0), return 0
  if (od <= 0) return 0;

  // Thief engrossed: capped at min(od, 2) — melee.137:156-157
  if (isThiefEngrossed) {
    od = Math.min(od, 2);
  }

  // Best-weapon bonus: reduce strength — melee.137:158-162
  if (usingBestWeapon) {
    od = Math.max(1, od - bestWeaponPenalty);
  }

  return od;
}

/**
 * Check if the hero is using a villain's best weapon.
 *
 * @param villainName Lowercase villain name (e.g., 'thief', 'troll')
 * @param weaponName Lowercase weapon name being used
 * @returns The penalty value, or 0 if not a best-weapon match
 */
export function getBestWeaponPenalty(villainName: string, weaponName: string): number {
  const entry = BEST_WEAPONS.find(
    bw => villainName.includes(bw.villainName) && weaponName.includes(bw.weaponName)
  );
  return entry?.penalty ?? 0;
}

/**
 * Resolve a single blow (BLOW function, melee.137:167-285).
 *
 * This is the core combat resolution function. It determines the outcome
 * of one attack using the canonical probability tables.
 *
 * @param att Attacker's effective strength
 * @param def Defender's effective strength (before this blow)
 * @param isHeroAttacking True if the player is attacking, false if villain is attacking
 * @param isTargetUnconscious True if the target is already knocked out
 * @param random Seeded random source
 * @returns The blow result with outcome and new defender state
 */
export function resolveBlow(
  att: number,
  def: number,
  isHeroAttacking: boolean,
  isTargetUnconscious: boolean,
  random: SeededRandom
): BlowResult {
  // Ensure minimum attacker strength of 1 (melee.137:183 — MAX 1)
  att = Math.max(1, att);

  const result: BlowResult = {
    outcome: MeleeOutcome.MISSED,
    newDefenderStrength: def,
    defenderStaggered: false,
    defenderLostWeapon: false,
    defenderKilled: false,
    defenderUnconscious: false,
  };

  // If defender strength < 0 (unconscious), automatic kill (melee.137:207-211)
  if (def < 0) {
    result.outcome = MeleeOutcome.KILLED;
    result.newDefenderStrength = 0;
    result.defenderKilled = true;
    return result;
  }

  // If defender strength = 0, attacking is pointless (melee.137:184-188)
  // (This shouldn't normally happen — 0 means dead/removed)
  if (def === 0) {
    result.outcome = MeleeOutcome.MISSED;
    return result;
  }

  // Look up result table and pick random outcome (melee.137:213-224)
  const table = getResultTable(att, def);
  const roll = random.int(0, table.length - 1);
  let outcome = table[roll];

  // Post-processing for unconscious targets (melee.137:225-227)
  // If target is already unconscious: STAGGER→HESITATE, anything else→SITTING_DUCK
  if (isTargetUnconscious) {
    if (outcome === MeleeOutcome.STAGGER) {
      outcome = MeleeOutcome.HESITATE;
    } else {
      outcome = MeleeOutcome.SITTING_DUCK;
    }
  }

  // Stagger can become lose-weapon (melee.137:228-231)
  // 25% chance if hero attacking, 50% chance if villain attacking
  // Only if defender has a weapon (caller must check — we always roll here)
  if (outcome === MeleeOutcome.STAGGER) {
    const loseWeaponChance = isHeroAttacking ? 0.25 : 0.50;
    if (random.chance(loseWeaponChance)) {
      outcome = MeleeOutcome.LOSE_WEAPON;
    }
  }

  result.outcome = outcome;

  // Apply outcome to defender strength (melee.137:236-254)
  switch (outcome) {
    case MeleeOutcome.MISSED:
    case MeleeOutcome.HESITATE:
      // No effect on defender strength
      break;

    case MeleeOutcome.UNCONSCIOUS:
      // Defender goes unconscious — strength becomes negative (melee.137:237-238)
      if (isHeroAttacking) {
        result.newDefenderStrength = -def;
      }
      result.defenderUnconscious = true;
      break;

    case MeleeOutcome.KILLED:
    case MeleeOutcome.SITTING_DUCK:
      // Defender dies (melee.137:239)
      result.newDefenderStrength = 0;
      result.defenderKilled = true;
      break;

    case MeleeOutcome.LIGHT_WOUND:
      // Reduce defender strength by 1 (melee.137:240)
      result.newDefenderStrength = Math.max(0, def - 1);
      if (result.newDefenderStrength === 0) {
        result.defenderKilled = true;
      }
      break;

    case MeleeOutcome.SERIOUS_WOUND:
      // Reduce defender strength by 2 (melee.137:241)
      result.newDefenderStrength = Math.max(0, def - 2);
      if (result.newDefenderStrength === 0) {
        result.defenderKilled = true;
      }
      break;

    case MeleeOutcome.STAGGER:
      // Defender misses next turn (melee.137:242-244)
      result.defenderStaggered = true;
      break;

    case MeleeOutcome.LOSE_WEAPON:
      // Defender drops weapon (melee.137:245-254)
      result.defenderLostWeapon = true;
      break;
  }

  return result;
}

/**
 * Check if the hero would die from a wound (melee.137:261-266).
 *
 * After a villain blow reduces the hero's defense, check if the hero's
 * total fight-strength (base + new wound adjustment) drops to 0 or below.
 *
 * @param score Current player score
 * @param newWoundAdjust The wound adjustment AFTER this blow
 * @returns True if the hero is dead
 */
export function isHeroDeadFromWounds(score: number, newWoundAdjust: number): boolean {
  return fightStrength(score, newWoundAdjust, true) <= 0;
}

/**
 * Calculate new wound adjustment after a villain's blow lands.
 *
 * When a villain attacks the hero:
 * - DEF = FIGHT-STRENGTH(hero) before blow
 * - After blow, DEF may be reduced (wound, unconscious, etc.)
 * - new_ASTRENGTH = newDef - originalDef (where originalDef came from base score)
 *
 * This is a simplified version of melee.137:256-257:
 *   PUT HERO ASTRENGTH (COND ((0? DEF) -10000) ((- DEF OD)))
 * where OD = FIGHT-STRENGTH(hero, no_adjust).
 *
 * @param currentWoundAdjust Current ASTRENGTH
 * @param blowResult The result of the villain's blow
 * @param baseFightStrength FIGHT-STRENGTH with no adjustment (base only)
 * @returns New wound adjustment value
 */
export function applyVillainBlowToHero(
  currentWoundAdjust: number,
  blowResult: BlowResult,
  baseFightStrength: number
): number {
  if (blowResult.defenderKilled) {
    return -10000; // Dead
  }

  // The new total DEF after the blow
  const newDef = blowResult.newDefenderStrength;

  // ASTRENGTH = newDef - baseFightStrength
  // (baseFightStrength is the unadjusted base — what DEF would be at full health)
  return newDef - baseFightStrength;
}

/**
 * Heal one wound point (CURE-CLOCK, melee.137:295-300).
 *
 * Called by the cure daemon every CURE_WAIT turns.
 *
 * @param woundAdjust Current ASTRENGTH
 * @returns New ASTRENGTH and whether healing is complete
 */
export function healOneWound(woundAdjust: number): { newWoundAdjust: number; healed: boolean } {
  if (woundAdjust > 0) {
    // Clamp positive to 0 (no bonus from over-healing)
    return { newWoundAdjust: 0, healed: true };
  }
  if (woundAdjust < 0) {
    const newVal = woundAdjust + 1;
    return { newWoundAdjust: newVal, healed: newVal >= 0 };
  }
  // Already at 0 — fully healed
  return { newWoundAdjust: 0, healed: true };
}

/**
 * Get DIAGNOSE output data (melee.137:302-324).
 *
 * @param score Current player score
 * @param woundAdjust Current ASTRENGTH
 * @param cureTicksRemaining Turns remaining on current cure timer (0 if not active)
 * @param deaths Number of times player has died
 * @returns Diagnostic data for message rendering
 */
export function getDiagnosis(
  score: number,
  woundAdjust: number,
  cureTicksRemaining: number,
  deaths: number
): DiagnoseData {
  const base = fightStrength(score, 0, false);
  // Wound depth is the absolute value of negative ASTRENGTH
  const woundDepth = woundAdjust < 0 ? -woundAdjust : 0;
  // Remaining strength = base + woundAdjust (total effective fight-strength)
  const remainingStrength = base + woundAdjust;
  // Total turns to heal: (woundDepth - 1) * CURE_WAIT + cureTicksRemaining
  // (first point uses remaining ticks, subsequent points each take CURE_WAIT)
  const turnsToHeal = woundDepth === 0 ? 0
    : (woundDepth - 1) * CURE_WAIT + cureTicksRemaining;

  return {
    woundDepth,
    remainingStrength,
    turnsToHeal,
    deaths,
  };
}

export interface DiagnoseData {
  /** Number of wound points (0 = healthy) */
  woundDepth: number;
  /** Remaining fight-strength (base + wounds) */
  remainingStrength: number;
  /** Total turns until fully healed */
  turnsToHeal: number;
  /** Number of times player has died */
  deaths: number;
}

// ============= Thief AI: WINNING? (melee.137:287-293) =============

/**
 * Determine if the villain is "winning" against the hero.
 *
 * Used by the thief's fight/flee AI to decide whether to continue combat.
 * Returns two probabilities: attack chance and no-flee chance.
 *
 * PS = villainStrength - heroFightStrength
 *
 * | PS      | Attack% | NoFlee% |
 * |---------|---------|---------|
 * | PS > 3  | 90      | 100     |
 * | PS > 0  | 75      | 85      |
 * | PS = 0  | 50      | 30      |
 * | VS > 1  | 25      | 0       |
 * | else    | 10      | 0       |
 *
 * @returns Object with shouldAttack and shouldStay booleans
 */
export function isVillainWinning(params: WinningParams): { shouldAttack: boolean; shouldStay: boolean } {
  const { villainStrength: vs, heroFightStrength, random } = params;
  const ps = vs - heroFightStrength;

  let attackProb: number;
  let stayProb: number;

  if (ps > 3) {
    attackProb = 90;
    stayProb = 100;
  } else if (ps > 0) {
    attackProb = 75;
    stayProb = 85;
  } else if (ps === 0) {
    attackProb = 50;
    stayProb = 30;
  } else if (vs > 1) {
    attackProb = 25;
    stayProb = 0;
  } else {
    attackProb = 10;
    stayProb = 0;
  }

  return {
    shouldAttack: random.int(1, 100) <= attackProb,
    shouldStay: random.int(1, 100) <= stayProb,
  };
}

// ============= Combat Disengagement (melee.137:84-96) =============

/**
 * State changes when combat is disengaged (player leaves villain's room).
 *
 * Canonical behavior:
 * - FIGHTBIT cleared (combat ends)
 * - Both stagger flags cleared
 * - Villain fully heals (negative OSTRENGTH restored to positive)
 * - Thief engrossed flag cleared
 * - Player wounds are NOT healed (ASTRENGTH persists)
 *
 * @param villainCurrentStrength Current villain strength (may be negative/reduced)
 * @param villainBaseStrength Original OSTRENGTH
 * @returns Reset state values
 */
export function disengageCombat(
  villainCurrentStrength: number,
  villainBaseStrength: number
): { villainStrength: number; heroStaggered: boolean; villainStaggered: boolean } {
  // Villain heals: if strength was reduced (negative), restore to positive
  // melee.137:93-94: if S < 0, OSTRENGTH = -S (restore to positive)
  let restoredStrength = villainCurrentStrength;
  if (restoredStrength < 0) {
    restoredStrength = -restoredStrength;
  }
  // Also ensure we don't exceed base (wounds during this fight are healed)
  restoredStrength = villainBaseStrength;

  return {
    villainStrength: restoredStrength,
    heroStaggered: false,     // melee.137:90 — ATRZ HERO ASTAGGERED
    villainStaggered: false,  // melee.137:91 — TRZ O STAGGERED
  };
}
