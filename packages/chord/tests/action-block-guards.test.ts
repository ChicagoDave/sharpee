/**
 * action-block-guards.test.ts — what a `define action` block may test, and
 * where its refusals stand.
 *
 * Two gates. `analysis.slot-identity-test` refuses an action that decides
 * its response by testing which thing the player named (the slot compared
 * for identity with a named thing, or a `select on` over an entity slot),
 * and names the thing and the clause to write on it instead. The refusal
 * placement gate refuses a refusal line written below the action's first
 * body statement: a bare `refuse` there never fires, and a `refuse when`,
 * `refuse without` or requirement there runs before the body anyway.
 *
 * References:
 * - ADR-394 D4 — an action does not dispatch on which thing was named.
 * - ADR-394 D5 (ADR-289 D3 reaching the action block) — refusals lead the block.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile, validateIR } from '../src';

const fixture = (name: string) => readFileSync(join(__dirname, 'fixtures', name), 'utf8');

function sortedErrors(name: string) {
  const result = compile(fixture(join('gates', name)));
  return {
    ok: result.ok,
    errors: result.diagnostics
      .filter((d) => d.severity === 'error')
      .slice()
      .sort((a, b) => a.span.line - b.span.line),
  };
}

describe('an action that tests which thing was named is refused (analysis.slot-identity-test)', () => {
  const { ok, errors } = sortedErrors('slot-identity-test.story');

  it('reports the refusal, the requirement, the negated `when` suffix and the `select on`, and nothing else', () => {
    expect(ok).toBe(false);
    expect(errors.map((d) => `${d.span.line} ${d.code}`)).toEqual([
      '16 analysis.slot-identity-test',
      '17 analysis.slot-identity-test',
      '20 analysis.slot-identity-test',
      '22 analysis.slot-identity-test',
    ]);
  });

  it('names the thing and the clause to write on it, in the polarity written', () => {
    expect(errors[0].message).toBe(
      '`the item is the sword` asks which thing the player named. A response that belongs to one thing is written on that thing: in `create the sword`, write `on the player valuing` and put the response there. To ask what sort of thing it is, `the item is a <kind or trait>` is the test.',
    );
    expect(errors[2].message).toContain('`the item is not the sword` asks which thing the player named.');
  });

  it('names the `select on` spelling as the same test', () => {
    expect(errors[3].message).toContain('`select on the item` picks a response by which thing the player named.');
    expect(errors[3].message).toContain('write `on the player valuing`');
  });

  it('leaves `is a <trait>`, `holds the item`, a named condition, a direction slot and an owner\'s own clause alone', () => {
    // Lines 18, 19, 21: is-a with holds, `must be any`, is-a in a `when`;
    // line 39: the directions slot tested against a word; line 58: the
    // sword's own clause.
    for (const line of [18, 19, 21, 39, 58]) {
      expect(errors.some((d) => d.span.line === line)).toBe(false);
    }
  });

  it('is a fact of the IR alone: validateIR reports it on a clean IR edited to carry the test', () => {
    const clean = compile(fixture('trait-classification.story'));
    expect(clean.ok).toBe(true);
    const ir = structuredClone(clean.ir);
    const appraising = ir.actions.find((a) => a.name === 'appraising')!;
    appraising.refusals.push({
      kind: 'when',
      condition: {
        kind: 'predicate',
        pred: 'is',
        negated: false,
        subject: { kind: 'slot', name: 'item' },
        object: { kind: 'entity', id: 'clay-pot' },
      },
      phraseKey: 'worthless',
      span: { line: 99, column: 3, endLine: 99, endColumn: 40 },
    });
    const diagnostics = validateIR(ir);
    expect(diagnostics.map((d) => `${d.span.line} ${d.code}`)).toEqual(['99 analysis.slot-identity-test']);
    expect(diagnostics[0].message).toContain('in `create the clay pot`, write `on the player appraising`');
  });
});

describe('refusals lead the action block (analysis.refusal-misplaced)', () => {
  const { ok, errors } = sortedErrors('action-refusal-misplaced.story');

  it('reports the hoisted refusal, the hoisted requirement and the bare refusal below the first statement, and nothing else', () => {
    expect(ok).toBe(false);
    expect(errors.map((d) => `${d.span.line} ${d.code}`)).toEqual([
      '14 analysis.refusal-misplaced',
      '15 analysis.refusal-misplaced',
      '17 analysis.refusal-misplaced',
    ]);
  });

  it('says a hoisted line runs before the body wherever it is written', () => {
    expect(errors[0].message).toBe(
      'Refusal below `phrase` — it runs before the action\'s body whatever line it is written on, so it must lead the block. Move `refuse when …: here` above the first `phrase`.',
    );
    expect(errors[1].message).toContain('Move `… must …: elsewhere` above the first `phrase`.');
  });

  it('keeps the dead bare refusal on the existing clause-body wording', () => {
    expect(errors[2].message).toBe('Refusal after `phrase` — refusals must lead the clause. Move `refuse nope` above the first `phrase`.');
  });

  it('leaves refusal lines above the first statement and `otherwise refuse` below it alone (lines 11, 12, 16)', () => {
    for (const line of [11, 12, 16]) {
      expect(errors.some((d) => d.span.line === line)).toBe(false);
    }
  });
});
