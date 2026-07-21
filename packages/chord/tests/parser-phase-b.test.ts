/**
 * parser-phase-b.test.ts — Phase B grammar under the ownership package:
 * define trait/action, trait states, role binding, sequences (wall-clock and
 * becomes-anchored steps), owner-attached scores, must/refuse-when, the
 * statement `when` suffix, hatches, conditional blocked exits, dotted phrase
 * keys, inline-prose phrase sugar.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from '../src';
import type {
  CreateDecl,
  DefineAction,
  DefineHatch,
  DefineSequence,
  DefineTrait,
  PhraseStmt,
} from '../src';

const fixture = (name: string) => readFileSync(join(__dirname, 'fixtures', name), 'utf8');

function parsedClean(name: string) {
  const result = parse(fixture(name));
  const errors = result.diagnostics.filter((d) => d.severity === 'error');
  expect(errors, `${name} errors: ${errors.map((e) => `${e.span.line} ${e.code} ${e.message}`).join(' | ')}`).toEqual([]);
  return result.ast;
}

describe('zoo-actions.story (design.md §3.4 + ownership package)', () => {
  const ast = parsedClean('zoo-actions.story');
  const decls = ast.declarations;

  it('parses define action with grammar, constraint, refusals, otherwise, phrases', () => {
    const petting = decls.find((d): d is DefineAction => d.kind === 'define-action' && d.name === 'petting')!;
    expect(petting.patterns).toHaveLength(2);
    expect(petting.patterns[0].parts).toMatchObject([
      { kind: 'word', word: 'pet' },
      { kind: 'slot', word: 'animal' },
    ]);
    expect(petting.constraints).toMatchObject([{ slot: 'animal', requirement: 'reachable' }]);
    expect(petting.refusals).toMatchObject([{ kind: 'without', slot: 'animal', phraseKey: 'pet-what' }]);
    expect(petting.otherwise).toMatchObject({ phraseKey: 'cant-pet' });
    expect(petting.phrases?.entries.map((e) => e.key)).toEqual(['pet-what', 'cant-pet']);
  });

  it('parses define trait with one-of data, phrases, and an it-bound clause', () => {
    const pettable = decls.find((d): d is DefineTrait => d.kind === 'define-trait' && d.name === 'pettable')!;
    expect(pettable.data).toMatchObject([
      { name: ['kind'], type: 'one-of', oneOf: ['goats', 'rabbits', 'parrot', 'snake'], optional: false },
    ]);
    expect(pettable.phrases?.entries).toHaveLength(4);
    expect(pettable.onClauses).toMatchObject([{ clauseKind: 'on', action: 'petting', binding: 'it', role: null }]);
  });

  it('parses entity data fields and trait states with reversible', () => {
    const feedable = decls.find((d): d is DefineTrait => d.kind === 'define-trait' && d.name === 'feedable')!;
    expect(feedable.data).toMatchObject([{ name: ['food'], type: 'entity', initial: null }]);
    expect(feedable.states.map((s) => s.name)).toEqual(['hungry', 'content']);
    expect(feedable.statesReversible).toBe(true);
  });

  it('parses must requirements and refuse-when statements in trait clauses', () => {
    const feedable = decls.find((d): d is DefineTrait => d.kind === 'define-trait' && d.name === 'feedable')!;
    expect(feedable.onClauses[0].body.map((s) => s.kind)).toEqual(['must', 'must', 'change', 'emit', 'phrase']);
    expect(feedable.onClauses[0].body[0]).toMatchObject({ kind: 'must', phraseKey: 'no-food', predicate: { kind: 'has' } });
    expect(feedable.onClauses[0].body[1]).toMatchObject({ kind: 'must', phraseKey: 'already-fed', predicate: { kind: 'is' } });
    const pettable = decls.find((d): d is DefineTrait => d.kind === 'define-trait' && d.name === 'pettable')!;
    expect(pettable.onClauses[0].body[0]).toMatchObject({ kind: 'refuse-when', phraseKey: 'glass-way' });
  });

  it('parses entity-name config values and prose-block overrides in create', () => {
    const goats = decls.find((d): d is CreateDecl => d.kind === 'create' && d.name.words.join(' ') === 'pygmy goats')!;
    const feedable = goats.compositions.find((comp) => comp.words[0] === 'feedable')!;
    expect(feedable.config).toMatchObject([{ key: ['food'], value: 'handful of feed', valueKind: 'name' }]);
    expect(goats.phraseOverrides).toMatchObject([{ key: 'fed' }]);
    expect(goats.phraseOverrides[0].variants[0].text).toContain('Happy chaos');
  });

  it('parses owner-attached score lines and the after-feeding reaction', () => {
    const pettable = decls.find((d): d is DefineTrait => d.kind === 'define-trait' && d.name === 'pettable')!;
    expect(pettable.scores).toMatchObject([{ name: 'petted', worth: 5 }]);
    const goats = decls.find((d): d is CreateDecl => d.kind === 'create' && d.name.words.join(' ') === 'pygmy goats')!;
    expect(goats.scores).toMatchObject([{ name: 'fed', worth: 10 }]);
    expect(goats.onClauses).toMatchObject([{ clauseKind: 'after', action: 'feeding', binding: 'it' }]);
    expect(goats.onClauses[0].body).toMatchObject([{ kind: 'award', expression: ['fed'] }]);
  });

  it('matches the golden AST snapshot', () => {
    expect(ast).toMatchSnapshot();
  });
});

describe('zoo-timeline.story (design.md §3.3 + ownership package)', () => {
  const ast = parsedClean('zoo-timeline.story');
  const decls = ast.declarations;
  const sequences = decls.filter((d): d is DefineSequence => d.kind === 'define-sequence');

  it('parses the story header states line', () => {
    expect(ast.header?.states.map((s) => s.name)).toEqual(['open', 'after-hours']);
    expect(ast.header?.statesReversible).toBe(false);
  });

  it('parses every-turn trait clauses with can-see + chance conditions', () => {
    const chatty = decls.find((d): d is DefineTrait => d.kind === 'define-trait' && d.name === 'chatty')!;
    expect(chatty.onClauses[0]).toMatchObject({ binding: 'every-turn', action: 'every-turn' });
    expect(chatty.onClauses[0].condition).not.toBeNull();
  });

  it('parses the closing-time sequence: 4 steps ending in a story transition', () => {
    const seq = sequences[0];
    expect(seq.name).toEqual(['closing', 'time']);
    expect(seq.steps.map((s) => [s.timing, s.turns])).toEqual([
      ['at-turn', 5],
      ['later', 5],
      ['later', 5],
      ['later', 5],
    ]);
    const firstPhrase = seq.steps[0].body[0] as PhraseStmt;
    expect(firstPhrase).toMatchObject({ kind: 'phrase', phraseKey: 'zoo.pa.closing-3' });
    expect(firstPhrase.inlineText?.text).toContain('closing in three hours');
    // The last step flips the story phase after its phrase (ratchet D2).
    expect(seq.steps[3].body.map((s) => s.kind)).toEqual(['phrase', 'change']);
    expect(seq.steps[3].body[1]).toMatchObject({ kind: 'change', entity: { words: ['story'] }, state: 'after-hours' });
  });

  it('parses the lockup sequence with a becomes-anchored step (ratchet D10)', () => {
    expect(sequences.map((s) => s.name.join(' '))).toEqual(['closing time', 'lockup', 'goat bleats']);
    const lockup = sequences[1];
    expect(lockup.steps).toHaveLength(1);
    expect(lockup.steps[0]).toMatchObject({ timing: 'becomes', turns: 0, state: 'after-hours' });
    expect(lockup.steps[0].owner).toMatchObject({ words: ['story'] });
    const bleats = sequences[2];
    expect(bleats.steps.map((s) => [s.timing, s.turns])).toEqual([
      ['at-turn', 3],
      ['later', 3],
      ['later', 3],
      ['later', 3],
    ]);
  });

  it("parses Sam's once-gated every-turn clause with a statement when suffix", () => {
    const sam = decls.find((d): d is CreateDecl => d.kind === 'create' && d.name.words[0] === 'Sam')!;
    expect(sam.onClauses).toHaveLength(1);
    const clause = sam.onClauses[0];
    expect(clause).toMatchObject({ clauseKind: 'on', action: 'every-turn', binding: 'every-turn', once: true });
    expect(clause.condition).toMatchObject({ kind: 'condition-ref', name: 'after-hours' });
    expect(clause.body.map((s) => s.kind)).toEqual(['move', 'phrase', 'phrase']);
    const leaves = clause.body[1] as PhraseStmt;
    expect(leaves.phraseKey).toBe('zoo.after-hours.keeper-leaves');
    expect(leaves.inlineText?.text).toContain('waves goodnight');
    const wave = clause.body[2] as PhraseStmt;
    expect(wave.phraseKey).toBe('keeper-wave');
    expect(wave.stmtWhen).toMatchObject({ kind: 'predicate' });
  });

  it('parses conditional trait composition on the parrot', () => {
    const parrot = decls.find((d): d is CreateDecl => d.kind === 'create' && d.name.words.join(' ') === 'parrot')!;
    const conditions = parrot.compositions.filter((comp) => comp.condition !== null).map((comp) => comp.words[0]);
    expect(conditions).toEqual(['chatty', 'candid']);
  });

  it('matches the golden AST snapshot', () => {
    expect(ast).toMatchSnapshot();
  });
});

describe('traits-basic.story (design.md §2.2/§3.2 + ownership package)', () => {
  const ast = parsedClean('traits-basic.story');
  const decls = ast.declarations;

  it('parses before-ordering and role binding', () => {
    const barrable = decls.find((d): d is DefineTrait => d.kind === 'define-trait' && d.name === 'barrable')!;
    expect(barrable.onClauses[0].ordering).toEqual({ relation: 'before', trait: 'sealable' });
    expect(barrable.onClauses[0].body[0]).toMatchObject({ kind: 'refuse-when', phraseKey: 'barred' });

    const limit = decls.find((d): d is DefineTrait => d.kind === 'define-trait' && d.name === 'carrying-limit')!;
    expect(limit.onClauses[0]).toMatchObject({ action: 'taking', binding: 'role', role: 'taker' });
    expect(limit.data).toMatchObject([
      { name: ['max', 'items'], type: 'number', optional: true },
      { name: ['body', 'part'], type: 'name', optional: true },
    ]);
  });

  it('parses trait states with reversible and must/change/when-suffix statements', () => {
    const sealable = decls.find((d): d is DefineTrait => d.kind === 'define-trait' && d.name === 'sealable')!;
    expect(sealable.states.map((s) => s.name)).toEqual(['sealed', 'ajar']);
    expect(sealable.statesReversible).toBe(true);
    const body = sealable.onClauses[0].body;
    expect(body.map((s) => s.kind)).toEqual(['must', 'change', 'emit', 'phrase']);
    expect(body[0]).toMatchObject({ kind: 'must', phraseKey: 'already-ajar', predicate: { kind: 'is' } });
    expect(body[1]).toMatchObject({ kind: 'change', state: 'ajar' });
    expect((body[3] as PhraseStmt).stmtWhen).toMatchObject({ kind: 'and' });
  });

  it('parses cardinality arrows and the action-owned score line', () => {
    const snoozing = decls.find((d): d is DefineAction => d.kind === 'define-action' && d.name === 'snoozing')!;
    expect(snoozing.patterns[1].cardinality).toEqual(['each', 'quiet', 'corner']);
    expect(snoozing.scores).toMatchObject([{ name: 'napped', worth: 1 }]);
  });

  it('parses the action hatch (`define behavior` removed by ADR-235 D2)', () => {
    const hatches = decls.filter((d): d is DefineHatch => d.kind === 'define-hatch');
    expect(hatches).toMatchObject([
      { hatchKind: 'action', name: 'juggling', modulePath: './stunts.ts' },
    ]);
  });

  it('parses conditional blocked exits', () => {
    const room = decls.find((d): d is CreateDecl => d.kind === 'create' && d.name.words.join(' ') === 'Break Room')!;
    expect(room.blockedExits[0]).toMatchObject({ direction: 'north', phraseKey: 'closed-up' });
    expect(room.blockedExits[0].condition).toMatchObject({ kind: 'condition-ref', name: 'after-hours' });
  });

  it('matches the golden AST snapshot', () => {
    expect(ast).toMatchSnapshot();
  });
});

describe('malformed Phase B fixtures — one mistake, one diagnostic', () => {
  it('trait without end trait', () => {
    const result = parse(fixture('malformed/trait-unterminated.story'));
    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    expect(errors.some((e) => e.code === 'parse.unterminated-block')).toBe(true);
    expect(result.ast.declarations.some((d) => d.kind === 'create')).toBe(true);
  });

  it('sequence with a bad step header', () => {
    const result = parse(fixture('malformed/sequence-bad-step.story'));
    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    expect(errors.some((e) => e.code === 'parse.sequence-step' && e.span.line === 9)).toBe(true);
  });

  it('top-level every rule: removal diagnostic (ownership package)', () => {
    const result = parse(fixture('malformed/every-bad-header.story'));
    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    expect(errors.some((e) => e.code === 'parse.removed-every' && e.span.line === 5)).toBe(true);
    expect(errors.some((e) => e.message.includes('define sequence'))).toBe(true);
  });

  it('action refusal missing its colon', () => {
    const result = parse(fixture('malformed/action-bad-refusal.story'));
    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    expect(errors.some((e) => e.code === 'parse.action-refusal' && e.span.line === 8)).toBe(true);
  });
});

describe('trait data-field trailing tokens (zoo-chain finding, 2026-07-12)', () => {
  it('an uncomma\'d `starts` tail is a parse error, not a silently dropped initial', () => {
    const src = 'story "T" by "N"\n  id: t\n  version: 0.0.1\n\ndefine trait shiny\n  data\n    shine: number starts 1\nend trait\n';
    const result = parse(src);
    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    expect(errors.some((d) => d.code === 'parse.trait-field-trailing')).toBe(true);
  });

  it('the comma form still parses with the initial captured', () => {
    const src = 'story "T" by "N"\n  id: t\n  version: 0.0.1\n\ndefine trait shiny\n  data\n    shine: number, starts 1\nend trait\n';
    const result = parse(src);
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const trait = result.ast.declarations.find((d) => d.kind === 'define-trait') as { data: Array<{ initial: string | null }> };
    expect(trait.data[0].initial).toBe('1');
  });
});
