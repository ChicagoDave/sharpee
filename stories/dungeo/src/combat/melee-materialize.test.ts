/**
 * Tests for the forced-path melee representatives (ADR-293 D8, Phase C):
 * meleeOutcomeFromClass is the total inverse of meleeOutcomeClass, and
 * materializeBlow carries exactly the consequences a drawn blow does —
 * including D10's hero/villain UNCONSCIOUS asymmetry — because it shares
 * applyOutcomeToResult with resolveBlow's tail.
 */

import { describe, it, expect } from 'vitest';
import type { SeededRandom } from '@sharpee/core';
import { MeleeOutcome, MeleeOutcomeType } from './melee-tables';
import { materializeBlow, resolveBlow } from './melee';
import { meleeOutcomeClass, meleeOutcomeFromClass } from './melee-points';

/** A stub stream whose table roll is fixed and whose stagger escalation never fires. */
function fixedRoll(index: number): SeededRandom {
  return {
    next: () => 0,
    int: () => index,
    chance: () => false,
    pick: <T>(array: T[]) => array[0],
    shuffle: <T>(array: T[]) => array,
    getSeed: () => 0,
    setSeed: () => {},
  };
}

describe('meleeOutcomeFromClass (the forced-path inverse)', () => {
  it('round-trips every declared outcome', () => {
    for (const outcome of Object.values(MeleeOutcome) as MeleeOutcomeType[]) {
      expect(meleeOutcomeFromClass(meleeOutcomeClass(outcome))).toBe(outcome);
    }
  });
});

describe('the shared consequence contract: drawn ≡ forced (D8)', () => {
  it('every table outcome reachable by a stubbed roll produces the same result as materializeBlow', () => {
    // Sweep table indices for several (att, def) shapes; whatever outcome the
    // drawn path lands on, the forced path must build the identical result —
    // this pins applyOutcomeToResult as the ONE consequence implementation.
    const shapes: Array<[number, number, boolean]> = [
      [1, 1, false], // DEF1 window (KILLED/UNCONSCIOUS territory)
      [5, 2, false], // DEF2B window
      [3, 3, true], // DEF3, hero attacking (UNCONSCIOUS negation asymmetry)
      [3, 3, false], // DEF3, villain attacking
    ];
    const outcomesSeen = new Set<MeleeOutcomeType>();

    for (const [att, def, isHero] of shapes) {
      for (let index = 0; index < 9; index++) {
        const drawn = resolveBlow(att, def, isHero, false, fixedRoll(index));
        outcomesSeen.add(drawn.outcome);
        expect(drawn).toEqual(materializeBlow(drawn.outcome, def, isHero));
      }
    }

    // The sweep genuinely covered a spread of outcomes, not one row repeated.
    expect(outcomesSeen.size).toBeGreaterThanOrEqual(5);
  });

  it('the vsUnconscious remap outcomes match too (HESITATE / SITTING_DUCK)', () => {
    for (let index = 0; index < 9; index++) {
      const drawn = resolveBlow(3, 3, false, true, fixedRoll(index));
      expect([MeleeOutcome.HESITATE, MeleeOutcome.SITTING_DUCK]).toContain(drawn.outcome);
      expect(drawn).toEqual(materializeBlow(drawn.outcome, 3, false));
    }
  });
});

describe('materializeBlow (zero-draw representatives with real consequences)', () => {
  it('SERIOUS_WOUND reduces defender strength by 2 and kills at zero', () => {
    expect(materializeBlow(MeleeOutcome.SERIOUS_WOUND, 3, false)).toMatchObject({
      outcome: MeleeOutcome.SERIOUS_WOUND,
      newDefenderStrength: 1,
      defenderKilled: false,
    });
    expect(materializeBlow(MeleeOutcome.SERIOUS_WOUND, 2, false)).toMatchObject({
      newDefenderStrength: 0,
      defenderKilled: true,
    });
  });

  it('LIGHT_WOUND reduces defender strength by 1 — the base-2 wound-spiral step', () => {
    expect(materializeBlow(MeleeOutcome.LIGHT_WOUND, 2, false)).toMatchObject({
      newDefenderStrength: 1,
      defenderKilled: false,
    });
  });

  it('KILLED zeroes strength and sets defenderKilled', () => {
    expect(materializeBlow(MeleeOutcome.KILLED, 5, false)).toMatchObject({
      newDefenderStrength: 0,
      defenderKilled: true,
    });
  });

  it("UNCONSCIOUS negates defender strength only for hero blows (D10's asymmetry)", () => {
    expect(materializeBlow(MeleeOutcome.UNCONSCIOUS, 3, true)).toMatchObject({
      newDefenderStrength: -3,
      defenderUnconscious: true,
    });
    expect(materializeBlow(MeleeOutcome.UNCONSCIOUS, 3, false)).toMatchObject({
      newDefenderStrength: 3,
      defenderUnconscious: true,
    });
  });

  it('STAGGER and LOSE_WEAPON set their flags without touching strength', () => {
    expect(materializeBlow(MeleeOutcome.STAGGER, 3, false)).toMatchObject({
      newDefenderStrength: 3,
      defenderStaggered: true,
    });
    expect(materializeBlow(MeleeOutcome.LOSE_WEAPON, 3, true)).toMatchObject({
      newDefenderStrength: 3,
      defenderLostWeapon: true,
    });
  });

  it('MISSED and HESITATE are no-ops on the defender', () => {
    for (const outcome of [MeleeOutcome.MISSED, MeleeOutcome.HESITATE]) {
      expect(materializeBlow(outcome, 4, false)).toMatchObject({
        newDefenderStrength: 4,
        defenderStaggered: false,
        defenderLostWeapon: false,
        defenderKilled: false,
        defenderUnconscious: false,
      });
    }
  });

  it('SITTING_DUCK kills (the vsUnconscious lethal remap)', () => {
    expect(materializeBlow(MeleeOutcome.SITTING_DUCK, 3, false)).toMatchObject({
      newDefenderStrength: 0,
      defenderKilled: true,
    });
  });
});
