/**
 * readers.test.ts — GH #518: `collectStateReaders` finds every state read
 * under every statement-bearing root, in each of its three forms.
 *
 * One fixture per read form — an `is` predicate in a clause head, a
 * `select-on` over `it.state` inside a trait, a story-phase condition — plus
 * the trait-per-composer expansion and two regression cases: the entity's
 * `states` list contributes nothing, and an `is` predicate whose object is
 * not a state word is left out rather than guessed at. Every fixture
 * compiles real Chord source (`compileSource`), the same discipline
 * `corpus.ts` states: the analyzer must see what the compiler actually
 * emits, never a hand-built IR standing in for it.
 *
 * Owner context: @sharpee/world-index — tests.
 *
 * @see GH #518, ADR-322 D8
 */

import { describe, expect, it } from 'vitest';
import { collectStateReaders } from '../src/statements.js';
import { compileSource } from './corpus.js';

/** A minimal one-room story, with slots for a top-level block and Tom's body. */
const story = (top: string, tomBody: string, headerExtra = ''): string => `story
  title: Readers Sweep
  authors:
    T
  id: readers-sweep
  story-version: 0.0.1
${headerExtra}
${top}

create the Yard
  a room

  A yard.

create Tom
  a person
  in the Yard
  states, reversible: calm, alert
${tomBody}
  Tom.

create Alex
  a person
  playable
  starts in the Yard

  You.

before the game starts
  change the player to Alex
end before
`;

describe('GH #518 — `is` predicate', () => {
  it('finds a clause-head `while <entity> is <state>` test, owned by the entity that declares the clause', () => {
    const ir = compileSource(story('', '  on the player pushing while Tom is calm\n    change Tom to alert\n  end on\n'));
    const readers = collectStateReaders(ir);
    expect(readers).toContainEqual(
      expect.objectContaining({ target: 'tom', state: 'calm', owner: { kind: 'entity', id: 'tom' }, via: 'is' }),
    );
  });

  it('reports no source line — the compiler attaches no span to a predicate condition', () => {
    const ir = compileSource(story('', '  on the player pushing while Tom is calm\n    change Tom to alert\n  end on\n'));
    const read = collectStateReaders(ir).find((r) => r.via === 'is' && r.target === 'tom');
    // An `is` condition in the IR carries no `span`, so a never-read finding
    // built on it cannot point at the author's line until the compiler adds
    // one. Pinned here so that change is noticed when it lands.
    expect(read?.line).toBeNull();
  });
});

describe('GH #518 — story-state condition', () => {
  it('finds a story-phase test, targeted at `story`, owned by the entity whose clause tests it', () => {
    const ir = compileSource(
      story('', '  on the player pushing while dusk\n    change Tom to alert\n  end on\n', '  states: dawn, dusk\n'),
    );
    const readers = collectStateReaders(ir);
    expect(readers).toContainEqual(
      expect.objectContaining({ target: 'story', state: 'dusk', owner: { kind: 'entity', id: 'tom' }, via: 'story-state' }),
    );
  });
});

describe('GH #518 — select-on over a trait, expanded per composer', () => {
  const traited = `story
  title: Readers Trait
  authors:
    T
  id: readers-trait
  story-version: 0.0.1

define trait ripenable
  on the player pushing
    select on its state
      when green
        change it to ripe
      when ripe
        change it to green
    end select
  end on
end trait

create the Yard
  a room

  A yard.

create the apple
  ripenable
  in the Yard
  states, reversible: green, ripe

  An apple.

create the pear
  ripenable
  in the Yard
  states, reversible: green, ripe

  A pear.

create Alex
  a person
  playable
  starts in the Yard

  You.

before the game starts
  change the player to Alex
end before
`;

  it('yields one read per arm, once per composing entity, with `it` bound to that composer', () => {
    const readers = collectStateReaders(compileSource(traited)).filter((r) => r.via === 'select-on');
    const rows = readers.map((r) => [r.target, r.state, r.owner]);
    expect(rows).toEqual(
      expect.arrayContaining([
        ['apple', 'green', { kind: 'entity', id: 'apple' }],
        ['apple', 'ripe', { kind: 'entity', id: 'apple' }],
        ['pear', 'green', { kind: 'entity', id: 'pear' }],
        ['pear', 'ripe', { kind: 'entity', id: 'pear' }],
      ]),
    );
    expect(rows).toHaveLength(4);
  });
});

describe('GH #518 — omission contract (regression)', () => {
  it('excludes the entity\'s own `states` list from the walk (no phantom read from a state name)', () => {
    const ir = compileSource(story('', ''));
    // `states, reversible: calm, alert` declares two values; neither is a
    // predicate, a select-on, or a story-state node. With no clause anywhere
    // that tests a state, the walk must find nothing.
    expect(collectStateReaders(ir)).toEqual([]);
  });

  it('leaves out an `is` test whose object is not a state word', () => {
    const ir = compileSource(story('', '  on the player pushing while the player is here\n    change Tom to alert\n  end on\n'));
    // `is here` compiles to an `is-here` predicate, not an `is` against a
    // symbol — nothing here is a state read, so nothing is guessed at.
    expect(collectStateReaders(ir).filter((r) => r.via === 'is')).toEqual([]);
  });
});
