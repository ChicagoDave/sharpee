/**
 * gh-364-entity-description-markers.test.ts — `{phrase}` markers splice in an
 * entity's description exactly as in room prose
 * (`secret-letter-port-platform-defects` Phase 5, P-13; GH #364).
 *
 * REAL path (bootTurns: real compile, real engine, typed commands). A scenery
 * entity carries a gated marker and a cycling marker in its description; the
 * loader compiles them onto `IdentityTrait.snippets`, the examining action
 * carries the map, and the engine's examined handler splices it. Assertions
 * read the built trait, the rendered text, and the persisted Choice counter.
 */
import { describe, expect, it } from 'vitest';
import { IdentityTrait, TraitType } from '@sharpee/world-model';
import { bootTurns } from './helpers/boot-turns';

const LAMPS = `story
  title: Lamps
  authors:
    T
  id: lamps
  story-version: 0.0.1

create the Street
  a room

  A street.

create the sky
  scenery
  in the Street
  states, reversible: day, night

  The sky.

  on the player examining
    change the sky to night
  end on

create the lanterns
  scenery, plural
  in the Street

  {lantern-night}The lampposts stand along the street. {lantern-tail}

define phrase lantern-night while the sky is night
  Lamps burn along the street.
end phrase

define phrase lantern-tail, cycling
  One flickers.
or
  All are dark.
end phrase

create Jack
  a person
  playable
  starts in the Street

  You.

before the game starts
  change the player to Jack
end before
`;

describe('GH #364: markers splice in an entity description', () => {
  it('compiles the markers onto IdentityTrait.snippets and splices them on examine', async () => {
    const b = await bootTurns(LAMPS);
    const lanterns = b.world.getAllEntities().find((e) => e.name === 'lanterns')!;
    const identity = lanterns.get(TraitType.IDENTITY) as IdentityTrait;
    expect(Object.keys(identity.snippets ?? {}).sort()).toEqual(['lantern-night', 'lantern-tail']);

    // Day: the gated marker splices nothing; the cycling marker takes arm one.
    const day = await b.turnText('x lanterns');
    expect(day.text).toContain('The lampposts stand along the street. One flickers.');
    expect(day.text).not.toContain('Lamps burn');
    expect(day.text).not.toContain('{lantern');

    // Night: the gate holds and the cycling marker advances to arm two.
    await b.turnText('x sky');
    expect(b.world.getStateValue('chord.state.sky')).toBe('night');
    const night = await b.turnText('x lanterns');
    expect(night.text).toContain('Lamps burn along the street.');
    expect(night.text).toContain('The lampposts stand along the street. All are dark.');
    expect(night.text).not.toContain('{lantern');

    const store = b.world.getCapability('textState') as Record<string, Record<string, number>>;
    expect(store[lanterns.id]['lantern-tail']).toBe(2);
  });
});
