/**
 * parser-each-package.test.ts — the each package's Phase 2 parse gate
 * (ratchet E1/E2/E3, 2026-07-12): `any <name>` / `no <name>` condition
 * forms wherever conditions parse, the `each <name> … end each` block in
 * all four approved host positions (on/after clause bodies, action bodies,
 * trait clause bodies, sequence steps), the `the match` value form, and
 * the parse-time top-level-`each` rejection. Analyzer gates and IR shapes
 * are Phase 3 — this suite parses only (no compile()).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from '../src';
import type {
  ChangeStmt,
  CreateDecl,
  DefineAction,
  DefineSequence,
  DefineTrait,
  EachStmt,
  PhraseStmt,
} from '../src';

const fixture = (name: string) => readFileSync(join(__dirname, 'fixtures', name), 'utf8');

function parsedClean(name: string) {
  const result = parse(fixture(name));
  const errors = result.diagnostics.filter((d) => d.severity === 'error');
  expect(errors, `${name} errors: ${errors.map((e) => `${e.span.line} ${e.code} ${e.message}`).join(' | ')}`).toEqual([]);
  return result.ast;
}

describe('each-package.story (E1 any / E2 no / E3 each, ratchet 2026-07-12)', () => {
  const ast = parsedClean('each-package.story');
  const decls = ast.declarations;
  const trait = decls.find((d): d is DefineTrait => d.kind === 'define-trait' && d.name === 'skittish')!;
  const action = decls.find((d): d is DefineAction => d.kind === 'define-action' && d.name === 'tallying')!;
  const goat = decls.find((d): d is CreateDecl => d.kind === 'create' && d.name.words.join(' ') === 'pygmy goat')!;
  const sequence = decls.find((d): d is DefineSequence => d.kind === 'define-sequence')!;

  it('parses any/no in clause while, blocked exits, action refusals, refuse-when, and when suffixes', () => {
    expect(trait.onClauses[0].condition).toMatchObject({ kind: 'any-of', condition: 'alarm-trigger' });
    expect(trait.onClauses[0].body[0]).toMatchObject({
      kind: 'refuse-when',
      condition: { kind: 'none-of', condition: 'stray-treasure' },
      phraseKey: 'all-clear',
    });
    const barn = decls.find((d): d is CreateDecl => d.kind === 'create' && d.name.words.join(' ') === 'Trophy Barn')!;
    expect(barn.blockedExits[0].condition).toMatchObject({ kind: 'any-of', condition: 'alarm-trigger' });
    expect(action.refusals[0]).toMatchObject({
      kind: 'when',
      condition: { kind: 'none-of', condition: 'stray-treasure' },
      phraseKey: 'nothing-stray',
    });
    const tallyNote = action.body[1] as PhraseStmt;
    expect(tallyNote.stmtWhen).toMatchObject({ kind: 'any-of', condition: 'stray-treasure' });
    expect(goat.onClauses[0].condition).toMatchObject({ kind: 'none-of', condition: 'alarm-trigger' });
  });

  it('keeps a subject that merely starts with `no` on the ordinary predicate parse', () => {
    const guardNote = sequence.steps[0].body[1] as PhraseStmt;
    expect(guardNote.stmtWhen).toMatchObject({
      kind: 'predicate',
      subject: { kind: 'ref', ref: { words: ['no', 'smoking', 'sign'] } },
      predicate: { kind: 'is' },
    });
  });

  it('parses each blocks in trait clause bodies and action bodies', () => {
    const traitEach = trait.onClauses[0].body[1] as EachStmt;
    expect(traitEach).toMatchObject({ kind: 'each', condition: 'hungry-neighbor' });
    expect(traitEach.body.map((s) => s.kind)).toEqual(['change']);
    const actionEach = action.body[0] as EachStmt;
    expect(actionEach).toMatchObject({ kind: 'each', condition: 'stray-treasure' });
    expect(actionEach.body.map((s) => s.kind)).toEqual(['move']);
  });

  it('parses each blocks in entity after-clause bodies, nesting to the innermost', () => {
    expect(goat.onClauses[0]).toMatchObject({ clauseKind: 'after', action: 'feeding' });
    const outer = goat.onClauses[0].body[0] as EachStmt;
    expect(outer).toMatchObject({ kind: 'each', condition: 'hungry-neighbor' });
    expect(outer.body.map((s) => s.kind)).toEqual(['change', 'phrase', 'phrase', 'each']);
    const inner = outer.body[3] as EachStmt;
    expect(inner).toMatchObject({ kind: 'each', condition: 'stray-treasure' });
    expect(inner.body.map((s) => s.kind)).toEqual(['move']);
  });

  it('parses each blocks in sequence steps', () => {
    const stepEach = sequence.steps[0].body[2] as EachStmt;
    expect(stepEach).toMatchObject({ kind: 'each', condition: 'hungry-neighbor' });
    expect(stepEach.body.map((s) => s.kind)).toEqual(['change']);
  });

  it('parses the match as a value form, and as a name reference in change/move positions', () => {
    const outer = goat.onClauses[0].body[0] as EachStmt;
    // Param binding: `with animal = the match` — the value-primary form.
    const fedNote = outer.body[1] as PhraseStmt;
    expect(fedNote.params).toMatchObject([{ param: ['animal'], value: { kind: 'match' } }]);
    // Condition subject: `when the match is hungry`.
    const hungryNote = outer.body[2] as PhraseStmt;
    expect(hungryNote.stmtWhen).toMatchObject({
      kind: 'predicate',
      subject: { kind: 'match' },
      predicate: { kind: 'is' },
    });
    // NameRef positions (`change`/`move` targets) stay name references —
    // resolved to the binder at analysis, exactly as `it` is.
    const change = outer.body[0] as ChangeStmt;
    expect(change.entity).toMatchObject({ article: 'the', words: ['match'] });
  });

  it('matches the golden AST snapshot', () => {
    expect(ast).toMatchSnapshot();
  });
});

describe('must be any <name> (membership, David 2026-07-12 — P3)', () => {
  const mustLine = (predicate: string) =>
    ['create the shed', '  a room', '', '  on prodding it', `    it must ${predicate}: nope`, '  end on'].join('\n');

  it('parses standalone `be any <name>` as the is-any predicate', () => {
    const result = parse(mustLine('be any barn-occupant'));
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const shed = result.ast.declarations.find((d): d is CreateDecl => d.kind === 'create')!;
    expect(shed.onClauses[0].body[0]).toMatchObject({
      kind: 'must',
      predicate: { kind: 'is-any', condition: 'barn-occupant' },
      phraseKey: 'nope',
    });
  });

  it('keeps a value that merely starts with `any` on the ordinary parse', () => {
    const result = parse(mustLine('be any old thing'));
    const shed = result.ast.declarations.find((d): d is CreateDecl => d.kind === 'create')!;
    expect(shed.onClauses[0].body[0]).toMatchObject({
      kind: 'must',
      predicate: { kind: 'is' },
    });
  });

  it('rejects standalone `be no <name>` with parse.must-negative', () => {
    const result = parse(mustLine('be no stray-treasure'));
    expect(result.diagnostics.some((d) => d.code === 'parse.must-negative')).toBe(true);
  });
});

describe('each host positions (parse-time, never top-level)', () => {
  it('rejects a top-level each block with parse.each-top-level', () => {
    const result = parse('story "T" by "A"\n\neach stray-treasure\n  phrase tidy\nend each\n');
    expect(result.ok).toBe(false);
    expect(result.diagnostics.some((d) => d.code === 'parse.each-top-level')).toBe(true);
  });

  it('diagnoses a missing condition name and a malformed header', () => {
    const src = [
      'create the shed',
      '  a room',
      '',
      '  on prodding it',
      '    each',
      '      phrase tidy',
      '    end each',
      '  end on',
    ].join('\n');
    const result = parse(src);
    expect(result.diagnostics.some((d) => d.code === 'parse.each-condition')).toBe(true);
  });
});
