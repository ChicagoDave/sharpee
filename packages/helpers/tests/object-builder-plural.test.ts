/**
 * object-builder-plural.test.ts — `ObjectBuilder.plural()` marks the name
 * plural by setting the identity's plural to the name (ADR-409 D8), so
 * `isPlural` holds and pronouns and prose agree. It writes no singular: the
 * builder knows only the name, and a TypeScript author who wants the object
 * to answer to its singular sets `IdentityTrait.singular` themselves.
 *
 * Owner context: @sharpee/helpers — tests.
 */
import { describe, expect, it } from 'vitest';
import { IdentityTrait, TraitType, WorldModel } from '@sharpee/world-model';
import { ObjectBuilder } from '../src/builders/object';

const identityOf = (built: ReturnType<ObjectBuilder['build']>) => built.get(TraitType.IDENTITY) as IdentityTrait;

describe('ObjectBuilder.plural() (ADR-409 D8)', () => {
  it('sets the plural to the name, so the object reads as plural', () => {
    const goats = identityOf(new ObjectBuilder(new WorldModel(), 'pygmy goats').plural().build());
    expect(goats.plural).toBe('pygmy goats');
    expect(goats.isPlural).toBe(true);
    expect(goats.singular).toBeUndefined();
  });

  it('leaves an object built without it singular, with no plural set', () => {
    const lamp = identityOf(new ObjectBuilder(new WorldModel(), 'brass lamp').build());
    expect(lamp.plural).toBeUndefined();
    expect(lamp.isPlural).toBe(false);
  });
});
