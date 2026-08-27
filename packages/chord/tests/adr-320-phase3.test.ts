/**
 * adr-320-phase3.test.ts — ADR-320 Phase 3: the Chord grammar slice for
 * manner blocks, greeting (boundary) blocks, and the time/threading
 * predicate words (vocabulary frozen 2026-08-17).
 *
 * Derived from the Phase 3 Behavior Statements: every DOES line asserts on
 * the emitted IR (rows, minted phrase keys, lowered condition kinds), and
 * every REJECTS WHEN line asserts on the specific diagnostic code.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';
import type { IRCondition, IREntity } from '../src';

const HEADER = 'story\n  title: T\n  authors:\n    N\n  id: t\n  story-version: 0.0.1\n\n';

const WORLD = `create the Hall
  a room

  A hall.

create Alex
  a person
  playable
  in the Hall

  You.

before the game starts
  change the player to Alex
end before

create Will Kemp
  a person
  in the Hall
  mood cheerful

  The clown.

`;

function compiled(body: string) {
  return compile(HEADER + WORLD + body);
}

function errorsOf(body: string) {
  return compiled(body).diagnostics.filter((d) => d.severity === 'error');
}

function kemp(result: ReturnType<typeof compile>): IREntity {
  const e = result.ir.entities.find((en) => en.name.toLowerCase().includes('kemp'));
  expect(e).toBeDefined();
  return e!;
}

describe('define manner — rows, beats, voice, minted phrase keys', () => {
  const MANNER = `define manner for Will Kemp
  when Will Kemp is cheerful:
    beat "He sketches a little jig step."
    beat "He winks at the nearest stagehand."
  when Will Kemp is sad:
    voice flat
end manner
`;

  it('folds rows onto the owner with deterministic beat keys and registered phrases', () => {
    const result = compiled(MANNER);
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const owner = kemp(result);
    expect(owner.manner).toBeDefined();
    expect(owner.manner!).toHaveLength(2);
    const [row0, row1] = owner.manner!;
    expect(row0.beatKeys).toEqual([
      `${owner.id}.manner-0-0`,
      `${owner.id}.manner-0-1`,
    ]);
    expect(row0.voice).toBeUndefined();
    expect(row1.beatKeys).toEqual([]);
    expect(row1.voice).toBe('flat');
    // The minted keys resolve in the phrase table — pass 1 registered the
    // beat prose under exactly the keys pass 2 wrote into the row.
    const phrases = result.ir.phrases.locales[result.ir.phrases.defaultLocale];
    expect(phrases[`${owner.id}.manner-0-0`]).toBeDefined();
    expect(phrases[`${owner.id}.manner-0-0`].variants[0].text).toContain('jig step');
  });

  it('rejects a second block for the same owner', () => {
    const errors = errorsOf(MANNER + '\n' + MANNER);
    expect(errors.some((d) => d.code === 'analysis.duplicate-manner-block')).toBe(true);
  });

  it('rejects a non-person host', () => {
    const errors = errorsOf(`define manner for the Hall
  when Will Kemp is sad:
    voice flat
end manner
`);
    expect(errors.some((d) => d.code === 'analysis.manner-host')).toBe(true);
  });

  it('rejects a second voice word in one row', () => {
    const errors = errorsOf(`define manner for Will Kemp
  when Will Kemp is sad:
    voice flat
    voice hollow
end manner
`);
    expect(errors.some((d) => d.code === 'analysis.manner-voice-duplicate')).toBe(true);
  });

  it('rejects malformed rows, beats, voices, and empty blocks by name', () => {
    expect(errorsOf('define manner for Will Kemp\n  about x: phrase y\nend manner\n')
      .some((d) => d.code === 'parse.manner-row')).toBe(true);
    expect(errorsOf('define manner for Will Kemp\n  when Will Kemp is sad:\n    beat flat\nend manner\n')
      .some((d) => d.code === 'parse.manner-beat')).toBe(true);
    expect(errorsOf('define manner for Will Kemp\n  when Will Kemp is sad:\n    voice "flat"\nend manner\n')
      .some((d) => d.code === 'parse.manner-voice')).toBe(true);
    expect(errorsOf('define manner for Will Kemp\nend manner\n')
      .some((d) => d.code === 'parse.manner-empty')).toBe(true);
  });
});

describe('define greetings — boundary rows', () => {
  const GREETINGS = `define greetings for Will Kemp
  first time:
    phrase kemp-sizes-you-up
      He looks you up and down.
  on return:
    phrase kemp-nods
      He nods.
  on return, after days:
    phrase kemp-wheres-been
      "Where have you been?"
  asked again:
    phrase kemp-persistent
      "Persistent, aren't you."
  on leaving:
    phrase kemp-turns-away
      He turns away.
end greetings
`;

  it('folds boundary rows onto the owner with lowered heads', () => {
    const result = compiled(GREETINGS);
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const owner = kemp(result);
    expect(owner.greetings).toBeDefined();
    expect(owner.greetings!.map((r) => r.head)).toEqual([
      { kind: 'first-time' },
      { kind: 'return', absence: null },
      { kind: 'return', absence: 'after-days' },
      { kind: 'asked', word: 'again' },
      { kind: 'leaving' },
    ]);
    // Bodies lowered as statements — the first-time row emits its phrase.
    expect(owner.greetings![0].body[0].kind).toBe('phrase');
  });

  it('rejects a duplicate boundary head', () => {
    const errors = errorsOf(`define greetings for Will Kemp
  first time:
    phrase a-key
      One.
  first time:
    phrase b-key
      Two.
end greetings
`);
    expect(errors.some((d) => d.code === 'analysis.duplicate-greeting')).toBe(true);
  });

  it('rejects unknown absence and repetition words by naming the vocabulary', () => {
    const absence = errorsOf('define greetings for Will Kemp\n  on return, after ages:\n    phrase k\n      X.\nend greetings\n');
    expect(absence.some((d) => d.code === 'parse.greetings-absence')).toBe(true);
    const rep = errorsOf('define greetings for Will Kemp\n  asked thrice:\n    phrase k\n      X.\nend greetings\n');
    expect(rep.some((d) => d.code === 'parse.greetings-asked')).toBe(true);
  });

  it('rejects a non-person host and a duplicate block', () => {
    expect(errorsOf('define greetings for the Hall\n  first time:\n    phrase k\n      X.\nend greetings\n')
      .some((d) => d.code === 'analysis.greetings-host')).toBe(true);
    expect(errorsOf(GREETINGS + '\n' + GREETINGS)
      .some((d) => d.code === 'analysis.duplicate-greetings-block')).toBe(true);
  });
});

describe('time and threading predicates — IR condition kinds', () => {
  function mannerConditionOf(body: string): IRCondition {
    const result = compiled(body);
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const owner = kemp(result);
    expect(owner.manner).toBeDefined();
    return owner.manner![0].condition;
  }

  it('lowers `<topic> is fresh` to a recency condition with a normalized topic', () => {
    const cond = mannerConditionOf(`define manner for Will Kemp
  when the falling-out is fresh:
    voice sharp
end manner
`);
    expect(cond).toEqual({ kind: 'recency', topic: 'falling-out', word: 'fresh' });
  });

  it('wraps negated recency in not', () => {
    const cond = mannerConditionOf(`define manner for Will Kemp
  when the falling-out is not stale:
    voice warm
end manner
`);
    expect(cond).toEqual({
      kind: 'not',
      operand: { kind: 'recency', topic: 'falling-out', word: 'stale' },
    });
  });

  it('lowers `<topic> was discussed` to a discussed condition', () => {
    const cond = mannerConditionOf(`define manner for Will Kemp
  when the falling-out was discussed:
    voice quiet
end manner
`);
    expect(cond).toEqual({ kind: 'discussed', topic: 'falling-out' });
  });

  it('lowers `the subject changes` and `asked again`', () => {
    const subjectChanges = mannerConditionOf(`define manner for Will Kemp
  when the subject changes:
    beat "He takes the change of subject gratefully."
end manner
`);
    expect(subjectChanges).toEqual({ kind: 'subject-changes' });

    const asked = mannerConditionOf(`define manner for Will Kemp
  when asked again:
    voice weary
end manner
`);
    expect(asked).toEqual({ kind: 'asked', word: 'again' });
  });

  it('recency words compose in compound conditions', () => {
    const cond = mannerConditionOf(`define manner for Will Kemp
  when the falling-out is fresh and Will Kemp is sad:
    voice bitter
end manner
`);
    expect(cond.kind).toBe('and');
    if (cond.kind === 'and') {
      expect(cond.operands[0]).toEqual({ kind: 'recency', topic: 'falling-out', word: 'fresh' });
    }
  });

  it('an entity state named like a state word still parses as is-value (standalone rule)', () => {
    // `is fresh` triggers recency ONLY when the word stands alone at the
    // end of the condition — `is fresh paint` keeps the ordinary parse.
    const errors = errorsOf(`define manner for Will Kemp
  when Will Kemp is cheerful:
    voice bright
end manner
`);
    expect(errors).toEqual([]);
  });
});

describe('cost leg — stories without the new constructs are unaffected', () => {
  it('a story with no manner/greetings blocks compiles with no new diagnostics and no new IR fields', () => {
    const result = compile(HEADER + WORLD);
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const owner = kemp(result);
    expect(owner.manner).toBeUndefined();
    expect(owner.greetings).toBeUndefined();
  });
});
