/**
 * Save/restore round-trip tests (ADR-310 D17)
 *
 * Verifies that all mutable character state — goal progress, influence
 * effects in force, told-records — rides CharacterModelTrait through a
 * JSON round-trip, and that a fresh CharacterPhaseRegistry (authored
 * configs only, no serialization path of its own) continues from the
 * restored traits.
 *
 * Owner context: @sharpee/character / tick-phases
 */

import { CharacterModelTrait, ICharacterModelData } from '@sharpee/world-model';
import { CharacterPhaseRegistry } from '../../src/tick-phases';
import { trackInfluence, isUnderInfluence } from '../../src/influence';
import { GoalDef } from '../../src/goals/goal-types';

const FIND_WEAPON: GoalDef = {
  id: 'find-weapon',
  activatesWhen: ['threatened'],
  priority: 'high',
  mode: 'sequential',
  steps: [
    { type: 'moveTo', target: 'study' },
    { type: 'acquire', target: 'knife' },
  ],
};

function roundTrip(trait: CharacterModelTrait): CharacterModelTrait {
  return new CharacterModelTrait(JSON.parse(JSON.stringify(trait)) as ICharacterModelData);
}

describe('character state save/restore (ADR-310 D17)', () => {
  test('registry holds no serializable state — no toJSON/restoreState', () => {
    const registry = new CharacterPhaseRegistry();
    expect((registry as any).toJSON).toBeUndefined();
    expect((registry as any).restoreState).toBeUndefined();
  });

  test('goal progress rides the trait; a fresh registry continues mid-sequence', () => {
    const registry = new CharacterPhaseRegistry();
    registry.register('colonel', { goalDefs: [FIND_WEAPON] });

    const trait = new CharacterModelTrait({ threat: 'threatened' });
    const manager = registry.getGoalManager('colonel')!;
    manager.evaluate(trait);
    manager.advanceStep(trait, 'find-weapon'); // moveTo done → step 1 (acquire)

    const restoredTrait = roundTrip(trait);

    // A brand-new registry re-registers only authored configs
    const registry2 = new CharacterPhaseRegistry();
    registry2.register('colonel', { goalDefs: [FIND_WEAPON] });
    const manager2 = registry2.getGoalManager('colonel')!;

    expect(manager2.isActive(restoredTrait, 'find-weapon')).toBe(true);
    expect(manager2.getTopGoal(restoredTrait)!.state.currentStep).toBe(1);
  });

  test('influence effects in force ride the trait, player-target records included', () => {
    const gingerTrait = new CharacterModelTrait();
    trackInfluence(gingerTrait, 'seduction', 'ginger', { focus: 'clouded' },
      { duration: 'while present', turn: 5, target: 'player' });

    const jamesTrait = new CharacterModelTrait();
    trackInfluence(jamesTrait, 'seduction', 'ginger', { focus: 'clouded' },
      { duration: 'while present', turn: 5 });

    const restoredGinger = roundTrip(gingerTrait);
    const restoredJames = roundTrip(jamesTrait);

    expect(restoredGinger.influencesInForce[0].target).toBe('player');
    expect(isUnderInfluence(restoredJames, 'seduction')).toBe(true);
  });

  test('told-records ride the speaker trait', () => {
    const maidTrait = new CharacterModelTrait();
    maidTrait.recordTold('cook', 'murder');
    maidTrait.recordTold('cook', 'weapon');

    const cookTrait = new CharacterModelTrait();
    cookTrait.recordTold('colonel', 'murder');

    const restoredMaid = roundTrip(maidTrait);
    const restoredCook = roundTrip(cookTrait);

    expect(restoredMaid.hasTold('cook', 'murder')).toBe(true);
    expect(restoredMaid.hasTold('cook', 'weapon')).toBe(true);
    expect(restoredCook.hasTold('colonel', 'murder')).toBe(true);
    expect(restoredMaid.hasTold('colonel', 'murder')).toBe(false);
  });

  test('a trait with no character activity round-trips to defaults', () => {
    const restored = roundTrip(new CharacterModelTrait());

    expect(restored.goalState).toEqual({});
    expect(restored.influencesInForce).toEqual([]);
    expect(restored.told).toEqual({});
  });
});
