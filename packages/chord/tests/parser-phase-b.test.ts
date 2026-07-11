/**
 * parser-phase-b.test.ts — Phase B grammar: define trait/action, role
 * binding, scheduler constructs, define score, hatches, conditional blocked
 * exits, dotted phrase keys, inline-prose phrase sugar (plan phase 2).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from '../src';
import type {
  CreateDecl,
  DefineAction,
  DefineHatch,
  DefineScore,
  DefineSequence,
  DefineTrait,
  EveryRule,
  OnceRule,
  PhraseStmt,
} from '../src';

const fixture = (name: string) => readFileSync(join(__dirname, 'fixtures', name), 'utf8');

function parsedClean(name: string) {
  const result = parse(fixture(name));
  const errors = result.diagnostics.filter((d) => d.severity === 'error');
  expect(errors, `${name} errors: ${errors.map((e) => `${e.span.line} ${e.code} ${e.message}`).join(' | ')}`).toEqual([]);
  return result.ast;
}

describe('zoo-actions.story (design.md §3.4)', () => {
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
    expect(pettable.onClauses).toMatchObject([{ action: 'petting', binding: 'it', role: null }]);
  });

  it('parses entity/flag data fields with starts defaults', () => {
    const feedable = decls.find((d): d is DefineTrait => d.kind === 'define-trait' && d.name === 'feedable')!;
    expect(feedable.data).toMatchObject([
      { name: ['food'], type: 'entity', initial: null },
      { name: ['fed'], type: 'flag', initial: 'false' },
    ]);
  });

  it('parses entity-name config values and prose-block overrides in create', () => {
    const goats = decls.find((d): d is CreateDecl => d.kind === 'create' && d.name.words.join(' ') === 'pygmy goats')!;
    const feedable = goats.compositions.find((comp) => comp.words[0] === 'feedable')!;
    expect(feedable.config).toMatchObject([{ key: ['food'], value: 'handful of feed', valueKind: 'name' }]);
    expect(goats.phraseOverrides).toMatchObject([{ key: 'fed' }]);
    expect(goats.phraseOverrides[0].value.text).toContain('Happy chaos');
  });

  it('parses define score declarations', () => {
    const scores = decls.filter((d): d is DefineScore => d.kind === 'define-score');
    expect(scores).toMatchObject([
      { name: 'pet-an-animal', worth: 5 },
      { name: 'feed-the-goats', worth: 10 },
    ]);
  });

  it('matches the golden AST snapshot', () => {
    expect(ast).toMatchSnapshot();
  });
});

describe('zoo-timeline.story (design.md §3.3)', () => {
  const ast = parsedClean('zoo-timeline.story');
  const decls = ast.declarations;

  it('parses every-turn trait clauses with can-see + chance conditions', () => {
    const chatty = decls.find((d): d is DefineTrait => d.kind === 'define-trait' && d.name === 'chatty')!;
    expect(chatty.onClauses[0]).toMatchObject({ binding: 'every-turn', action: 'every-turn' });
    expect(chatty.onClauses[0].condition).not.toBeNull();
  });

  it('parses the closing-time sequence: 4 steps, at-turn then relative', () => {
    const seq = decls.find((d): d is DefineSequence => d.kind === 'define-sequence')!;
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
    // The last step carries the flag flip after its phrase.
    expect(seq.steps[3].body.map((s) => s.kind)).toEqual(['phrase', 'set']);
  });

  it('parses once + every rules with inline-prose phrases', () => {
    const once = decls.find((d): d is OnceRule => d.kind === 'once-rule')!;
    expect(once.condition).toMatchObject({ kind: 'condition-ref', name: 'after-hours' });
    expect(once.body.map((s) => s.kind)).toEqual(['move', 'phrase']);
    expect((once.body[1] as PhraseStmt).phraseKey).toBe('zoo.after-hours.keeper-leaves');

    const every = decls.find((d): d is EveryRule => d.kind === 'every-rule')!;
    expect(every).toMatchObject({ turns: 3, times: 4 });
    expect((every.body[0] as PhraseStmt).inlineText?.text).toContain('bleats');
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

describe('traits-basic.story (design.md §2.2/§3.2)', () => {
  const ast = parsedClean('traits-basic.story');
  const decls = ast.declarations;

  it('parses before-ordering and role binding', () => {
    const lockable = decls.find((d): d is DefineTrait => d.kind === 'define-trait' && d.name === 'lockable')!;
    expect(lockable.onClauses[0].ordering).toEqual({ relation: 'before', trait: 'openable' });

    const limit = decls.find((d): d is DefineTrait => d.kind === 'define-trait' && d.name === 'carrying-limit')!;
    expect(limit.onClauses[0]).toMatchObject({ action: 'taking', binding: 'role', role: 'taker' });
    expect(limit.data).toMatchObject([
      { name: ['max', 'items'], type: 'number', optional: true },
      { name: ['body', 'part'], type: 'name', optional: true },
    ]);
  });

  it('parses cardinality arrows in action grammar', () => {
    const snoozing = decls.find((d): d is DefineAction => d.kind === 'define-action' && d.name === 'snoozing')!;
    expect(snoozing.patterns[1].cardinality).toEqual(['each', 'quiet', 'corner']);
  });

  it('parses action and behavior hatches', () => {
    const hatches = decls.filter((d): d is DefineHatch => d.kind === 'define-hatch');
    expect(hatches).toMatchObject([
      { hatchKind: 'action', name: 'juggling', modulePath: './stunts.ts' },
      { hatchKind: 'behavior', name: 'crowd-control', modulePath: './stunts.ts' },
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

  it('every without a turn count', () => {
    const result = parse(fixture('malformed/every-bad-header.story'));
    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    expect(errors.some((e) => e.code === 'parse.every-turns' && e.span.line === 5)).toBe(true);
  });

  it('action refusal missing its colon', () => {
    const result = parse(fixture('malformed/action-bad-refusal.story'));
    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    expect(errors.some((e) => e.code === 'parse.action-refusal' && e.span.line === 8)).toBe(true);
  });
});
