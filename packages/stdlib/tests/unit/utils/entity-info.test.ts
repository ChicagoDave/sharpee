/**
 * @file entity-info.test.ts
 *
 * Unit tests for `entityInfoFrom()`.
 *
 * Per ADR-158: this helper is the single bridge between world-model's
 * `IFEntity` and the language layer's `EntityInfo`. It must populate every
 * field that the formatter chain (`{the:…}`, `{a:…}`, `{some:…}`) consults,
 * and must degrade gracefully when an entity has no `IdentityTrait`.
 */

import { describe, test, expect } from 'vitest';
import { WorldModel, IdentityTrait, EntityType } from '@sharpee/world-model';
import { entityInfoFrom } from '../../../src/utils/entity-info';

function makeEntity(world: WorldModel, name: string, identity?: Partial<IdentityTrait>) {
  const entity = world.createEntity(name, EntityType.OBJECT);
  if (identity !== undefined) {
    entity.add(new IdentityTrait({ name, ...identity }));
  }
  return entity;
}

describe('entityInfoFrom', () => {
  test('common noun with default article reads name and article', () => {
    const world = new WorldModel();
    const sword = makeEntity(world, 'sword', { article: 'a' });

    const info = entityInfoFrom(sword);

    expect(info.name).toBe('sword');
    expect(info.article).toBe('a');
    expect(info.properName).toBeUndefined();
    expect(info.nounType).toBeUndefined();
  });

  test('proper-named entity sets properName=true and skips falsy fields', () => {
    const world = new WorldModel();
    const john = makeEntity(world, 'John', { properName: true, article: '' });

    const info = entityInfoFrom(john);

    expect(info.name).toBe('John');
    expect(info.properName).toBe(true);
    // Empty article should NOT appear (formatter would render "the John" otherwise)
    expect(info.article).toBeUndefined();
  });

  test('unique noun (e.g. white house) carries nounType and article', () => {
    const world = new WorldModel();
    const house = makeEntity(world, 'white house', {
      article: 'the',
      properName: false,
    });

    const info = entityInfoFrom(house);

    expect(info.name).toBe('white house');
    expect(info.article).toBe('the');
    expect(info.properName).toBeUndefined();
  });

  test('mass noun carries nounType=mass for "some X" rendering', () => {
    const world = new WorldModel();
    const water = makeEntity(world, 'water', { nounType: 'mass' });

    const info = entityInfoFrom(water);

    expect(info.name).toBe('water');
    expect(info.nounType).toBe('mass');
  });

  test('plural noun carries nounType=plural', () => {
    const world = new WorldModel();
    const scissors = makeEntity(world, 'scissors', { nounType: 'plural' });

    const info = entityInfoFrom(scissors);

    expect(info.nounType).toBe('plural');
  });

  test('nounType=common is preserved (not stripped as default)', () => {
    const world = new WorldModel();
    const lamp = makeEntity(world, 'lamp', { nounType: 'common', article: 'a' });

    const info = entityInfoFrom(lamp);

    expect(info.nounType).toBe('common');
    expect(info.article).toBe('a');
  });

  test('grammaticalNumber is forwarded when set', () => {
    const world = new WorldModel();
    const coins = makeEntity(world, 'coins', {
      nounType: 'plural',
      grammaticalNumber: 'plural',
    });

    const info = entityInfoFrom(coins);

    expect(info.grammaticalNumber).toBe('plural');
  });

  test('missing IdentityTrait returns minimal { name } from entity.name', () => {
    const world = new WorldModel();
    // No IdentityTrait added
    const bare = world.createEntity('bare-thing', EntityType.OBJECT);

    const info = entityInfoFrom(bare);

    expect(info.name).toBe('bare-thing');
    expect(info.article).toBeUndefined();
    expect(info.nounType).toBeUndefined();
    expect(info.properName).toBeUndefined();
  });

  test('IdentityTrait with empty name falls back to entity.name', () => {
    const world = new WorldModel();
    const entity = world.createEntity('fallback-name', EntityType.OBJECT);
    entity.add(new IdentityTrait({ name: '', article: 'a' }));

    const info = entityInfoFrom(entity);

    // Empty IdentityTrait.name should not produce empty info.name
    expect(info.name).toBe('fallback-name');
    expect(info.article).toBe('a');
  });
});
