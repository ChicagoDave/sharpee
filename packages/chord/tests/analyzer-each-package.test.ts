/**
 * analyzer-each-package.test.ts — the each package's Phase 3 gate: IR
 * shapes for E1/E2/E3 (`any-of`/`none-of` conditions, the `each` statement,
 * the `match` value) plus the 2026-07-12 P3 decisions (`must be any <name>`
 * membership → `satisfies`; `match` as a reserved declaration name), and
 * the never-guess gates (`analysis.closed-condition-selection` revived,
 * `analysis.match-outside-each`, the open-condition-truth fix-it naming
 * the live forms). Parse-only coverage lives in parser-each-package.test.ts.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile } from '../src';
import type { IRStatement } from '../src';

const fixture = (name: string) => readFileSync(join(__dirname, 'fixtures', name), 'utf8');

function compiledClean(name: string) {
  const result = compile(fixture(name));
  const errors = result.diagnostics.filter((d) => d.severity === 'error');
  expect(errors, `${name} errors: ${errors.map((e) => `${e.span.line} ${e.code} ${e.message}`).join(' | ')}`).toEqual([]);
  return result.ir;
}

function gateErrors(name: string) {
  return compile(fixture(join('gates', name))).diagnostics.filter((d) => d.severity === 'error');
}

const HEADER = 'story "T" by "N"\n  id: t\n  version: 0.0.1\n\n';

function errorsOf(source: string) {
  return compile(source).diagnostics.filter((d) => d.severity === 'error');
}

describe('each-compile.story — E1/E2/E3 + must-be-any IR (each package P3)', () => {
  const ir = compiledClean('each-compile.story');
  const trait = ir.traits.find((t) => t.name === 'skittish')!;
  const action = ir.actions.find((a) => a.name === 'tallying')!;
  const goat = ir.entities.find((e) => e.id === 'pygmy-goat')!;
  const barn = ir.entities.find((e) => e.id === 'trophy-barn')!;
  const sequence = ir.sequences[0];

  it('classifies all three named conditions as open', () => {
    expect(ir.conditions.map((c) => [c.name, c.open])).toEqual([
      ['stray-treasure', true],
      ['alarm-trigger', true],
      ['barn-occupant', true],
    ]);
  });

  it('compiles any/no to any-of/none-of in while, refuse-when, blocked exits, and when suffixes', () => {
    expect(trait.onClauses[0].condition).toEqual({ kind: 'any-of', condition: 'alarm-trigger' });
    expect(trait.onClauses[0].body[1]).toMatchObject({
      kind: 'refuse-when',
      condition: { kind: 'none-of', condition: 'stray-treasure' },
      phraseKey: 'all-clear',
    });
    expect(barn.blockedExits[0].condition).toEqual({ kind: 'any-of', condition: 'alarm-trigger' });
    expect(goat.onClauses[0].condition).toEqual({ kind: 'none-of', condition: 'alarm-trigger' });
    expect(action.body[1]).toMatchObject({
      kind: 'phrase',
      phraseKey: 'tally-note',
      stmtWhen: { kind: 'any-of', condition: 'stray-treasure' },
    });
  });

  it('compiles `must be any <name>` to satisfies with the subject bound (statement and action-level)', () => {
    // Statement form inside the trait clause: subject `it` (the owner).
    expect(trait.onClauses[0].body[0]).toMatchObject({
      kind: 'must',
      condition: { kind: 'satisfies', subject: { kind: 'it' }, condition: 'barn-occupant' },
      phraseKey: 'all-clear',
    });
    // Action-level must line: subject `the player`.
    expect(action.musts).toMatchObject([
      { condition: { kind: 'satisfies', subject: { kind: 'player' }, condition: 'barn-occupant' }, phraseKey: 'not-here' },
    ]);
  });

  it('compiles each blocks in trait clause bodies and action bodies with match targets', () => {
    expect(trait.onClauses[0].body[2]).toMatchObject({
      kind: 'each',
      condition: 'barn-occupant',
      body: [{ kind: 'change', entity: { kind: 'match' }, state: 'spooked' }],
    });
    expect(action.body[0]).toMatchObject({
      kind: 'each',
      condition: 'stray-treasure',
      body: [{ kind: 'move', entity: { kind: 'match' }, place: { kind: 'entity', id: 'trophy-barn' } }],
    });
  });

  it('compiles nested each in an after clause — match in params, when-suffix subjects, and move targets', () => {
    const outer = goat.onClauses[0].body[0] as Extract<IRStatement, { kind: 'each' }>;
    expect(outer.condition).toBe('barn-occupant');
    expect(outer.body[0]).toMatchObject({
      kind: 'phrase',
      phraseKey: 'fed-note',
      params: [{ param: 'animal', value: { kind: 'match' } }],
    });
    expect(outer.body[1]).toMatchObject({
      kind: 'phrase',
      phraseKey: 'hungry-note',
      stmtWhen: {
        kind: 'predicate',
        pred: 'is',
        subject: { kind: 'match' },
        object: { kind: 'symbol', name: 'hungry' },
      },
    });
    expect(outer.body[2]).toMatchObject({
      kind: 'each',
      condition: 'stray-treasure',
      body: [{ kind: 'move', entity: { kind: 'match' } }],
    });
  });

  it('compiles each in sequence steps, and keeps a subject merely starting with `no` on the predicate parse', () => {
    expect(sequence.steps[0].body[0]).toMatchObject({
      kind: 'phrase',
      phraseKey: 'sweep-note',
      stmtWhen: {
        kind: 'predicate',
        pred: 'is',
        subject: { kind: 'entity', id: 'no-smoking-sign' },
        object: { kind: 'symbol', name: 'spooked' },
      },
    });
    expect(sequence.steps[0].body[1]).toMatchObject({ kind: 'each', condition: 'barn-occupant' });
  });

  it('matches the golden IR snapshot', () => {
    expect(ir).toMatchSnapshot();
  });
});

describe('never-guess gates (each package P3)', () => {
  it('any/no/each over a closed condition revive analysis.closed-condition-selection', () => {
    const errors = gateErrors('quantifier-closed.story');
    expect(errors.map((e) => e.code)).toEqual([
      'analysis.closed-condition-selection',
      'analysis.closed-condition-selection',
      'analysis.closed-condition-selection',
    ]);
    expect(errors[0].span.line).toBe(16); // on … while any sweep-time
    expect(errors[1].span.line).toBe(20); // after … while no sweep-time
    expect(errors[2].span.line).toBe(21); // each sweep-time
    for (const e of errors) {
      expect(e.message).toContain('closed condition');
      expect(e.message).toContain('Reference `it` in the condition');
    }
  });

  it('`the match` outside an each body errors in NameRef and value positions', () => {
    const errors = gateErrors('match-outside-each.story');
    expect(errors.map((e) => e.code)).toEqual(['analysis.match-outside-each', 'analysis.match-outside-each']);
    expect(errors[0].span.line).toBe(16); // change the match to content
    expect(errors[1].span.line).toBe(17); // with animal = the match
    expect(errors[0].message).toContain('`each`-block binder');
  });

  it('a quantifier over a story state is a load error naming the story-state distinction', () => {
    const errors = errorsOf(
      'story "T" by "N"\n  id: t\n  version: 0.0.1\n  states: open-hours, closing-hush\n\n' +
        'create the goat\n\n  on prodding it while any closing-hush\n    phrase nope\n  end on\n\n' +
        'define phrases en-US\n  nope:\n    Nope.\n',
    );
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('analysis.closed-condition-selection');
    expect(errors[0].message).toContain('story state');
  });

  it('a quantifier over an undeclared name is analysis.unknown-condition with a suggestion', () => {
    const errors = errorsOf(
      `${HEADER}define condition barn-occupant: it is in the Barn\n\ncreate the Barn\n  a room\n\ncreate the goat\n\n  on prodding it while any barn-ocupant\n    phrase nope\n  end on\n\ndefine phrases en-US\n  nope:\n    Nope.\n`,
    );
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('analysis.unknown-condition');
    expect(errors[0].message).toContain('did you mean `barn-occupant`');
  });

  it('`must be any <closed-condition>` hits the same closed-condition gate', () => {
    const errors = errorsOf(
      `${HEADER}define condition sweep-time: the player is in the Barn\n\ncreate the Barn\n  a room\n\ncreate the player\n  starts in the Barn\n\ncreate the goat\n\n  on prodding it\n    it must be any sweep-time: nope\n  end on\n\ndefine phrases en-US\n  nope:\n    Nope.\n`,
    );
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('analysis.closed-condition-selection');
  });

  it('the open-condition-truth fix-it names the live forms', () => {
    const errors = errorsOf(
      `${HEADER}define condition barn-occupant: it is in the Barn\n\ncreate the Barn\n  a room\n\ndefine sequence sweep\n  at turn 2\n    phrase nope when barn-occupant\nend sequence\n\ndefine phrases en-US\n  nope:\n    Nope.\n`,
    );
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('analysis.open-condition-truth');
    expect(errors[0].message).toContain('`any barn-occupant` to test for a matching entity');
    expect(errors[0].message).toContain('`no barn-occupant` to test for none');
  });
});

describe('each-body descent (P2 flag 1)', () => {
  it('phase order descends into each bodies — a refusal after an each mutation errors', () => {
    const errors = errorsOf(
      `${HEADER}define condition barn-occupant: it is in the Barn\n\ncreate the Barn\n  a room\n\ncreate the goat\n  states: hungry, content\n\n  on prodding it\n    each barn-occupant\n      change the match to content\n    end each\n    refuse when no barn-occupant: nope\n  end on\n\ndefine phrases en-US\n  nope:\n    Nope.\n`,
    );
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('analysis.refusal-after-mutation');
  });

  it('inline phrase text inside an each body registers its owner-scoped key', () => {
    const result = compile(
      `${HEADER}define condition barn-occupant: it is in the Barn\n\ncreate the Barn\n  a room\n\ncreate the goat\n\n  after prodding it\n    each barn-occupant\n      phrase bulk-note\n        A note per match.\n    end each\n  end after\n`,
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(result.ir.phrases.locales['en-US']['goat.bulk-note']).toBeTruthy();
  });
});

describe('`match` is a reserved declaration name (David, 2026-07-12)', () => {
  it('rejects an entity named match', () => {
    const errors = errorsOf(`${HEADER}create the match\n  a room\n`);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('analysis.reserved-name');
    expect(errors[0].message).toContain('`each`-block binder');
  });

  it('rejects an alias match', () => {
    const errors = errorsOf(`${HEADER}create the lighter\n  aka match\n`);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('analysis.reserved-name');
  });

  it('rejects a trait data field named match', () => {
    const errors = errorsOf(`${HEADER}define trait sporting\n  data\n    match: number\nend trait\n`);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('analysis.reserved-name');
  });

  it('rejects a grammar slot named match', () => {
    const errors = errorsOf(`${HEADER}define action striking\n  grammar\n    strike :match\n`);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('analysis.reserved-name');
  });

  it('keeps multi-word names containing the word legal', () => {
    const errors = errorsOf(`${HEADER}create the smoking match\n`);
    expect(errors).toEqual([]);
  });
});
