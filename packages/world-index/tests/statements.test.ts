/**
 * statements.test.ts — GH #517: `collectStateWriters` walks every
 * statement-bearing IR surface, not a chosen list.
 *
 * Each fixture isolates one surface the old allowlist missed — entity
 * `timerClauses`, `moveClauses`, `exchanges`, `greetings`, `initiative`,
 * `conversations`, the story-level `story.timerClauses`, and `startBlock` —
 * and asserts the returned writer row names the right target, state, and
 * owner. Every fixture compiles real Chord source (`compileSource`), the
 * same discipline `corpus.ts` states: the analyzer must see what the
 * compiler actually emits, never a hand-built IR standing in for it.
 *
 * Owner context: @sharpee/world-index — tests.
 *
 * @see GH #517, ADR-321 D4
 */

import { describe, expect, it } from 'vitest';
import { collectStateWriters } from '../src/statements.js';
import { compileSource } from './corpus.js';

/** A minimal two-room story, with one line reserved for a surface under test. */
const story = (top: string, tomBody: string, startBlockExtra = ''): string => `story
  title: Statements Sweep
  authors:
    T
  id: statements-sweep
  story-version: 0.0.1

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
${startBlockExtra}end before
`;

describe('GH #517 — entity timerClauses', () => {
  it('finds a `change` inside a `when <timer> expires` clause, owned by the entity that declares it', () => {
    const ir = compileSource(
      story(
        'define timer bell for Tom\nend timer\n',
        '  when bell expires\n    change Tom to alert\n  end when\n',
      ),
    );
    const writers = collectStateWriters(ir);
    expect(writers).toContainEqual(
      expect.objectContaining({ target: 'tom', state: 'alert', owner: { kind: 'entity', id: 'tom' } }),
    );
  });
});

describe('GH #517 — entity moveClauses', () => {
  it('finds a `change` inside a `when <entity> moves` clause, owned by the holder entity, not the mover', () => {
    const ir = compileSource(
      story('', '  when Alex moves\n    change Tom to alert\n  end when\n'),
    );
    const writers = collectStateWriters(ir);
    expect(writers).toContainEqual(
      expect.objectContaining({ target: 'tom', state: 'alert', owner: { kind: 'entity', id: 'tom' } }),
    );
  });
});

describe('GH #517 — entity exchanges', () => {
  it('finds a `change` inside a `define exchange` row', () => {
    const ir = compileSource(
      story(
        'define exchange loyalty for Tom\n  answer "yes":\n    change Tom to alert\nend exchange\n',
        '',
      ),
    );
    const writers = collectStateWriters(ir);
    expect(writers).toContainEqual(
      expect.objectContaining({ target: 'tom', state: 'alert', owner: { kind: 'entity', id: 'tom' } }),
    );
  });
});

describe('GH #517 — entity greetings', () => {
  it('finds a `change` inside a `define greetings` row', () => {
    const ir = compileSource(
      story(
        'define greetings for Tom\n  first time:\n    change Tom to alert\nend greetings\n',
        '',
      ),
    );
    const writers = collectStateWriters(ir);
    expect(writers).toContainEqual(
      expect.objectContaining({ target: 'tom', state: 'alert', owner: { kind: 'entity', id: 'tom' } }),
    );
  });
});

describe('GH #517 — entity initiative', () => {
  it('finds a `change` inside a `define initiative` row', () => {
    const ir = compileSource(
      story(
        'define initiative for Tom\n  on silence:\n    change Tom to alert\nend initiative\n',
        '',
      ),
    );
    const writers = collectStateWriters(ir);
    expect(writers).toContainEqual(
      expect.objectContaining({ target: 'tom', state: 'alert', owner: { kind: 'entity', id: 'tom' } }),
    );
  });
});

describe('GH #517 — entity conversations', () => {
  it('finds a `change` inside a `define conversation` beat and its conclusion', () => {
    const ir = compileSource(
      story(
        'define conversation talk for Tom\n  beat:\n    change Tom to alert\n  conclusion:\n    change Tom to calm\nend conversation\n',
        '',
      ),
    );
    const writers = collectStateWriters(ir);
    expect(writers).toContainEqual(
      expect.objectContaining({ target: 'tom', state: 'alert', owner: { kind: 'entity', id: 'tom' } }),
    );
    expect(writers).toContainEqual(
      expect.objectContaining({ target: 'tom', state: 'calm', owner: { kind: 'entity', id: 'tom' } }),
    );
  });
});

describe('GH #517 — story-level story.timerClauses', () => {
  it('finds a `change` inside a story-owned `when <timer> expires` clause, owned by the story', () => {
    const ir = compileSource(
      story(
        '  when curfew expires\n    change Tom to alert\n  end when\n\ndefine timer curfew\nend timer\n',
        '',
      ),
    );
    const writers = collectStateWriters(ir);
    expect(writers).toContainEqual(
      expect.objectContaining({ target: 'tom', state: 'alert', owner: { kind: 'story' } }),
    );
  });
});

describe('GH #517 — startBlock', () => {
  it('finds a `change` inside `before the game starts`, owned by the story', () => {
    const ir = compileSource(story('', '', '  change Tom to alert\n'));
    const writers = collectStateWriters(ir);
    expect(writers).toContainEqual(
      expect.objectContaining({ target: 'tom', state: 'alert', owner: { kind: 'story' } }),
    );
  });
});

describe('GH #517 — unaffected surfaces still resolve (regression)', () => {
  it('still finds a plain onClauses write, unowned surfaces unchanged', () => {
    const ir = compileSource(
      story('', '  on the player pushing\n    change Tom to alert\n  end on\n'),
    );
    const writers = collectStateWriters(ir);
    expect(writers).toContainEqual(
      expect.objectContaining({ target: 'tom', state: 'alert', owner: { kind: 'entity', id: 'tom' } }),
    );
  });

  it('excludes the entity\'s own `states` list from the walk (no phantom writer from a state name)', () => {
    const ir = compileSource(story('', ''));
    const writers = collectStateWriters(ir);
    // `states, reversible: calm, alert` declares two values; neither word is a
    // `change` node, so a writer whose state is one of them must come from an
    // actual statement, never from the declaration itself. This fixture has
    // no `change` anywhere it can resolve, so the walk must find nothing.
    expect(writers).toEqual([]);
  });
});
