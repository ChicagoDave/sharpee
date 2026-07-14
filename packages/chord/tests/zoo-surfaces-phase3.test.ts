/**
 * zoo-surfaces-phase3.test.ts — Z3/Z3b/Z6 chord half (chord-zoo-surfaces
 * Phase 3, 2026-07-14): the reserved channel-key class (present/entered/
 * exited/disappeared/detail), the channels-are-never-pushed statement ban,
 * the extended entity phrase-override grammar (CP3 strategy adverbs +
 * or-variants; Z3b `while` gates; repeating `detail` blocks), and the Z6
 * `remove <entity>` statement (parse, IR shape, when-suffix, sequence-kit
 * membership, the remove-player load error).
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const HEADER = 'story "T" by "N"\n  id: t\n  version: 0.0.1\n\n';

const WORLD = `create the Lab
  a room

  A lab.

create the player
  in the Lab

  You.

create the cat
  in the Lab

  A cat.

`;

function errorsOf(source: string) {
  return compile(source).diagnostics.filter((d) => d.severity === 'error');
}

describe('Z3: reserved channel keys', () => {
  it.each(['present', 'entered', 'exited', 'disappeared', 'detail'])(
    'a bare `define phrase %s` is a load error (analysis.reserved-name)',
    (key) => {
      const errors = errorsOf(`${HEADER}${WORLD}define phrase ${key}\n  Text.\nend phrase\n`);
      expect(errors.map((e) => e.code)).toContain('analysis.reserved-name');
    },
  );

  it('emitting a channel via a `phrase` statement is a load error (channels are never pushed)', () => {
    const errors = errorsOf(
      `${HEADER}${WORLD}create the bell\n  in the Lab\n\n  A bell.\n\n  on examining it\n    phrase present\n      Pushed.\n  end on\n`,
    );
    expect(errors.map((e) => e.code)).toContain('analysis.channel-pushed');
  });

  it('the entity `phrase present:` block itself registers clean (the one authoring surface)', () => {
    const result = compile(
      `${HEADER}${WORLD}create the keeper\n  in the Lab\n\n  A keeper.\n\n  phrase present:\n    Sam is here, jingling keys.\n`,
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(result.ir.phrases.locales['en-US']['keeper.present'].variants[0].text).toBe(
      'Sam is here, jingling keys.',
    );
  });
});

describe('CP3: override strategy adverbs and or-variants', () => {
  it('`phrase present, cycling:` with or-variants carries strategy + both variants', () => {
    const result = compile(
      `${HEADER}${WORLD}create the keeper\n  in the Lab\n\n  A keeper.\n\n  phrase present, cycling:\n    Sam is here.\n  or\n    Sam jingles the keys.\n`,
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const phrase = result.ir.phrases.locales['en-US']['keeper.present'];
    expect(phrase.strategy).toBe('cycling');
    expect(phrase.variants.map((v) => v.text)).toEqual(['Sam is here.', 'Sam jingles the keys.']);
  });

  it('a retired adverb on an override header gets the AC-13 fix-it', () => {
    const errors = errorsOf(
      `${HEADER}${WORLD}create the keeper\n  in the Lab\n\n  A keeper.\n\n  phrase present, ordered:\n    Sam is here.\n`,
    );
    const retired = errors.find((e) => e.code === 'parse.phrase-strategy-retired');
    expect(retired).toBeTruthy();
    expect(retired!.message).toContain('`stopping`');
  });
});

describe('Z3b: detail blocks', () => {
  it('`phrase detail while it is on:` compiles with its condition', () => {
    const result = compile(
      `${HEADER}${WORLD}create the flashlight\n  switchable\n  in the Lab\n\n  A flashlight.\n\n  phrase detail while it is on:\n    It clicks faintly as it powers up.\n`,
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const phrase = result.ir.phrases.locales['en-US']['flashlight.detail'];
    expect(phrase.condition).toMatchObject({ kind: 'predicate', pred: 'is' });
    expect(phrase.variants[0].text).toBe('It clicks faintly as it powers up.');
  });

  it('two detail blocks per owner get deterministic suffixed keys', () => {
    const result = compile(
      `${HEADER}${WORLD}create the flashlight\n  switchable\n  in the Lab\n\n  A flashlight.\n\n  phrase detail while it is on:\n    It hums.\n\n  phrase detail while the cat is here:\n    The cat eyes it warily.\n`,
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const table = result.ir.phrases.locales['en-US'];
    expect(table['flashlight.detail'].variants[0].text).toBe('It hums.');
    expect(table['flashlight.detail.2'].variants[0].text).toBe('The cat eyes it warily.');
  });

  it('`phrase detail` with no `while` is a load error (unconditional detail belongs in the description)', () => {
    const errors = errorsOf(
      `${HEADER}${WORLD}create the flashlight\n  in the Lab\n\n  A flashlight.\n\n  phrase detail:\n    It hums.\n`,
    );
    expect(errors.map((e) => e.code)).toContain('analysis.detail-unconditional');
  });

  it('multi-variant detail is a load error (variety = more blocks)', () => {
    const errors = errorsOf(
      `${HEADER}${WORLD}create the flashlight\n  in the Lab\n\n  A flashlight.\n\n  phrase detail while the cat is here:\n    One.\n  or\n    Two.\n`,
    );
    expect(errors.map((e) => e.code)).toContain('analysis.detail-variants');
  });

  it('`while` on a lifecycle channel or ordinary override is a load error (never-guess)', () => {
    const errors = errorsOf(
      `${HEADER}${WORLD}create the keeper\n  in the Lab\n\n  A keeper.\n\n  phrase exited while the cat is here:\n    Sam leaves.\n`,
    );
    expect(errors.map((e) => e.code)).toContain('analysis.override-gate');
  });
});

describe('Z6: the `remove` statement', () => {
  it('parses and IR-compiles alongside `move`, with the D7 when-suffix', () => {
    const result = compile(
      `${HEADER}${WORLD}create the bell\n  in the Lab\n\n  A bell.\n\n  on examining it\n    remove the cat when the cat is here\n  end on\n`,
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const clause = result.ir.entities.find((e) => e.id === 'bell')!.onClauses[0];
    expect(clause.body[0]).toMatchObject({
      kind: 'remove',
      entity: { kind: 'entity', id: 'cat' },
      stmtWhen: { kind: 'predicate', pred: 'is-here' },
    });
  });

  it('`remove it` resolves to the clause owner', () => {
    const result = compile(
      `${HEADER}${WORLD}create the crumbs\n  in the Lab\n\n  Crumbs.\n\n  after taking it\n    remove it\n  end after\n`,
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const clause = result.ir.entities.find((e) => e.id === 'crumbs')!.onClauses[0];
    expect(clause.body[0]).toMatchObject({ kind: 'remove', entity: { kind: 'it' } });
  });

  it('is a member of the D13 sequence mutation kit', () => {
    const result = compile(
      `${HEADER}${WORLD}define sequence cleanup\n  at turn 3\n    remove the cat\nend sequence\n`,
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(result.ir.sequences[0].steps[0].body[0]).toMatchObject({
      kind: 'remove',
      entity: { kind: 'entity', id: 'cat' },
    });
  });

  it('`remove the player` is a load error (analysis.remove-player)', () => {
    const errors = errorsOf(
      `${HEADER}${WORLD}create the bell\n  in the Lab\n\n  A bell.\n\n  on examining it\n    remove the player\n  end on\n`,
    );
    expect(errors.map((e) => e.code)).toContain('analysis.remove-player');
  });
});
