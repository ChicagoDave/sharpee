/**
 * @file noun-phrase.test.ts
 *
 * Unit tests for `nounPhraseFor()` (ADR-192). Each test asserts on a specific
 * field of the produced `NounPhrase`, deriving directly from the producer's
 * field-mapping contract (ADR-192 §3). The legacy `article` literal must NOT
 * appear — the Assembler computes the surface (D4).
 */

import { describe, test, expect } from 'vitest';
import { WorldModel, IdentityTrait, EntityType, OpenableTrait } from '@sharpee/world-model';
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

  test('explicit article "the" → articleType "definite"', () => {
    const world = new WorldModel();
    const gate = makeEntity(world, 'staff gate', { article: 'the' });

    expect(nounPhraseFor(gate).articleType).toBe('definite');
  });

  test('explicit article "some" → articleType "some" (number unaffected)', () => {
    const world = new WorldModel();
    const gliders = makeEntity(world, 'sugar gliders', { article: 'some' });

    const np = nounPhraseFor(gliders);

    expect(np.articleType).toBe('some');
    expect(np.number).toBe('singular'); // article never implies number
  });

  test('explicit article "some" + grammaticalNumber plural (the book\'s zoo shape)', () => {
    const world = new WorldModel();
    const signs = makeEntity(world, 'direction signs', {
      article: 'some',
      grammaticalNumber: 'plural',
    });

    const np = nounPhraseFor(signs);

    expect(np.articleType).toBe('some');
    expect(np.number).toBe('plural');
  });

  test('explicit empty article → articleType "none"', () => {
    const world = new WorldModel();
    const self = makeEntity(world, 'yourself', { article: '' });

    expect(nounPhraseFor(self).articleType).toBe('none');
  });

  test('semantic noun signals outrank the explicit article', () => {
    const world = new WorldModel();
    const alice = makeEntity(world, 'Alice', { properName: true, article: 'the' });
    const water = makeEntity(world, 'water', { nounType: 'mass', article: 'the' });

    expect(nounPhraseFor(alice).articleType).toBe('none');
    expect(nounPhraseFor(water).articleType).toBe('some');
  });

  test('unique nounType → articleType "definite" (ADR-095: "the sun")', () => {
    const world = new WorldModel();
    const sun = makeEntity(world, 'sun', { nounType: 'unique' });

    expect(nounPhraseFor(sun).articleType).toBe('definite');
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

describe('nounPhraseFor — state-derived adjectives (ADR-193)', () => {
  test('default (no opts) → no state adjectives (open box stays "box")', () => {
    const world = new WorldModel();
    const box = makeEntity(world, 'box', {});
    box.add(new OpenableTrait({ isOpen: true }));

    expect(nounPhraseFor(box).adjectives).toBeUndefined();
  });

  test('AC-2: opt-in prepends the live state adjective ("open box")', () => {
    const world = new WorldModel();
    const box = makeEntity(world, 'box', {});
    box.add(new OpenableTrait({ isOpen: true }));

    expect(nounPhraseFor(box, undefined, { stateAdjectives: true }).adjectives).toEqual(['open']);
  });

  test('AC-3: state adjectives prepend before static ones', () => {
    const world = new WorldModel();
    const box = makeEntity(world, 'box', { adjectives: ['wooden'] });
    box.add(new OpenableTrait({ isOpen: true }));

    expect(nounPhraseFor(box, undefined, { stateAdjectives: true }).adjectives).toEqual(['open', 'wooden']);
  });

  test('a closed box contributes nothing even when opted in', () => {
    const world = new WorldModel();
    const box = makeEntity(world, 'box', { adjectives: ['iron'] });
    box.add(new OpenableTrait({ isOpen: false }));

    expect(nounPhraseFor(box, undefined, { stateAdjectives: true }).adjectives).toEqual(['iron']);
  });
});
