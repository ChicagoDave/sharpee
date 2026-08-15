/**
 * Unit tests for influence system (ADR-146)
 *
 * Covers: influence evaluator, resistance checks, duration tracking,
 * PC influence handling.
 *
 * Owner context: @sharpee/character / influence
 */

import {
  InfluenceDef,
  ResistanceDef,
  InfluenceRoomEntity,
  checkResistance,
  evaluatePassiveInfluences,
  evaluateActiveInfluence,
  trackInfluence,
  isUnderInfluence,
  expireInfluencesForTurn,
  expireInfluencesOnDeparture,
  evaluatePcInfluence,
} from '../../src/influence';
import { CharacterModelTrait, ICharacterModelData } from '@sharpee/world-model';

function makeTrait(): CharacterModelTrait {
  return new CharacterModelTrait();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntity(
  id: string,
  influences: InfluenceDef[] = [],
  resistances: ResistanceDef[] = [],
  predicates: Record<string, boolean> = {},
): InfluenceRoomEntity {
  return {
    id,
    influences,
    resistances,
    evaluatePredicate: (pred: string) => predicates[pred] ?? false,
  };
}

const SEDUCTION: InfluenceDef = {
  name: 'seduction',
  mode: 'passive',
  range: 'proximity',
  effect: { focus: 'clouded', mood: 'distracted' },
  duration: 'while present',
  witnessed: 'ginger-brushes-against-{target}',
  resisted: 'ginger-brushes-against-{target}-no-effect',
};

const INTIMIDATION: InfluenceDef = {
  name: 'intimidation',
  mode: 'active',
  range: 'targeted',
  effect: { propagation: 'mute', mood: 'fearful' },
  duration: 'momentary',
  witnessed: 'colonel-looms-over-{target}',
  resisted: 'colonel-looms-over-{target}-unfazed',
};

const CALMING: InfluenceDef = {
  name: 'calming',
  mode: 'passive',
  range: 'room',
  effect: { mood: 'at ease' },
  duration: 'while present',
  witnessed: 'priest-presence-calms-{target}',
};

// =========================================================================
// Resistance checks
// =========================================================================

describe('checkResistance', () => {
  test('no resistance — influence succeeds', () => {
    const target = makeEntity('james');
    expect(checkResistance(target, 'seduction')).toBe(false);
  });

  test('unconditional resistance — influence blocked', () => {
    const target = makeEntity('james', [], [
      { influenceName: 'seduction' },
    ]);
    expect(checkResistance(target, 'seduction')).toBe(true);
  });

  test('resistance with except — resists when except condition not met', () => {
    const target = makeEntity('margaret', [], [
      { influenceName: 'seduction', except: ['from female'] },
    ], { 'from female': false });
    expect(checkResistance(target, 'seduction')).toBe(true);
  });

  test('resistance with except — vulnerable when except condition met', () => {
    const target = makeEntity('margaret', [], [
      { influenceName: 'seduction', except: ['from female'] },
    ], { 'from female': true });
    expect(checkResistance(target, 'seduction')).toBe(false);
  });

  test('resistance to one influence does not block another', () => {
    const target = makeEntity('detective', [], [
      { influenceName: 'intimidation' },
    ]);
    expect(checkResistance(target, 'intimidation')).toBe(true);
    expect(checkResistance(target, 'seduction')).toBe(false);
  });
});

// =========================================================================
// Passive influence evaluation
// =========================================================================

describe('evaluatePassiveInfluences', () => {
  test('applies passive influence to all room entities', () => {
    const ginger = makeEntity('ginger', [SEDUCTION]);
    const james = makeEntity('james');
    const player = makeEntity('player');

    const results = evaluatePassiveInfluences([ginger, james, player]);

    const applied = results.filter(r => r.status === 'applied');
    expect(applied).toHaveLength(2);
    expect(applied[0].status === 'applied' && applied[0].targetId).toBe('james');
    expect(applied[1].status === 'applied' && applied[1].targetId).toBe('player');
  });

  test('resistance blocks the effect and produces resisted result', () => {
    const ginger = makeEntity('ginger', [SEDUCTION]);
    const james = makeEntity('james', [], [{ influenceName: 'seduction' }]);

    const results = evaluatePassiveInfluences([ginger, james]);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('resisted');
    if (results[0].status === 'resisted') {
      expect(results[0].targetId).toBe('james');
      expect(results[0].resisted).toBe('ginger-brushes-against-{target}-no-effect');
    }
  });

  test('room-wide aura affects all entities', () => {
    const priest = makeEntity('priest', [CALMING]);
    const james = makeEntity('james');
    const margaret = makeEntity('margaret');

    const results = evaluatePassiveInfluences([priest, james, margaret]);
    const applied = results.filter(r => r.status === 'applied');
    expect(applied).toHaveLength(2);
  });

  test('influencer does not influence themselves', () => {
    const ginger = makeEntity('ginger', [SEDUCTION]);
    const results = evaluatePassiveInfluences([ginger]);
    expect(results).toHaveLength(0);
  });

  test('active influences are skipped during passive evaluation', () => {
    const colonel = makeEntity('colonel', [INTIMIDATION]);
    const gardener = makeEntity('gardener');

    const results = evaluatePassiveInfluences([colonel, gardener]);
    expect(results).toHaveLength(0);
  });

  test('schedule not met — influence skipped', () => {
    const scheduled: InfluenceDef = {
      ...SEDUCTION,
      schedule: { when: ['alone with target'] },
    };
    const ginger = makeEntity('ginger', [scheduled], [], { 'alone with target': false });
    const james = makeEntity('james');

    const results = evaluatePassiveInfluences([ginger, james]);
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('skipped');
  });

  test('schedule met — influence applied', () => {
    const scheduled: InfluenceDef = {
      ...SEDUCTION,
      schedule: { when: ['alone with target'] },
    };
    const ginger = makeEntity('ginger', [scheduled], [], { 'alone with target': true });
    const james = makeEntity('james');

    const results = evaluatePassiveInfluences([ginger, james]);
    const applied = results.filter(r => r.status === 'applied');
    expect(applied).toHaveLength(1);
  });

  test('except condition makes resistance conditional', () => {
    const ginger = makeEntity('ginger', [SEDUCTION]);
    // Margaret resists seduction except from female — and 'from female' is true
    const margaret = makeEntity('margaret', [], [
      { influenceName: 'seduction', except: ['from female'] },
    ], { 'from female': true });

    const results = evaluatePassiveInfluences([ginger, margaret]);
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('applied');
  });

  test('applied result includes correct effect and witnessed message', () => {
    const ginger = makeEntity('ginger', [SEDUCTION]);
    const james = makeEntity('james');

    const results = evaluatePassiveInfluences([ginger, james]);
    expect(results[0].status).toBe('applied');
    if (results[0].status === 'applied') {
      expect(results[0].effect).toEqual({ focus: 'clouded', mood: 'distracted' });
      expect(results[0].witnessed).toBe('ginger-brushes-against-{target}');
    }
  });
});

// =========================================================================
// Active influence evaluation
// =========================================================================

describe('evaluateActiveInfluence', () => {
  test('applies active influence to specific target', () => {
    const colonel = makeEntity('colonel', [INTIMIDATION]);
    const gardener = makeEntity('gardener');

    const result = evaluateActiveInfluence(colonel, 'intimidation', gardener);
    expect(result.status).toBe('applied');
    if (result.status === 'applied') {
      expect(result.effect).toEqual({ propagation: 'mute', mood: 'fearful' });
      expect(result.witnessed).toBe('colonel-looms-over-{target}');
    }
  });

  test('target resists active influence', () => {
    const colonel = makeEntity('colonel', [INTIMIDATION]);
    const detective = makeEntity('detective', [], [{ influenceName: 'intimidation' }]);

    const result = evaluateActiveInfluence(colonel, 'intimidation', detective);
    expect(result.status).toBe('resisted');
  });

  test('unknown influence name returns skipped', () => {
    const colonel = makeEntity('colonel', [INTIMIDATION]);
    const gardener = makeEntity('gardener');

    const result = evaluateActiveInfluence(colonel, 'charm', gardener);
    expect(result.status).toBe('skipped');
  });
});

// =========================================================================
// Influence duration (trait-based, ADR-310 D17)
// =========================================================================

describe('influence duration — trait-based', () => {
  test('tracks and queries effects on the home trait', () => {
    const jamesTrait = makeTrait();
    trackInfluence(jamesTrait, 'seduction', 'ginger', { focus: 'clouded' }, { duration: 'while present', turn: 1 });

    expect(isUnderInfluence(jamesTrait, 'seduction')).toBe(true);
    expect(isUnderInfluence(makeTrait(), 'seduction')).toBe(false);
    expect(jamesTrait.influencesInForce).toHaveLength(1);
    expect(jamesTrait.influencesInForce[0].influencerId).toBe('ginger');
  });

  test('player-targeted effects ride the exerter trait with explicit target', () => {
    const gingerTrait = makeTrait();
    trackInfluence(gingerTrait, 'seduction', 'ginger', { focus: 'clouded' },
      { duration: 'while present', turn: 1, target: 'player' });

    expect(gingerTrait.influencesInForce[0].target).toBe('player');
  });

  test('does not double-track same influence/influencer/target', () => {
    const trait = makeTrait();
    const first = trackInfluence(trait, 'seduction', 'ginger', { focus: 'clouded' }, { duration: 'while present', turn: 1 });
    const second = trackInfluence(trait, 'seduction', 'ginger', { focus: 'clouded' }, { duration: 'while present', turn: 2 });

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(trait.influencesInForce).toHaveLength(1);
  });

  test('expireInfluencesOnDeparture clears "while present" effects from that influencer', () => {
    const trait = makeTrait();
    trackInfluence(trait, 'seduction', 'ginger', { focus: 'clouded' }, { duration: 'while present', turn: 1 });
    trackInfluence(trait, 'calming', 'priest', { mood: 'at ease' }, { duration: 'while present', turn: 1 });

    const expired = expireInfluencesOnDeparture(trait, 'ginger');
    expect(expired).toHaveLength(1);
    expect(isUnderInfluence(trait, 'seduction')).toBe(false);
    expect(isUnderInfluence(trait, 'calming')).toBe(true);
  });

  test('expireInfluencesOnDeparture does not clear momentary or lingering effects', () => {
    const trait = makeTrait();
    trackInfluence(trait, 'intimidation', 'colonel', { mood: 'fearful' }, { duration: 'momentary', turn: 1 });
    trackInfluence(trait, 'curse', 'witch', { mood: 'anxious' }, { duration: 'lingering', turn: 1, lingeringTurns: 5 });

    const expired = expireInfluencesOnDeparture(trait, 'colonel');
    expect(expired).toHaveLength(0);
    expect(trait.influencesInForce).toHaveLength(2);
  });

  test('expireInfluencesForTurn clears momentary effects after one turn', () => {
    const trait = makeTrait();
    trackInfluence(trait, 'intimidation', 'colonel', { mood: 'fearful' }, { duration: 'momentary', turn: 5 });

    // Same turn — not expired yet
    let expired = expireInfluencesForTurn(trait, 5);
    expect(expired).toHaveLength(0);

    // Next turn — expired
    expired = expireInfluencesForTurn(trait, 6);
    expect(expired).toHaveLength(1);
    expect(trait.influencesInForce).toHaveLength(0);
  });

  test('expireInfluencesForTurn clears lingering effects after authored turns', () => {
    const trait = makeTrait();
    trackInfluence(trait, 'curse', 'witch', { mood: 'anxious' }, { duration: 'lingering', turn: 10, lingeringTurns: 3 });

    // Turn 12 — not expired yet
    let expired = expireInfluencesForTurn(trait, 12);
    expect(expired).toHaveLength(0);

    // Turn 13 (10 + 3) — expired
    expired = expireInfluencesForTurn(trait, 13);
    expect(expired).toHaveLength(1);
    expect(trait.influencesInForce).toHaveLength(0);
  });

  test('expireInfluencesForTurn clears lingering effects when clear condition met', () => {
    const trait = makeTrait();
    trackInfluence(trait, 'curse', 'witch', { mood: 'anxious' }, { duration: 'lingering', turn: 10, clearCondition: 'has holy water' });

    // Condition not met
    let expired = expireInfluencesForTurn(trait, 15, () => false);
    expect(expired).toHaveLength(0);

    // Condition met
    expired = expireInfluencesForTurn(trait, 16, (effect, pred) =>
      effect.influenceName === 'curse' && pred === 'has holy water',
    );
    expect(expired).toHaveLength(1);
    expect(trait.influencesInForce).toHaveLength(0);
  });

  test('effects in force ride the trait through a JSON round-trip', () => {
    const trait = makeTrait();
    trackInfluence(trait, 'seduction', 'ginger', { focus: 'clouded' },
      { duration: 'while present', turn: 1, target: 'player' });
    trackInfluence(trait, 'intimidation', 'colonel', { mood: 'fearful' }, { duration: 'momentary', turn: 5 });

    const restored = new CharacterModelTrait(
      JSON.parse(JSON.stringify(trait)) as ICharacterModelData,
    );

    expect(restored.influencesInForce).toHaveLength(2);
    expect(isUnderInfluence(restored, 'seduction')).toBe(true);
    expect(isUnderInfluence(restored, 'intimidation')).toBe(true);
    expect(restored.influencesInForce[0].target).toBe('player');
  });
});

// =========================================================================
// PC influence
// =========================================================================

describe('evaluatePcInfluence', () => {
  test('returns clear when player has no active effects', () => {
    const result = evaluatePcInfluence('player', [], new Map());
    expect(result.status).toBe('clear');
  });

  test('intercepts when focus is clouded', () => {
    const gingerTrait = makeTrait();
    trackInfluence(gingerTrait, 'seduction', 'ginger', { focus: 'clouded', mood: 'distracted' },
      { duration: 'while present', turn: 1, target: 'player' });

    const defs = new Map<string, InfluenceDef[]>();
    defs.set('ginger', [SEDUCTION]);

    const result = evaluatePcInfluence('player', gingerTrait.influencesInForce, defs);
    expect(result.status).toBe('intercepted');
    if (result.status === 'intercepted') {
      expect(result.clearConversationContext).toBe(true);
      expect(result.onPlayerAction).toBe(SEDUCTION.onPlayerAction);
    }
  });

  test('intercepts when influence has onPlayerAction', () => {
    const influenceWithAction: InfluenceDef = {
      ...SEDUCTION,
      effect: { mood: 'distracted' }, // no focus: clouded
      onPlayerAction: 'ginger-distracts-from-{action}',
    };
    const gingerTrait = makeTrait();
    trackInfluence(gingerTrait, 'seduction', 'ginger', { mood: 'distracted' },
      { duration: 'while present', turn: 1, target: 'player' });

    const defs = new Map<string, InfluenceDef[]>();
    defs.set('ginger', [influenceWithAction]);

    const result = evaluatePcInfluence('player', gingerTrait.influencesInForce, defs);
    expect(result.status).toBe('intercepted');
    if (result.status === 'intercepted') {
      expect(result.onPlayerAction).toBe('ginger-distracts-from-{action}');
      expect(result.clearConversationContext).toBe(false);
    }
  });

  test('returns clear when effect does not intercept', () => {
    // Effect with mood change only, no focus:clouded, no onPlayerAction
    const calmInfluence: InfluenceDef = {
      ...CALMING,
      onPlayerAction: undefined,
    };
    const priestTrait = makeTrait();
    trackInfluence(priestTrait, 'calming', 'priest', { mood: 'at ease' },
      { duration: 'while present', turn: 1, target: 'player' });

    const defs = new Map<string, InfluenceDef[]>();
    defs.set('priest', [calmInfluence]);

    const result = evaluatePcInfluence('player', priestTrait.influencesInForce, defs);
    expect(result.status).toBe('clear');
  });

  test('ignores effects targeting someone else', () => {
    const gingerTrait = makeTrait();
    // Effect on an NPC target rides the target's trait with no target field;
    // this one is exerter-homed but aimed at james, not the player
    trackInfluence(gingerTrait, 'seduction', 'ginger', { focus: 'clouded' },
      { duration: 'while present', turn: 1, target: 'james' });

    const defs = new Map<string, InfluenceDef[]>();
    defs.set('ginger', [SEDUCTION]);

    const result = evaluatePcInfluence('player', gingerTrait.influencesInForce, defs);
    expect(result.status).toBe('clear');
  });
});
