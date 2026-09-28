/**
 * identity-snippets.test.ts — `IdentityTrait.snippets` (GH #364): the
 * marker→snippet table an entity description's `{snippet:name}` markers
 * resolve through, carried by the trait exactly as `RoomTrait.snippets` is.
 */
import { describe, expect, it } from 'vitest';
import { IdentityTrait } from '../../../src/traits/identity/identityTrait';

describe('IdentityTrait.snippets (GH #364)', () => {
  it('is absent by default — no map, no splice pass', () => {
    expect(new IdentityTrait({ name: 'lanterns' }).snippets).toBeUndefined();
  });

  it('carries the constructor-supplied map as given', () => {
    const trait = new IdentityTrait({
      name: 'lanterns',
      snippets: { 'lantern-night': 'Lamps burn along the street.', tail: { selector: 'cycling', texts: ['a', 'b'] } },
    });
    expect(trait.snippets).toEqual({
      'lantern-night': 'Lamps burn along the street.',
      tail: { selector: 'cycling', texts: ['a', 'b'] },
    });
  });
});
