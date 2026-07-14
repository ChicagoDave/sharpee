/**
 * zoo-surfaces-phase1.test.ts — the three independent Z primitives
 * (chord-zoo-surfaces Phase 1, 2026-07-14):
 *
 * - Z5: strategy adverbs mirror the Choice selectors 1:1 (ADR-211
 *   Decision 4) — `stopping`/`sticky`/`first-time` parse; retired
 *   `ordered`/`once` are load errors naming their replacement (AC-13),
 *   at BOTH strategy sites (`define phrase` and `select`); the D5 rule
 *   modifier `, once` is a different grammar site and still parses.
 * - Z4: the `here` deictic — `<subject> is here` parses to the `is-here`
 *   predicate, IR-compiles alongside `is-in`, and rejects non-entity
 *   subjects at load.
 * - Z1: `first time` prose blocks in room `create` blocks — first-visit
 *   description compiling to `initialDescriptionKey`; `second time` and
 *   non-room owners are load errors.
 */
import { describe, expect, it } from 'vitest';
import { compile, CreateDecl, parse } from '../src';

const HEADER = 'story "T" by "N"\n  id: t\n  version: 0.0.1\n\n';

function errorsOf(source: string) {
  return compile(source).diagnostics.filter((d) => d.severity === 'error');
}

// A minimal world: one room, the player, and a portable prop.
const WORLD = `create the Lab
  a room

  A bare laboratory.

create the player
  in the Lab

create the widget
  in the Lab

  A small widget.

`;

describe('Z5: strategy adverbs (ADR-211 Decision 4)', () => {
  it.each(['randomly', 'cycling', 'stopping', 'sticky', 'first-time'] as const)(
    '`define phrase k, %s` parses and lands in the IR',
    (adverb) => {
      const result = compile(
        `${HEADER}${WORLD}define phrase mood, ${adverb}\n  One.\nor\n  Two.\nend phrase\n`,
      );
      expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
      expect(result.ir.phrases.locales['en-US']['mood'].strategy).toBe(adverb);
      expect(result.ir.phrases.locales['en-US']['mood'].variants).toHaveLength(2);
    },
  );

  it.each([
    ['ordered', 'stopping'],
    ['once', 'first-time'],
  ])('AC-13: `define phrase k, %s` is a load error naming `%s`', (retired, replacement) => {
    const errors = errorsOf(
      `${HEADER}${WORLD}define phrase hint, ${retired}\n  One.\nor\n  Two.\nend phrase\n`,
    );
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('parse.phrase-strategy-retired');
    expect(errors[0].message).toContain(`\`${replacement}\``);
  });

  it.each([
    ['ordered', 'stopping'],
    ['once', 'first-time'],
  ])('Z5 applies at the `select` site too: `select %s` errors naming `%s`', (retired, replacement) => {
    const errors = errorsOf(
      `${HEADER}${WORLD}create the lever\n  in the Lab\n\n  A lever.\n\n  on pull it\n    select ${retired}\n      phrase a\n        First.\n    or\n      phrase b\n        Second.\n    end select\n  end on\n`,
    );
    expect(errors.map((e) => e.code)).toContain('parse.select-strategy-retired');
    const retiredError = errors.find((e) => e.code === 'parse.select-strategy-retired')!;
    expect(retiredError.message).toContain(`\`${replacement}\``);
  });

  it('`select sticky` parses clean (new adverb accepted at the select site)', () => {
    const result = compile(
      `${HEADER}${WORLD}create the lever\n  in the Lab\n\n  A lever.\n\n  on pull it\n    select sticky\n      phrase a\n        First.\n    or\n      phrase b\n        Second.\n    end select\n  end on\n`,
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  });

  it('D5 regression: the rule modifier `, once` still parses while the adverb is retired', () => {
    const result = compile(
      `${HEADER}${WORLD}create the bell\n  in the Lab\n\n  A bell.\n\n  on every turn while the widget is here, once\n    phrase ding\n      Ding.\n  end on\n`,
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  });
});

describe('Z4: the `here` deictic', () => {
  it('`while <entity> is here` parses to the is-here predicate and IR-compiles', () => {
    const result = compile(
      `${HEADER}${WORLD}create the bell\n  in the Lab\n\n  A bell.\n\n  on every turn while the widget is here\n    phrase ding\n      Ding.\n  end on\n`,
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const bell = result.ir.entities.find((e) => e.id === 'widget' || e.id === 'bell');
    expect(bell).toBeTruthy();
    const clause = result.ir.entities.find((e) => e.id === 'bell')!.onClauses[0];
    expect(clause.condition).toMatchObject({
      kind: 'predicate',
      pred: 'is-here',
      negated: false,
      subject: { kind: 'entity', id: 'widget' },
    });
  });

  it('`is not here` carries negation', () => {
    const result = compile(
      `${HEADER}${WORLD}create the bell\n  in the Lab\n\n  A bell.\n\n  on every turn while the widget is not here\n    phrase ding\n      Ding.\n  end on\n`,
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const clause = result.ir.entities.find((e) => e.id === 'bell')!.onClauses[0];
    expect(clause.condition).toMatchObject({ kind: 'predicate', pred: 'is-here', negated: true });
  });

  it('a literal subject is a load error (analysis.here-subject)', () => {
    const errors = errorsOf(
      `${HEADER}${WORLD}create the bell\n  in the Lab\n\n  A bell.\n\n  on every turn while 3 is here\n    phrase ding\n      Ding.\n  end on\n`,
    );
    expect(errors.map((e) => e.code)).toContain('analysis.here-subject');
  });
});

describe('Z1: `first time` room descriptions', () => {
  const FIRST_TIME_ROOM = `create the Zoo Entrance
  a room
  first time
    Your family piles out of the car.

  You stand before the wrought-iron gates.

create the player
  in the Zoo Entrance

`;

  it('parses: first-time prose and the standard description stay separate', () => {
    const result = parse(`${HEADER}${FIRST_TIME_ROOM}`);
    expect(result.diagnostics).toEqual([]);
    const room = result.ast.declarations.find((d): d is CreateDecl => d.kind === 'create')!;
    expect(room.initialDescription?.text).toBe('Your family piles out of the car.');
    expect(room.description?.text).toBe('You stand before the wrought-iron gates.');
  });

  it('compiles: initialDescriptionKey lands on the room with its own phrase entry', () => {
    const result = compile(`${HEADER}${FIRST_TIME_ROOM}`);
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const room = result.ir.entities.find((e) => e.id === 'zoo-entrance')!;
    expect(room.initialDescriptionKey).toBe('zoo-entrance.initial-description');
    expect(room.descriptionKey).toBe('zoo-entrance.description');
    const table = result.ir.phrases.locales['en-US'];
    expect(table['zoo-entrance.initial-description'].variants).toHaveLength(1);
  });

  it('`second time` at create scope is a load error', () => {
    const errors = errorsOf(
      `${HEADER}create the Hall\n  a room\n  second time\n    Prose.\n\n  A hall.\n\ncreate the player\n  in the Hall\n`,
    );
    expect(errors.map((e) => e.code)).toContain('parse.create-ordinal-time');
  });

  it('`first time` on a non-room is a load error', () => {
    const errors = errorsOf(
      `${HEADER}create the Lab\n  a room\n\n  A lab.\n\ncreate the player\n  in the Lab\n\ncreate the widget\n  in the Lab\n  first time\n    Shiny.\n\n  A widget.\n`,
    );
    expect(errors.map((e) => e.code)).toContain('analysis.first-time-non-room');
  });

  it('a duplicate `first time` block is a load error', () => {
    const errors = errorsOf(
      `${HEADER}create the Hall\n  a room\n  first time\n    One.\n  first time\n    Two.\n\n  A hall.\n\ncreate the player\n  in the Hall\n`,
    );
    expect(errors.map((e) => e.code)).toContain('parse.first-time-duplicate');
  });
});
