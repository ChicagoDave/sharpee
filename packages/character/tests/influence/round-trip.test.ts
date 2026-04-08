/**
 * Round-trip tests for Phase 6 builders (ADR-144, 145, 146)
 *
 * Verifies the full pipeline: builder → compile → applyCharacter
 * for propagation, goals, movement, and influence systems.
 *
 * Owner context: @sharpee/character / Phase 6 integration
 */

import { ConversationBuilder } from '../../src/conversation/builder';
import { applyCharacter } from '../../src/apply';
import { CharacterModelTrait } from '@sharpee/world-model';

/** Minimal entity stub for testing. */
function createStubEntity(id: string) {
  const traits = new Map<string, unknown>();
  return {
    id,
    name: id,
    has: (type: string) => traits.has(type),
    get: (type: string) => traits.get(type),
    add: (trait: { type: string }) => { traits.set(trait.type, trait); return this; },
    _traits: traits,
  } as any;
}

describe('Phase 6 round-trip: builder → compile → apply', () => {
  test('full character with all four systems', () => {
    const compiled = new ConversationBuilder('ginger')
      // ADR-141 base
      .personality('very charming', 'manipulative')
      .mood('cheerful')
      .threat('safe')
      // ADR-142 conversation
      .topic('secrets', { keywords: ['secret', 'hidden'] })
      .when('asked about secrets')
        .if('trusts player').tell('ginger-shares-secret')
        .otherwise().deflect('ginger-changes-subject')
        .done()
      // ADR-144 propagation
      .propagation({
        tendency: 'selective',
        spreads: ['scandal'],
        audience: 'trusted',
        pace: 'gradual',
        coloring: 'conspiratorial',
      })
      // ADR-145 goals and movement
      .goal('seduce-target')
        .activatesWhen('target is alone')
        .priority('high')
        .mode('prepared')
        .pursues([
          { type: 'moveTo', target: 'parlor' },
          { type: 'waitFor', conditions: ['target present'] },
        ])
        .actsWhen('alone with target')
        .act('ginger-seduces-target')
        .done()
      .movement({ knows: 'all', access: ['front-door', 'garden-path'] })
      // ADR-146 influence
      .influence('seduction')
        .mode('passive')
        .range('proximity')
        .effect({ focus: 'clouded', mood: 'distracted' })
        .duration('while present')
        .witnessed('ginger-brushes-against-{target}')
        .resisted('ginger-brushes-against-{target}-no-effect')
        .onPlayerAction('ginger-distracts-from-{action}')
        .schedule({ when: ['alone with target'] })
        .done()
      .resistsInfluence('intimidation')
      .compile();

    // Verify all compiled data is present
    expect(compiled.id).toBe('ginger');

    // Conversation data
    const convData = (compiled as any);
    // The ConversationBuilder stores conversation data internally
    // and it's accessible via getConversationData()

    // Propagation
    expect(compiled.propagationProfile).toBeDefined();
    expect(compiled.propagationProfile!.tendency).toBe('selective');
    expect(compiled.propagationProfile!.spreads).toEqual(['scandal']);
    expect(compiled.propagationProfile!.coloring).toBe('conspiratorial');

    // Goals
    expect(compiled.goalDefs).toHaveLength(1);
    expect(compiled.goalDefs![0].id).toBe('seduce-target');
    expect(compiled.goalDefs![0].priority).toBe('high');
    expect(compiled.goalDefs![0].mode).toBe('prepared');

    // Movement
    expect(compiled.movementProfile).toBeDefined();
    expect(compiled.movementProfile!.knows).toBe('all');
    expect(compiled.movementProfile!.access).toEqual(['front-door', 'garden-path']);

    // Influence
    expect(compiled.influenceDefs).toHaveLength(1);
    expect(compiled.influenceDefs![0].name).toBe('seduction');
    expect(compiled.influenceDefs![0].effect).toEqual({ focus: 'clouded', mood: 'distracted' });

    // Resistance
    expect(compiled.resistanceDefs).toHaveLength(1);
    expect(compiled.resistanceDefs![0].influenceName).toBe('intimidation');

    // Apply to entity
    const entity = createStubEntity('ginger');
    const applied = applyCharacter(entity, compiled);

    // Trait created and added
    expect(applied.trait).toBeInstanceOf(CharacterModelTrait);
    expect(applied.trait.getMood()).toBe('cheerful');

    // All configuration passed through
    expect(applied.propagationProfile).toBe(compiled.propagationProfile);
    expect(applied.goalDefs).toBe(compiled.goalDefs);
    expect(applied.movementProfile).toBe(compiled.movementProfile);
    expect(applied.influenceDefs).toBe(compiled.influenceDefs);
    expect(applied.resistanceDefs).toBe(compiled.resistanceDefs);
  });

  test('character with no optional systems', () => {
    const compiled = new ConversationBuilder('static-npc')
      .personality('quiet')
      .compile();

    const entity = createStubEntity('static-npc');
    const applied = applyCharacter(entity, compiled);

    expect(applied.trait).toBeInstanceOf(CharacterModelTrait);
    expect(applied.propagationProfile).toBeUndefined();
    expect(applied.goalDefs).toBeUndefined();
    expect(applied.movementProfile).toBeUndefined();
    expect(applied.influenceDefs).toBeUndefined();
    expect(applied.resistanceDefs).toBeUndefined();
  });

  test('influence as goal step — colonel intimidation scenario', () => {
    const compiled = new ConversationBuilder('colonel')
      .personality('ruthless', 'disciplined')
      .threat('dangerous')
      // Goal with influence step
      .goal('access-study')
        .activatesWhen('needs weapon', 'knows gardener guards study')
        .priority('critical')
        .mode('sequential')
        .pursues([
          { type: 'moveTo', target: 'garden' },
          { type: 'act', messageId: 'colonel-intimidates-gardener' },
          { type: 'waitFor', conditions: ['gardener not guarding study'] },
          { type: 'moveTo', target: 'study' },
          { type: 'acquire', target: 'letter-opener' },
        ])
        .interruptedBy('witness present')
        .onInterrupt('colonel-retreats')
        .resumeOnClear(true)
        .done()
      .movement({ knows: ['garden', 'study', 'hall'], access: 'all' })
      // Influence definition
      .influence('intimidation')
        .mode('active')
        .range('targeted')
        .effect({ propagation: 'mute', mood: 'fearful' })
        .duration('lingering')
        .lingeringTurns(3)
        .witnessed('colonel-looms-over-{target}')
        .resisted('colonel-looms-over-{target}-unfazed')
        .done()
      .compile();

    // Goal has 5 steps including the intimidation act
    expect(compiled.goalDefs![0].steps).toHaveLength(5);
    expect(compiled.goalDefs![0].interruptedBy).toEqual(['witness present']);
    expect(compiled.goalDefs![0].resumeOnClear).toBe(true);

    // Influence is lingering for 3 turns
    expect(compiled.influenceDefs![0].duration).toBe('lingering');
    expect(compiled.influenceDefs![0].lingeringTurns).toBe(3);

    // Movement knows specific rooms
    expect(compiled.movementProfile!.knows).toEqual(['garden', 'study', 'hall']);
  });
});
