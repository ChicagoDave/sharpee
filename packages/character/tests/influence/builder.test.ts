/**
 * Unit tests for influence builder API (ADR-146 layer 5)
 *
 * Verifies that .influence() and .resistsInfluence() on CharacterBuilder
 * produce correct InfluenceDef and ResistanceDef in CompiledCharacter output.
 *
 * Owner context: @sharpee/character / influence
 */

import { CharacterBuilder } from '../../src/character-builder';
import { ConversationBuilder } from '../../src/conversation/builder';

describe('CharacterBuilder.influence() — fluent API', () => {
  test('compiles passive seduction influence', () => {
    const compiled = new CharacterBuilder('ginger')
      .influence('seduction')
        .mode('passive')
        .range('proximity')
        .effect({ focus: 'clouded', mood: 'distracted' })
        .duration('while present')
        .witnessed('ginger-brushes-against-{target}')
        .resisted('ginger-brushes-against-{target}-no-effect')
        .done()
      .compile();

    expect(compiled.influenceDefs).toBeDefined();
    expect(compiled.influenceDefs).toHaveLength(1);

    const def = compiled.influenceDefs![0];
    expect(def.name).toBe('seduction');
    expect(def.mode).toBe('passive');
    expect(def.range).toBe('proximity');
    expect(def.effect).toEqual({ focus: 'clouded', mood: 'distracted' });
    expect(def.duration).toBe('while present');
    expect(def.witnessed).toBe('ginger-brushes-against-{target}');
    expect(def.resisted).toBe('ginger-brushes-against-{target}-no-effect');
  });

  test('compiles active intimidation influence', () => {
    const compiled = new CharacterBuilder('colonel')
      .influence('intimidation')
        .mode('active')
        .range('targeted')
        .effect({ propagation: 'mute', mood: 'fearful' })
        .duration('momentary')
        .witnessed('colonel-looms-over-{target}')
        .resisted('colonel-looms-over-{target}-unfazed')
        .done()
      .compile();

    const def = compiled.influenceDefs![0];
    expect(def.mode).toBe('active');
    expect(def.range).toBe('targeted');
    expect(def.duration).toBe('momentary');
  });

  test('compiles room-wide calming influence', () => {
    const compiled = new CharacterBuilder('priest')
      .influence('calming')
        .mode('passive')
        .range('room')
        .effect({ mood: 'at ease' })
        .witnessed('priest-presence-calms-{target}')
        .done()
      .compile();

    const def = compiled.influenceDefs![0];
    expect(def.range).toBe('room');
    expect(def.effect).toEqual({ mood: 'at ease' });
  });

  test('compiles influence with schedule', () => {
    const compiled = new CharacterBuilder('ginger')
      .influence('seduction')
        .mode('passive')
        .range('proximity')
        .effect({ focus: 'clouded' })
        .schedule({ when: ['alone with target'] })
        .done()
      .compile();

    expect(compiled.influenceDefs![0].schedule).toEqual({ when: ['alone with target'] });
  });

  test('compiles influence with onPlayerAction', () => {
    const compiled = new CharacterBuilder('ginger')
      .influence('seduction')
        .mode('passive')
        .range('proximity')
        .effect({ focus: 'clouded' })
        .onPlayerAction('ginger-distracts-from-{action}')
        .done()
      .compile();

    expect(compiled.influenceDefs![0].onPlayerAction).toBe('ginger-distracts-from-{action}');
  });

  test('compiles lingering influence with turn count', () => {
    const compiled = new CharacterBuilder('witch')
      .influence('curse')
        .mode('active')
        .range('targeted')
        .effect({ mood: 'anxious' })
        .duration('lingering')
        .lingeringTurns(5)
        .done()
      .compile();

    const def = compiled.influenceDefs![0];
    expect(def.duration).toBe('lingering');
    expect(def.lingeringTurns).toBe(5);
  });

  test('compiles lingering influence with clear condition', () => {
    const compiled = new CharacterBuilder('witch')
      .influence('curse')
        .mode('active')
        .range('targeted')
        .effect({ mood: 'anxious' })
        .duration('lingering')
        .clearsWhen('has holy water')
        .done()
      .compile();

    expect(compiled.influenceDefs![0].lingeringClearCondition).toBe('has holy water');
  });

  test('compiles multiple influences', () => {
    const compiled = new CharacterBuilder('ginger')
      .influence('seduction')
        .mode('passive')
        .range('proximity')
        .effect({ focus: 'clouded' })
        .done()
      .influence('charm')
        .mode('passive')
        .range('room')
        .effect({ mood: 'pleasant' })
        .done()
      .compile();

    expect(compiled.influenceDefs).toHaveLength(2);
    expect(compiled.influenceDefs![0].name).toBe('seduction');
    expect(compiled.influenceDefs![1].name).toBe('charm');
  });

  test('auto-finalizes pending influence on compile()', () => {
    const compiled = new CharacterBuilder('ginger')
      .influence('seduction')
        .mode('passive')
        .range('proximity')
        .effect({ focus: 'clouded' })
      .compile();

    expect(compiled.influenceDefs).toHaveLength(1);
    expect(compiled.influenceDefs![0].name).toBe('seduction');
  });

  test('defaults: passive, proximity, while present', () => {
    const compiled = new CharacterBuilder('npc')
      .influence('aura')
        .effect({ mood: 'calm' })
        .done()
      .compile();

    const def = compiled.influenceDefs![0];
    expect(def.mode).toBe('passive');
    expect(def.range).toBe('proximity');
    expect(def.duration).toBe('while present');
  });

  test('no influenceDefs when .influence() not called', () => {
    const compiled = new CharacterBuilder('npc').compile();
    expect(compiled.influenceDefs).toBeUndefined();
  });

  test('available from ConversationBuilder (inheritance)', () => {
    const compiled = new ConversationBuilder('ginger')
      .influence('seduction')
        .mode('passive')
        .range('proximity')
        .effect({ focus: 'clouded' })
        .done()
      .compile();

    expect(compiled.influenceDefs).toBeDefined();
    expect(compiled.influenceDefs![0].name).toBe('seduction');
  });
});

describe('CharacterBuilder.resistsInfluence()', () => {
  test('compiles unconditional resistance', () => {
    const compiled = new CharacterBuilder('james')
      .resistsInfluence('seduction')
      .compile();

    expect(compiled.resistanceDefs).toBeDefined();
    expect(compiled.resistanceDefs).toHaveLength(1);
    expect(compiled.resistanceDefs![0].influenceName).toBe('seduction');
    expect(compiled.resistanceDefs![0].except).toBeUndefined();
  });

  test('compiles conditional resistance with except', () => {
    const compiled = new CharacterBuilder('margaret')
      .resistsInfluence('seduction', { except: ['from female'] })
      .compile();

    const res = compiled.resistanceDefs![0];
    expect(res.influenceName).toBe('seduction');
    expect(res.except).toEqual(['from female']);
  });

  test('compiles multiple resistances', () => {
    const compiled = new CharacterBuilder('detective')
      .resistsInfluence('intimidation')
      .resistsInfluence('seduction')
      .compile();

    expect(compiled.resistanceDefs).toHaveLength(2);
    expect(compiled.resistanceDefs![0].influenceName).toBe('intimidation');
    expect(compiled.resistanceDefs![1].influenceName).toBe('seduction');
  });

  test('no resistanceDefs when .resistsInfluence() not called', () => {
    const compiled = new CharacterBuilder('npc').compile();
    expect(compiled.resistanceDefs).toBeUndefined();
  });

  test('defensive copy — mutating except array does not change compiled def', () => {
    const except = ['from female'];
    const compiled = new CharacterBuilder('margaret')
      .resistsInfluence('seduction', { except })
      .compile();

    except.push('when drunk');
    expect(compiled.resistanceDefs![0].except).toEqual(['from female']);
  });

  test('influence and resistance can coexist on same character', () => {
    const compiled = new CharacterBuilder('ginger')
      .influence('seduction')
        .mode('passive')
        .range('proximity')
        .effect({ focus: 'clouded' })
        .done()
      .resistsInfluence('intimidation')
      .compile();

    expect(compiled.influenceDefs).toHaveLength(1);
    expect(compiled.resistanceDefs).toHaveLength(1);
  });
});
