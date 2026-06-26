/**
 * @file noun-phrase.test.ts
 *
 * Unit tests for `nounPhraseFor()` (ADR-192). Each test asserts on a specific
 * field of the produced `NounPhrase`, deriving directly from the producer's
 * field-mapping contract (ADR-192 §3). The legacy `article` literal must NOT
 * appear — the Assembler computes the surface (D4).
 */

import { describe, test, expect } from 'vitest';
import { WorldModel, IdentityTrait, EntityType } from '@sharpee/world-model';
import { nounPhraseFor } from '../../../src/utils/noun-phrase';

function makeEntity(world: WorldModel, name: string, identity?: Partial<IdentityTrait>) {
  const entity = world.createEntity(name, EntityType.OBJECT);
  if (identity !== undefined) {
    entity.add(new IdentityTrait({ name, ...identity }));
  }
  return entity;
}

describe('nounPhraseFor', () => {
  test('no IdentityTrait → minimal indefinite singular noun with referableId', () => {
    const world = new WorldModel();
    const thing = makeEntity(world, 'thing');

    const np = nounPhraseFor(thing);

    expect(np.kind).toBe('noun');
    expect(np.name).toBe('thing');
    expect(np.number).toBe('singular');
    expect(np.articleType).toBe('indefinite');
    expect(np.referableId).toBe(thing.id);
  });

  test('common noun → indefinite singular; no adjectives/plural/properName', () => {
    const world = new WorldModel();
    const sword = makeEntity(world, 'sword', { article: 'a' });

    const np = nounPhraseFor(sword);

    expect(np.name).toBe('sword');
    expect(np.number).toBe('singular');
    expect(np.articleType).toBe('indefinite');
    expect(np.adjectives).toBeUndefined();
    expect(np.pluralForm).toBeUndefined();
    expect(np.properName).toBeUndefined();
  });

  test('the legacy article literal is NOT mapped onto the NounPhrase', () => {
    const world = new WorldModel();
    const sword = makeEntity(world, 'sword', { article: 'an' });

    const np = nounPhraseFor(sword);

    expect((np as Record<string, unknown>).article).toBeUndefined();
    expect(np.articleType).toBe('indefinite');
  });

  test('plural override → pluralForm', () => {
    const world = new WorldModel();
    const goose = makeEntity(world, 'goose', { plural: 'geese' });

    expect(nounPhraseFor(goose).pluralForm).toBe('geese');
  });

  test('adjectives → copied (not the same array reference)', () => {
    const world = new WorldModel();
    const chest = makeEntity(world, 'chest', { adjectives: ['small', 'iron'] });

    const np = nounPhraseFor(chest);

    expect(np.adjectives).toEqual(['small', 'iron']);
    const identity = chest.get('identity') as IdentityTrait;
    expect(np.adjectives).not.toBe(identity.adjectives);
  });

  test('mass nounType → number "mass", articleType "some"', () => {
    const world = new WorldModel();
    const sand = makeEntity(world, 'sand', { nounType: 'mass' });

    const np = nounPhraseFor(sand);

    expect(np.number).toBe('mass');
    expect(np.articleType).toBe('some');
  });

  test('proper nounType → properName true, articleType "none"', () => {
    const world = new WorldModel();
    const alice = makeEntity(world, 'Alice', { nounType: 'proper' });

    const np = nounPhraseFor(alice);

    expect(np.properName).toBe(true);
    expect(np.articleType).toBe('none');
  });

  test('properName flag (no nounType) → properName true, articleType "none"', () => {
    const world = new WorldModel();
    const bob = makeEntity(world, 'Bob', { properName: true });

    const np = nounPhraseFor(bob);

    expect(np.properName).toBe(true);
    expect(np.articleType).toBe('none');
  });

  test('grammaticalNumber "plural" → number "plural"', () => {
    const world = new WorldModel();
    const coins = makeEntity(world, 'coins', { grammaticalNumber: 'plural' });

    expect(nounPhraseFor(coins).number).toBe('plural');
  });

  test('nounType "plural" → number "plural"', () => {
    const world = new WorldModel();
    const scissors = makeEntity(world, 'scissors', { nounType: 'plural' });

    expect(nounPhraseFor(scissors).number).toBe('plural');
  });

  test('referableId is the entity id', () => {
    const world = new WorldModel();
    const lamp = makeEntity(world, 'lamp', {});

    expect(nounPhraseFor(lamp).referableId).toBe(lamp.id);
  });

  test('empty trait name falls back to entity.name', () => {
    const world = new WorldModel();
    const entity = world.createEntity('fallback', EntityType.OBJECT);
    entity.add(new IdentityTrait({ name: '' }));

    expect(nounPhraseFor(entity).name).toBe(entity.name);
  });
});
