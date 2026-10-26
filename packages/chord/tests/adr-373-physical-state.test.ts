/**
 * ADR-373 compile-time surface: `attached to <the thing>` (with optional
 * `detachable`) and `breakable` (with optional `fragile`) lower to trait
 * adjectives; `broken` and `attached` read as state adjectives; a declared
 * `whole, broken` pair shadows the platform; `starts broken` pairs with
 * `breakable`; `on … breaking` is refused in favour of `after`.
 */

import { describe, expect, it } from 'vitest';
import { compile } from '../src';
import type { StoryIR } from '../src/ir';

const HEADER = `story
  title: Specimens
  authors:
    T
  id: specimens
  story-version: 0.0.1
`;

const story = (body: string) => `${HEADER}
before the game starts
  change the player to Alex
end before

create the Specimen Room
  a room

  A room.

create Alex
  a person
  playable
  starts in the Specimen Room

  You.

create the sorting machine
  a thing, scenery
  in the Specimen Room

  A machine.

${body}
define phrase shards
  Shards.
end phrase
`;

function codes(source: string): string[] {
  const result = compile(source);
  return result.ok ? [] : result.diagnostics.map((d) => d.code);
}

function ir(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) throw new Error(result.diagnostics.map((d) => `${d.code}: ${d.message}`).join('; '));
  return result.ir;
}

describe('attached to (ADR-373 D1)', () => {
  it('lowers to the `attached` adjective carrying the anchor as its entity value', () => {
    const compiled = ir(story(`create the route placard
  a thing, attached to the sorting machine, detachable
  in the Specimen Room

  A placard.
`));
    const placard = compiled.entities.find((e) => e.id === 'route-placard')!;
    const attached = placard.traits.find((t) => t.name === 'attached')!;
    expect(attached.config).toEqual([expect.objectContaining({ key: '', value: 'sorting machine', valueKind: 'name' })]);
    expect(placard.traits.map((t) => t.name)).toContain('detachable');
  });

  it('refuses `attached` with no `to <the thing>`', () => {
    expect(codes(story(`create the route placard
  a thing, attached
  in the Specimen Room

  A placard.
`))).toContain('parse.attached-to');
  });

  it('refuses an anchor that names no entity', () => {
    expect(codes(story(`create the route placard
  a thing, attached to the hull
  in the Specimen Room

  A placard.
`))).toContain('analysis.setting-names-no-entity');
  });

  it('refuses `detachable` without `attached to`', () => {
    expect(codes(story(`create the route placard
  a thing, detachable
  in the Specimen Room

  A placard.
`))).toEqual(['analysis.detachable-not-attached']);
  });
});

describe('breakable and fragile (ADR-373 D2, D4, D7)', () => {
  it('lowers `breakable, fragile` and `starts broken` to the trait words and the pairing', () => {
    const compiled = ir(story(`create the specimen jar
  a container, breakable, fragile
  in the Specimen Room

  A jar.

create the cracked lens
  a thing, breakable, starts broken
  in the Specimen Room

  A lens.
`));
    const jar = compiled.entities.find((e) => e.id === 'specimen-jar')!;
    expect(jar.traits.map((t) => t.name)).toEqual(expect.arrayContaining(['breakable', 'fragile']));
    const lens = compiled.entities.find((e) => e.id === 'cracked-lens')!;
    expect(lens.startsStates).toContain('broken');
  });

  it('refuses `fragile` without `breakable`', () => {
    expect(codes(story(`create the specimen jar
  a container, fragile
  in the Specimen Room

  A jar.
`))).toEqual(['analysis.fragile-not-breakable']);
  });

  it('refuses `starts broken` without `breakable`', () => {
    expect(codes(story(`create the cracked lens
  a thing, starts broken
  in the Specimen Room

  A lens.
`))).toContain('analysis.starts-state-pairing');
  });

  it('reports a declared `whole, broken` state set as shadowing breakable', () => {
    const result = compile(story(`create the vase
  a thing
  in the Specimen Room
  states: whole, broken

  A vase.
`));
    expect(result.ok).toBe(false);
    const shadow = result.diagnostics.find((d) => d.code === 'analysis.shadow-state')!;
    expect(shadow.message).toContain('breakable');
  });
});

describe('broken and attached as state adjectives (ADR-373 D1, D2)', () => {
  it('reads `is broken` and `is attached` on a thing that declares no states', () => {
    expect(codes(story(`create the specimen jar
  a container, breakable
  in the Specimen Room

  A jar.

  after the player examining while the specimen jar is broken
    phrase shards
  end after

create the route placard
  a thing, attached to the sorting machine
  in the Specimen Room

  A placard.

  after the player examining while the route placard is attached
    phrase shards
  end after
`))).toEqual([]);
  });
});

describe('the breaking clause (ADR-373 D3)', () => {
  it('compiles `after the player breaking` on a breakable thing', () => {
    const compiled = ir(story(`create the specimen jar
  a container, breakable, fragile
  in the Specimen Room

  A jar.

  after the player breaking
    phrase shards
  end after
`));
    const jar = compiled.entities.find((e) => e.id === 'specimen-jar')!;
    expect(jar.onClauses.map((c) => `${c.clauseKind} ${c.action}`)).toContain('after breaking');
  });

  it('refuses `on the player breaking`, naming the after form', () => {
    const result = compile(story(`create the specimen jar
  a container, breakable
  in the Specimen Room

  A jar.

  on the player breaking
    phrase shards
  end on
`));
    expect(result.ok).toBe(false);
    const gate = result.diagnostics.find((d) => d.code === 'analysis.breaking-after-only')!;
    expect(gate.message).toContain('after the player breaking');
  });
});

describe('tying with a counterpart (ADR-373 D6)', () => {
  it('compiles `on the player tying to <the anchor>`', () => {
    expect(codes(story(`create the mooring line
  a thing
  in the Specimen Room

  A line.

  on the player tying to the sorting machine
    phrase shards
  end on
`))).toEqual([]);
  });
});
