/**
 * Integration test story fragment (Phase 7)
 *
 * Constructs 3 NPCs (maid: chatty propagator; cook: selective;
 * colonel: ruthless killer with intimidation) using all four ADR
 * builder APIs and verifies the full pipeline:
 * - Conversation builder (ADR-142)
 * - Propagation builder (ADR-144)
 * - Goal builder (ADR-145)
 * - Influence builder (ADR-146)
 * - CharacterPhaseRegistry + save/restore
 *
 * Owner context: @sharpee/character / Phase 7 integration
 */

import { ConversationBuilder } from '../../src/conversation/builder';
import { applyCharacter } from '../../src/apply';
import { CharacterPhaseRegistry } from '../../src/tick-phases';
import { CharacterModelTrait, IFEntity, EntityType } from '@sharpee/world-model';

/** Create a minimal entity for testing. */
function createStubEntity(id: string, _name: string): IFEntity {
  return new IFEntity(id, EntityType.ACTOR);
}

describe('Integration: 3-NPC mystery fragment', () => {
  // Build all three NPCs
  const maidCompiled = new ConversationBuilder('maid')
    .personality('gossipy', 'nervous')
    .mood('anxious')
    .threat('uneasy')
    .knows('murder', { witnessed: true, confidence: 'certain' })
    .knows('weapon', { confidence: 'suspects' })
    // Conversation
    .topic('murder', { keywords: ['murder', 'killing', 'death'] })
    .when('asked about murder')
      .if('trusts player').tell('maid-saw-murder')
      .otherwise().deflect('maid-changes-subject')
      .done()
    // Propagation — chatty, tells everyone
    .propagation({
      tendency: 'chatty',
      audience: 'anyone',
      pace: 'eager',
      coloring: 'fearful',
      withholds: ['secret-affair'],
    })
    // No goals — maid is passive
    // Movement — knows servant areas
    .movement({ knows: ['kitchen', 'hall', 'servants-quarters'], access: 'all' })
    .compile();

  const cookCompiled = new ConversationBuilder('cook')
    .personality('cautious', 'loyal')
    .mood('calm')
    .threat('safe')
    // Propagation — selective, only shares murder topic
    .propagation({
      tendency: 'selective',
      spreads: ['murder'],
      audience: 'trusted',
      pace: 'gradual',
      coloring: 'conspiratorial',
      receives: 'as belief',
    })
    .movement({ knows: ['kitchen', 'dining-room'], access: 'all' })
    .compile();

  const colonelCompiled = new ConversationBuilder('colonel')
    .personality('ruthless', 'disciplined')
    .mood('calm')
    .threat('dangerous')
    .knows('murder', { witnessed: true, confidence: 'certain' })
    // Goal — eliminate the player once murder is discovered
    .goal('eliminate-player')
      .activatesWhen('murder discovered')
      .priority('critical')
      .mode('prepared')
      .pursues([
        { type: 'moveTo', target: 'study' },
        { type: 'acquire', target: 'letter-opener' },
      ])
      .actsWhen('alone with player')
      .act('colonel-attacks-player')
      .interruptedBy('witness present')
      .onInterrupt('colonel-retreats')
      .resumeOnClear(true)
      .done()
    .movement({ knows: 'all', access: 'all' })
    // Influence — intimidation
    .influence('intimidation')
      .mode('active')
      .range('targeted')
      .effect({ propagation: 'mute', mood: 'fearful' })
      .duration('lingering')
      .lingeringTurns(3)
      .witnessed('colonel-looms-over-{target}')
      .resisted('colonel-looms-over-{target}-unfazed')
      .done()
    // Resistance — resists seduction
    .resistsInfluence('seduction')
    .compile();

  test('all three characters compile with complete configuration', () => {
    // Maid
    expect(maidCompiled.propagationProfile).toBeDefined();
    expect(maidCompiled.propagationProfile!.tendency).toBe('chatty');
    expect(maidCompiled.movementProfile).toBeDefined();
    expect(maidCompiled.goalDefs).toBeUndefined();
    expect(maidCompiled.influenceDefs).toBeUndefined();

    // Cook
    expect(cookCompiled.propagationProfile).toBeDefined();
    expect(cookCompiled.propagationProfile!.tendency).toBe('selective');
    expect(cookCompiled.propagationProfile!.receives).toBe('as belief');

    // Colonel
    expect(colonelCompiled.goalDefs).toHaveLength(1);
    expect(colonelCompiled.goalDefs![0].id).toBe('eliminate-player');
    expect(colonelCompiled.goalDefs![0].mode).toBe('prepared');
    expect(colonelCompiled.influenceDefs).toHaveLength(1);
    expect(colonelCompiled.influenceDefs![0].name).toBe('intimidation');
    expect(colonelCompiled.resistanceDefs).toHaveLength(1);
    expect(colonelCompiled.resistanceDefs![0].influenceName).toBe('seduction');
  });

  test('applyCharacter returns full configuration', () => {
    const maidEntity = createStubEntity('maid', 'Maid');
    const applied = applyCharacter(maidEntity, maidCompiled);

    expect(applied.trait).toBeInstanceOf(CharacterModelTrait);
    expect(applied.trait.getMood()).toBe('anxious');
    expect(applied.trait.knows('murder')).toBe(true);
    expect(applied.propagationProfile?.tendency).toBe('chatty');
    expect(applied.movementProfile?.knows).toEqual(['kitchen', 'hall', 'servants-quarters']);
  });

  test('CharacterPhaseRegistry stores all configs', () => {
    const registry = new CharacterPhaseRegistry();

    const maidEntity = createStubEntity('maid', 'Maid');
    const cookEntity = createStubEntity('cook', 'Cook');
    const colonelEntity = createStubEntity('colonel', 'Colonel');

    const maidApplied = applyCharacter(maidEntity, maidCompiled);
    const cookApplied = applyCharacter(cookEntity, cookCompiled);
    const colonelApplied = applyCharacter(colonelEntity, colonelCompiled);

    // Register all NPCs
    registry.register('maid', {
      propagationProfile: maidApplied.propagationProfile,
      movementProfile: maidApplied.movementProfile,
    });
    registry.register('cook', {
      propagationProfile: cookApplied.propagationProfile,
      movementProfile: cookApplied.movementProfile,
    });
    registry.register('colonel', {
      goalDefs: colonelApplied.goalDefs,
      movementProfile: colonelApplied.movementProfile,
      influenceDefs: colonelApplied.influenceDefs,
      resistanceDefs: colonelApplied.resistanceDefs,
    });

    // Verify configs stored
    expect(registry.getConfig('maid')?.propagationProfile?.tendency).toBe('chatty');
    expect(registry.getConfig('cook')?.propagationProfile?.tendency).toBe('selective');
    expect(registry.getConfig('colonel')?.influenceDefs).toHaveLength(1);

    // Goal manager created for colonel
    expect(registry.getGoalManager('colonel')).toBeDefined();
    expect(registry.getGoalManager('maid')).toBeUndefined();
  });

  test('registry save/restore preserves mutable state', () => {
    const registry = new CharacterPhaseRegistry();
    registry.register('colonel', {
      goalDefs: colonelCompiled.goalDefs,
      influenceDefs: colonelCompiled.influenceDefs,
    });

    // Simulate some game state
    registry.alreadyToldRecord.record('maid', 'cook', 'murder');
    registry.influenceTracker.track(
      'intimidation', 'colonel', 'gardener',
      { propagation: 'mute', mood: 'fearful' },
      { duration: 'lingering', turn: 10, lingeringTurns: 3 },
    );

    // Save
    const saved = registry.toJSON();

    // Restore into fresh registry
    const registry2 = new CharacterPhaseRegistry();
    registry2.register('colonel', {
      goalDefs: colonelCompiled.goalDefs,
      influenceDefs: colonelCompiled.influenceDefs,
    });
    registry2.restoreState(saved);

    // Verify state restored
    expect(registry2.alreadyToldRecord.hasTold('maid', 'cook', 'murder')).toBe(true);
    expect(registry2.influenceTracker.isUnderInfluence('gardener', 'intimidation')).toBe(true);
  });

  test('full builder API — all four ADRs on one character', () => {
    // Colonel uses all four systems
    const compiled = new ConversationBuilder('master-villain')
      // ADR-141 base
      .personality('cunning', 'ruthless')
      .mood('calm')
      .threat('lethal')
      .knows('secret', { witnessed: true })
      // ADR-142 conversation
      .topic('secret', { keywords: ['secret'] })
      .when('asked about secret')
        .if('trusts player').tell('villain-reveals-secret')
        .otherwise().lie('villain-lies-about-secret')
        .done()
      // ADR-144 propagation
      .propagation({ tendency: 'mute' })
      // ADR-145 goals
      .goal('escape')
        .activatesWhen('secret discovered')
        .priority('critical')
        .mode('sequential')
        .pursues([
          { type: 'moveTo', target: 'exit' },
          { type: 'act', messageId: 'villain-escapes' },
        ])
        .done()
      .movement({ knows: 'all', access: 'all' })
      // ADR-146 influence
      .influence('menace')
        .mode('passive')
        .range('room')
        .effect({ mood: 'uneasy' })
        .duration('while present')
        .witnessed('villain-radiates-menace')
        .done()
      .resistsInfluence('intimidation')
      .resistsInfluence('seduction')
      .compile();

    // All systems present
    expect(compiled.propagationProfile?.tendency).toBe('mute');
    expect(compiled.goalDefs).toHaveLength(1);
    expect(compiled.movementProfile?.knows).toBe('all');
    expect(compiled.influenceDefs).toHaveLength(1);
    expect(compiled.resistanceDefs).toHaveLength(2);

    // Apply to entity
    const entity = createStubEntity('master-villain', 'Villain');
    const applied = applyCharacter(entity, compiled);
    expect(applied.trait.knows('secret')).toBe(true);
    expect(applied.goalDefs![0].id).toBe('escape');
    expect(applied.influenceDefs![0].name).toBe('menace');
  });
});
