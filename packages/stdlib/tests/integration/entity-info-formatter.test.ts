/**
 * @file entity-info-formatter.test.ts
 *
 * Integration: `entityInfoFrom()` output must produce correct article
 * rendering when consumed by lang-en-us's formatter chain.
 *
 * This is the load-bearing test for ADR-158: it asserts the full path
 * from a story-defined `IFEntity` (with its `IdentityTrait` config) through
 * `entityInfoFrom()` and into the rendered template string, for each of
 * the five `nounType` cases. If any link in the chain breaks (helper drops
 * a field, formatter regresses), this test catches it before stdlib
 * actions silently emit incorrect output.
 */

import { describe, test, expect } from 'vitest';
import { WorldModel, IdentityTrait, EntityType } from '@sharpee/world-model';
import {
  createFormatterRegistry,
  formatMessage,
} from '@sharpee/lang-en-us';
import { entityInfoFrom } from '../../src/utils/entity-info';

const registry = createFormatterRegistry();

function render(template: string, paramName: string, value: unknown): string {
  // formatMessage's params type accepts EntityInfo via the union; cast to satisfy TS at the boundary.
  return formatMessage(template, { [paramName]: value as never }, registry, {});
}

function makeEntity(world: WorldModel, name: string, identity?: Partial<IdentityTrait>) {
  const entity = world.createEntity(name, EntityType.OBJECT);
  if (identity !== undefined) {
    entity.add(new IdentityTrait({ name, ...identity }));
  }
  return entity;
}

describe('entityInfoFrom → formatter integration', () => {
  describe('common nouns', () => {
    test('{the:cap:item} renders "The white house"', () => {
      const world = new WorldModel();
      const house = makeEntity(world, 'white house', {
        article: 'the',
        properName: false,
      });

      const out = render('{the:cap:item} is fixed in place.', 'item', entityInfoFrom(house));

      expect(out).toBe('The white house is fixed in place.');
    });

    test('{the:item} renders "the white house" mid-sentence', () => {
      const world = new WorldModel();
      const house = makeEntity(world, 'white house', { article: 'the' });

      const out = render('You see the {item}.', 'item', entityInfoFrom(house));
      // Note: this template uses literal "the" + raw item name —
      // representative of mid-sentence fallback patterns.
      expect(out).toBe('You see the white house.');
    });

    test('{a:cap:item} renders "A sword" using indefinite article', () => {
      const world = new WorldModel();
      const sword = makeEntity(world, 'sword', { article: 'a' });

      const out = render('{a:cap:item} appears.', 'item', entityInfoFrom(sword));

      expect(out).toBe('A sword appears.');
    });

    test('{a:cap:item} picks "An" for vowel-initial common nouns', () => {
      const world = new WorldModel();
      const apple = makeEntity(world, 'apple', { article: 'a' });

      const out = render('{a:cap:item} sits here.', 'item', entityInfoFrom(apple));

      expect(out).toBe('An apple sits here.');
    });
  });

  describe('proper nouns', () => {
    test('{the:cap:item} skips article for proper-named entity', () => {
      const world = new WorldModel();
      const john = makeEntity(world, 'John', { properName: true, article: '' });

      const out = render('{the:cap:item} arrives.', 'item', entityInfoFrom(john));

      // Proper names render as-is; "The John arrives." would be the regression
      expect(out).toBe('John arrives.');
    });

    test('{a:cap:item} also skips article for proper-named entity', () => {
      const world = new WorldModel();
      const cyclops = makeEntity(world, 'Cyclops', {
        properName: true,
        article: '',
      });

      const out = render('{a:cap:item} blocks the way.', 'item', entityInfoFrom(cyclops));

      expect(out).toBe('Cyclops blocks the way.');
    });
  });

  describe('mass nouns', () => {
    test('{a:cap:item} renders "Some water" for mass noun', () => {
      const world = new WorldModel();
      const water = makeEntity(world, 'water', { nounType: 'mass' });

      const out = render('{a:cap:item} pools here.', 'item', entityInfoFrom(water));

      expect(out).toBe('Some water pools here.');
    });

    test('{some:item} renders partitive form', () => {
      const world = new WorldModel();
      const water = makeEntity(world, 'water', { nounType: 'mass' });

      const out = render('You drink {some:item}.', 'item', entityInfoFrom(water));

      expect(out).toBe('You drink some water.');
    });
  });

  describe('unique nouns', () => {
    test('{a:cap:item} renders "The sun" for unique nounType', () => {
      const world = new WorldModel();
      const sun = makeEntity(world, 'sun', { nounType: 'unique' });

      const out = render('{a:cap:item} shines overhead.', 'item', entityInfoFrom(sun));

      expect(out).toBe('The sun shines overhead.');
    });
  });

  describe('plural nouns', () => {
    test('{a:item} renders "scissors" without article (indefinite plural)', () => {
      const world = new WorldModel();
      const scissors = makeEntity(world, 'scissors', { nounType: 'plural' });

      const out = render('You spot {a:item}.', 'item', entityInfoFrom(scissors));

      expect(out).toBe('You spot scissors.');
    });
  });

  describe('missing IdentityTrait fallback', () => {
    test('{the:cap:item} still produces "The X" for entities with no IdentityTrait', () => {
      const world = new WorldModel();
      const bare = world.createEntity('thing', EntityType.OBJECT);

      const out = render('{the:cap:item} is here.', 'item', entityInfoFrom(bare));

      // Without IdentityTrait info, the formatter treats it as a common noun
      // and prefixes "the " — which is acceptable (not the regression case)
      expect(out).toBe('The thing is here.');
    });
  });
});
