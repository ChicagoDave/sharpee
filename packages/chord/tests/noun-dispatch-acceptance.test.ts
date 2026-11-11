/**
 * noun-dispatch-acceptance.test.ts — the whole decision set, read as one
 * behaviour: a story that decides its responses in the action body by which
 * thing the player named is refused, form by form, and the same story with
 * each response on its owner compiles clean.
 *
 * `gates/noun-dispatch.story` carries each refused form once: an undeclared
 * sort after `is a`, `is a` before a trait adjective, a slot identity test as
 * a refusal, as a statement's `when`, as a `select on` and as a requirement,
 * a refusal written below a statement, a bare refusal after a mutation, a
 * story action that repeats a standard pattern, a flag thing that only holds
 * a state, a thing's own `on` clause on a story action, and a bare head on
 * one. `owner-dispatch.story` is the rewrite, using the two forms a story
 * action runs (a thing's `after` clause, a trait's `on` clause); its
 * run-time behaviour is pinned in story-loader's owner-dispatch-runtime.test.ts.
 *
 * References:
 * - ADR-394 — responses belong to their owners (D2, D3, D4, D5, D6, D7, D9).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const fixture = (...parts: string[]) => readFileSync(join(__dirname, 'fixtures', ...parts), 'utf8');

describe('a noun-dispatch story is refused form by form', () => {
  const result = compile(fixture('gates', 'noun-dispatch.story'));
  const reported = result.diagnostics
    .slice()
    .sort((a, b) => a.span.line - b.span.line)
    .map((d) => `${d.span.line} ${d.severity} ${d.code}`);

  it('reports exactly one diagnostic per refused form, in source order', () => {
    expect(result.ok).toBe(false);
    expect(reported).toEqual([
      '8 warning analysis.flag-entity',
      '44 error analysis.story-action-on-clause',
      '61 error analysis.story-action-bare-head',
      '68 error analysis.unknown-classifier',
      '69 error analysis.unknown-classifier',
      '70 error analysis.slot-identity-test',
      '71 error analysis.slot-identity-test',
      '72 error analysis.slot-identity-test',
      '76 error analysis.refusal-misplaced',
      '98 error analysis.slot-identity-test',
      '101 error analysis.refusal-after-mutation',
      '111 error analysis.repeats-standard-grammar',
    ]);
  });

  it('steers a thing\'s own clause to the two forms a story action runs, and a bare head to the thing acted on', () => {
    const onClause = result.diagnostics.find((d) => d.code === 'analysis.story-action-on-clause')!;
    expect(onClause.message).toBe(
      '`on the player polishing` in `tin cup`\'s block would never run: `polishing` is this story\'s own action, and it runs a thing\'s `after` clauses and the `on` clauses of its traits, never a thing\'s own `on` clause. To react once the action succeeds, write `after the player polishing`. To refuse or answer in the action\'s place, move the clause into a trait and give `tin cup` that trait.',
    );
    const bareHead = result.diagnostics.find((d) => d.code === 'analysis.story-action-bare-head')!;
    expect(bareHead.message).toContain('write `after the player appraising` in its block');
  });

  it('the slot identity fix-it names the forms the rewrite uses, which load and run', () => {
    const identity = result.diagnostics.find((d) => d.code === 'analysis.slot-identity-test')!;
    expect(identity.message).toContain('in `create the glass eye`, write `after the player appraising` to react once the action succeeds, or give the glass eye a trait whose `on the player appraising` clause');
  });

  it('names the trait-adjective fix and the undeclared sort apart', () => {
    const classifiers = result.diagnostics.filter((d) => d.code === 'analysis.unknown-classifier').map((d) => d.message);
    expect(classifiers.some((m) => m.startsWith('`is a scenery`: `scenery` is something a thing is'))).toBe(true);
    expect(classifiers.some((m) => m.startsWith('`a treasure`: `treasure` is not a kind'))).toBe(true);
  });
});

describe('the owner-dispatch rewrite compiles clean', () => {
  it('has no diagnostic of any severity', () => {
    const result = compile(fixture('owner-dispatch.story'));
    expect(result.diagnostics.map((d) => `${d.span.line} ${d.code}`)).toEqual([]);
    expect(result.ok).toBe(true);
  });
});
