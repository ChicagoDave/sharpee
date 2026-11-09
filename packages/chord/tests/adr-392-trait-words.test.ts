/**
 * ADR-392 compile-time surface (AC-11): `wearable on the <part>` lowers to
 * the `wearable` adjective carrying the part under the key `on`; `opens
 * when unlocked` and `closes when switched off` set the entity's two flags
 * and are refused on blocks that cannot act that way; `smelly` and `loud`
 * are catalog adjectives that compile clean on any thing.
 */

import { describe, expect, it } from 'vitest';
import { compile, TRAIT_ADJECTIVES } from '../src';
import type { StoryIR } from '../src/ir';

const HEADER = `story
  title: Trait Words
  authors:
    T
  id: trait-words
  story-version: 0.0.1
`;

/** The fixture; `door` is the cellar door's composition and lines, `a door` unless a test says more. */
const story = (body: string, door = 'a door') => `${HEADER}
before the game starts
  change the player to Alex
end before

create the Hall
  a room
  north to the Cellar through the cellar door

  A hall.

create the cellar door
  ${door}

  A door.

create the Cellar
  a room

  A cellar.

create Alex
  a person
  playable
  starts in the Hall

  You.

create the iron key
  a thing
  in the Hall

  A key.

${body}`;

function codes(source: string): string[] {
  const result = compile(source);
  return result.ok ? [] : result.diagnostics.map((d) => d.code);
}

function ir(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) throw new Error(result.diagnostics.map((d) => `${d.code}: ${d.message}`).join('; '));
  return result.ir;
}

const entity = (story: StoryIR, id: string) => story.entities.find((e) => e.id === id)!;

describe('wearable on the <part> (ADR-392 D2)', () => {
  it('lowers to the `wearable` adjective with the part under the key `on`', () => {
    const hat = entity(
      ir(story(`create the straw hat
  a thing, wearable on the head
  in the Hall

  A hat.
`)),
      'straw-hat',
    );
    const wearable = hat.traits.find((t) => t.name === 'wearable')!;
    expect(wearable.config).toEqual([expect.objectContaining({ key: 'on', value: 'head', valueKind: 'word' })]);
  });

  it('joins a multi-word part with spaces', () => {
    const glove = entity(
      ir(story(`create the glove
  a thing, wearable on the left hand
  in the Hall

  A glove.
`)),
      'glove',
    );
    expect(glove.traits.find((t) => t.name === 'wearable')!.config[0].value).toBe('left hand');
  });

  it('takes a sibling adjective after the part', () => {
    const cap = entity(
      ir(story(`create the cap
  a thing, wearable on the head, scenery
  in the Hall

  A cap.
`)),
      'cap',
    );
    expect(cap.traits.map((t) => t.name)).toEqual(['wearable', 'scenery']);
    expect(cap.traits[0].config[0].value).toBe('head');
  });

  it('a bare `wearable` carries no setting — the simple wearable', () => {
    const ring = entity(
      ir(story(`create the ring
  a thing, wearable
  in the Hall

  A ring.
`)),
      'ring',
    );
    expect(ring.traits.find((t) => t.name === 'wearable')!.config).toEqual([]);
  });

  it('refuses `wearable on <part>` with no article', () => {
    expect(
      codes(
        story(`create the cap
  a thing, wearable on head
  in the Hall

  A cap.
`),
      ),
    ).toContain('parse.wearable-on');
  });

  it('refuses `wearable on the` with no part', () => {
    expect(
      codes(
        story(`create the cap
  a thing, wearable on the
  in the Hall

  A cap.
`),
      ),
    ).toContain('parse.wearable-on');
  });
});

describe('opens when unlocked (ADR-392 D4)', () => {
  it('sets the flag on a lockable door', () => {
    const door = entity(ir(story('', 'a door, lockable with the iron key\n  opens when unlocked')), 'cellar-door');
    expect(door.opensWhenUnlocked).toBe(true);
    expect(door.closesWhenSwitchedOff).toBeUndefined();
  });

  it('sets the flag on a lockable, openable container, whatever the line order', () => {
    const chest = entity(
      ir(story(`create the chest
  a container
  opens when unlocked
  openable, lockable with the iron key
  in the Hall

  A chest.
`)),
      'chest',
    );
    expect(chest.opensWhenUnlocked).toBe(true);
  });

  it('a block without the line carries no key', () => {
    const door = entity(ir(story('', 'a door, lockable with the iron key')), 'cellar-door');
    expect('opensWhenUnlocked' in door).toBe(false);
  });

  it('refuses the line on a thing that is not lockable', () => {
    expect(
      codes(
        story(`create the box
  a container, openable
  opens when unlocked
  in the Hall

  A box.
`),
      ),
    ).toContain('analysis.opens-when-not-lockable');
  });

  it('refuses the line on a lockable thing that is not openable', () => {
    expect(
      codes(
        story(`create the padlock
  a thing, lockable with the iron key
  opens when unlocked
  in the Hall

  A padlock.
`),
      ),
    ).toContain('analysis.opens-when-not-openable');
  });

  it('refuses a second line and keeps the first', () => {
    const source = story('', 'a door, lockable with the iron key\n  opens when unlocked\n  opens when unlocked');
    expect(codes(source)).toEqual(['analysis.opens-when-duplicate']);
  });

  it('refuses a malformed line, naming the form', () => {
    const result = compile(story('', 'a door, lockable with the iron key\n  opens when locked'));
    expect(result.ok).toBe(false);
    const diag = result.diagnostics.find((d) => d.code === 'parse.opens-when')!;
    expect(diag).toBeDefined();
    expect(diag.message).toContain('`opens when unlocked`');
  });
});

describe('closes when switched off (ADR-392 D4)', () => {
  it('sets the flag on a switchable, openable container', () => {
    const story$ = ir(story(`create the display case
  a container, openable, switchable
  closes when switched off
  in the Hall

  A case.
`));
    const kase = entity(story$, 'display-case');
    expect(kase.closesWhenSwitchedOff).toBe(true);
    expect(kase.opensWhenUnlocked).toBeUndefined();
  });

  it('refuses the line on a thing that is not switchable', () => {
    expect(
      codes(
        story(`create the display case
  a container, openable
  closes when switched off
  in the Hall

  A case.
`),
      ),
    ).toContain('analysis.closes-when-not-switchable');
  });

  it('refuses the line on a switchable thing that is not openable', () => {
    expect(
      codes(
        story(`create the lamp
  a thing, switchable
  closes when switched off
  in the Hall

  A lamp.
`),
      ),
    ).toContain('analysis.closes-when-not-openable');
  });

  it('refuses a second line and keeps the first', () => {
    const source = story(`create the display case
  a container, openable, switchable
  closes when switched off
  closes when switched off
  in the Hall

  A case.
`);
    expect(codes(source)).toEqual(['analysis.closes-when-duplicate']);
  });

  it('refuses a malformed line, naming the form', () => {
    const result = compile(
      story(`create the display case
  a container, openable, switchable
  closes when off
  in the Hall

  A case.
`),
    );
    expect(result.ok).toBe(false);
    const diag = result.diagnostics.find((d) => d.code === 'parse.closes-when')!;
    expect(diag).toBeDefined();
    expect(diag.message).toContain('`closes when switched off`');
  });
});

describe('smelly and loud (ADR-392 D6)', () => {
  it('are catalog adjectives', () => {
    expect(TRAIT_ADJECTIVES.has('smelly')).toBe(true);
    expect(TRAIT_ADJECTIVES.has('loud')).toBe(true);
  });

  it('compile clean on any thing and lower as bare trait compositions', () => {
    const story$ = ir(story(`create the ripe cheese
  a thing, edible, smelly
  in the Hall

  Cheese.

create the brass chime
  a thing, loud
  in the Cellar

  A chime.
`));
    expect(entity(story$, 'ripe-cheese').traits.map((t) => t.name)).toEqual(['edible', 'smelly']);
    const loud = entity(story$, 'brass-chime').traits.find((t) => t.name === 'loud')!;
    expect(loud.config).toEqual([]);
    expect(loud.condition).toBeNull();
  });
});
