/**
 * parser.test.ts — golden parser tests for the Phase A grammar subset.
 *
 * cloak.story here is the design.md §3.1 text verbatim; the AST assertions
 * pin the structures Phase 3 (resolver/IR) consumes. Malformed fixtures pin
 * the resynchronize-and-report behavior (one mistake → one diagnostic,
 * later declarations still parse).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CreateDecl,
  DefineCondition,
  DefinePhrase,
  DefinePhrases,
  DefineText,
  DefineVerb,
  OrdinalBlock,
  parse,
  PhraseStmt,
  SelectOnStmt,
  WhenRule,
} from '../src';

function fixture(name: string): string {
  return readFileSync(join(__dirname, 'fixtures', name), 'utf8');
}

describe('cloak.story (design.md §3.1 verbatim)', () => {
  const result = parse(fixture('cloak.story'));
  const decls = result.ast.declarations;
  const creates = decls.filter((d): d is CreateDecl => d.kind === 'create');

  it('parses with zero diagnostics', () => {
    expect(result.diagnostics).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('reads the story header and fields', () => {
    expect(result.ast.header?.title).toBe('Cloak of Darkness');
    expect(result.ast.header?.author).toBe('Roger Firth (Sharpee implementation)');
    expect(result.ast.header?.fields).toEqual({
      id: 'cloak-of-darkness',
      version: '1.0.0',
      blurb: 'A basic IF demonstration - hang up your cloak!',
    });
  });

  it('has the full declaration inventory', () => {
    expect(decls.map((d) => d.kind)).toEqual([
      'define-condition',
      'create', // Foyer
      'create', // Cloakroom
      'create', // Foyer Bar
      'create', // player
      'create', // velvet cloak
      'create', // brass hook
      'create', // message
      'when-rule',
      'define-verb',
      'define-phrases',
      'define-text',
    ]);
  });

  it('parses the in-darkness condition as a possessive is-predicate', () => {
    const cond = decls[0] as DefineCondition;
    expect(cond.name).toBe('in-darkness');
    expect(cond.condition).toMatchObject({
      kind: 'predicate',
      subject: { kind: 'possessive', field: ['location'] },
      predicate: { kind: 'is', negated: false, value: { kind: 'ref', ref: { words: ['dark'] } } },
    });
  });

  it('parses the Foyer: name, aliases, exits, blocked north exit, description', () => {
    const foyer = creates[0];
    expect(foyer.name).toMatchObject({ article: 'the', words: ['Foyer', 'of', 'the', 'Opera', 'House'] });
    expect(foyer.aka).toEqual(['foyer', 'hall', 'entrance']);
    expect(foyer.compositions).toMatchObject([{ article: 'a', words: ['room'] }]);
    expect(foyer.exits).toMatchObject([
      { direction: 'west', to: { words: ['Cloakroom'] } },
      { direction: 'south', to: { words: ['Foyer', 'Bar'] } },
    ]);
    expect(foyer.blockedExits).toMatchObject([{ direction: 'north', phraseKey: 'cant-leave' }]);
    expect(foyer.description?.text).toContain('You are standing in a spacious hall');
    expect(foyer.description?.text).toContain('doorways south and west.');
  });

  it('parses the bar with the conditional dark trait', () => {
    const bar = creates[2];
    expect(bar.name.words).toEqual(['Foyer', 'Bar']);
    expect(bar.compositions).toHaveLength(2);
    expect(bar.compositions[0]).toMatchObject({ article: 'a', words: ['room'] });
    expect(bar.compositions[1]).toMatchObject({
      article: null,
      words: ['dark'],
      condition: {
        kind: 'predicate',
        subject: { kind: 'ref', ref: { article: 'the', words: ['player'] } },
        predicate: { kind: 'has', thing: { article: 'the', words: ['velvet', 'cloak'] } },
      },
    });
  });

  it('parses the player placement and worn cloak', () => {
    const player = creates[3];
    expect(player.placement).toMatchObject({
      relation: 'starts-in',
      place: { words: ['Foyer', 'of', 'the', 'Opera', 'House'] },
    });
    expect(player.wears).toMatchObject([{ words: ['velvet', 'cloak'] }]);
    expect(player.description?.text).toBe('As good-looking as ever.');
  });

  it('parses the hook: scenery + supporter with capacity 1, placement', () => {
    const hook = creates[5];
    expect(hook.aka).toEqual(['hook', 'peg']);
    expect(hook.compositions).toMatchObject([
      { article: null, words: ['scenery'] },
      { article: 'a', words: ['supporter'], config: [{ key: ['capacity'], value: '1', valueKind: 'number' }] },
    ]);
    expect(hook.placement).toMatchObject({ relation: 'in', place: { words: ['Cloakroom'] } });
  });

  it('parses the message: states, on-reading select with win and lose', () => {
    const message = creates[6];
    expect(message.name.words).toEqual(['message', 'in', 'the', 'sawdust']);
    expect(message.states.map((s) => s.name)).toEqual(['intact', 'trampled', 'obliterated']);
    expect(message.onClauses).toHaveLength(1);
    const on = message.onClauses[0];
    expect(on.action).toBe('reading');
    expect(on.body).toHaveLength(1);
    const select = on.body[0] as SelectOnStmt;
    expect(select.kind).toBe('select-on');
    expect(select.subject).toMatchObject({ kind: 'possessive', field: ['state'] });
    expect(select.arms.map((a) => a.value)).toEqual(['intact', 'trampled', 'obliterated']);
    expect(select.arms[0].body).toMatchObject([
      { kind: 'phrase', phraseKey: 'message-intact' },
      { kind: 'win', phraseKey: null },
    ]);
    expect(select.arms[1].body).toMatchObject([{ kind: 'phrase', phraseKey: 'message-trampled' }]);
    expect(select.arms[2].body).toMatchObject([
      { kind: 'phrase', phraseKey: 'message-obliterated' },
      { kind: 'lose', phraseKey: null },
    ]);
  });

  it('parses the stumble rule: header words, named condition, ordinal blocks', () => {
    const rule = decls[8] as WhenRule;
    expect(rule.headerWords).toEqual(['the', 'player', 'enters', 'the', 'Foyer', 'Bar']);
    expect(rule.condition).toMatchObject({ kind: 'condition-ref', name: 'in-darkness' });
    expect(rule.body).toHaveLength(3);
    expect(rule.body[0]).toMatchObject({ kind: 'phrase', phraseKey: 'stumble' } satisfies Partial<PhraseStmt>);
    const first = rule.body[1] as OrdinalBlock;
    const third = rule.body[2] as OrdinalBlock;
    expect(first).toMatchObject({ kind: 'ordinal', ordinal: 1, ordinalWord: 'first' });
    expect(first.body).toMatchObject([{ kind: 'change', entity: { words: ['message'] }, state: 'trampled' }]);
    expect(third).toMatchObject({ kind: 'ordinal', ordinal: 3, ordinalWord: 'third' });
    expect(third.body).toMatchObject([{ kind: 'change', entity: { words: ['message'] }, state: 'obliterated' }]);
  });

  it('parses the hang verb definition', () => {
    const verb = decls[9] as DefineVerb;
    expect(verb.verbs).toEqual(['hang', 'hook']);
    expect(verb.pattern).toMatchObject([
      { kind: 'word', word: 'put' },
      { kind: 'slot', word: 'something' },
      { kind: 'word', word: 'on' },
      { kind: 'slot', word: 'something' },
    ]);
  });

  it('parses the en-US phrases block: prose joins, markers', () => {
    const phrases = decls[10] as DefinePhrases;
    expect(phrases.locale).toBe('en-US');
    expect(phrases.entries.map((e) => e.key)).toEqual([
      'cant-leave',
      'stumble',
      'message-intact',
      'message-trampled',
      'message-obliterated',
    ]);
    expect(phrases.entries[0].value).toMatchObject({
      form: 'prose',
      text: "You've only just arrived, and besides, the weather outside seems to be getting worse.",
    });
    expect(phrases.entries[1].value).toMatchObject({
      form: 'prose',
      text: "Blundering around in the dark isn't a good idea!",
    });
    expect(phrases.entries[3].value.markers).toMatchObject([{ content: 'garbled' }]);
  });

  it('parses the garbled hatch declaration', () => {
    const hatch = decls[11] as DefineText;
    expect(hatch).toMatchObject({ name: 'garbled', modulePath: './extras.ts' });
  });

  it('matches the golden AST snapshot', () => {
    expect(result.ast).toMatchSnapshot();
  });
});

describe('ac5-random.story (determinism fixture)', () => {
  const result = parse(fixture('ac5-random.story'));

  it('parses with zero diagnostics', () => {
    expect(result.diagnostics).toEqual([]);
  });

  it('parses the randomly strategy phrase with three variants', () => {
    const phrase = result.ast.declarations.find((d): d is DefinePhrase => d.kind === 'define-phrase');
    expect(phrase).toMatchObject({ key: 'crossing-mutter', strategy: 'randomly' });
    expect(phrase?.variants.map((v) => v.text)).toEqual([
      'You mutter about the weather.',
      'You hum a scrap of tune.',
      'Your footsteps echo oddly.',
    ]);
  });

  it('parses one chance in 3 as a chance condition', () => {
    const rules = result.ast.declarations.filter((d): d is WhenRule => d.kind === 'when-rule');
    expect(rules).toHaveLength(3);
    expect(rules[2].condition).toMatchObject({ kind: 'chance', n: 3 });
  });

  it('matches the golden AST snapshot', () => {
    expect(result.ast).toMatchSnapshot();
  });
});

describe('malformed fixtures — one mistake, one diagnostic, parsing continues', () => {
  it('missing end when: single unterminated-block error, later create still parses', () => {
    const result = parse(fixture('malformed/missing-end-when.story'));
    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('parse.unterminated-block');
    expect(errors[0].message).toContain('end when');
    expect(result.ast.declarations.some((d) => d.kind === 'create')).toBe(true);
  });

  it('unknown statement: single error naming the statement, rest of the rule parses', () => {
    const result = parse(fixture('malformed/unknown-statement.story'));
    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('parse.unknown-statement');
    expect(errors[0].message).toContain('frobnicate');
    expect(errors[0].span.line).toBe(6);
    const rule = result.ast.declarations.find((d): d is WhenRule => d.kind === 'when-rule');
    expect(rule?.body).toMatchObject([{ kind: 'phrase', phraseKey: 'stumble' }]);
    expect(result.ast.declarations.some((d) => d.kind === 'define-phrases')).toBe(true);
  });

  it('end mismatch: reports the mismatch and still parses the trailing phrases block', () => {
    const result = parse(fixture('malformed/end-mismatch.story'));
    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.some((e) => e.code === 'parse.end-mismatch')).toBe(true);
    expect(result.ast.declarations.some((d) => d.kind === 'define-phrases')).toBe(true);
  });

  it('unterminated string where a string is required: parse error at the site', () => {
    // A lone `"` lexes as prose punctuation (multi-line dialogue support,
    // 2026-07-11); positions that REQUIRE a string diagnose at parse time.
    const result = parse(fixture('malformed/unterminated-string.story'));
    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    expect(errors.some((e) => e.code === 'parse.text-module' && e.span.line === 5)).toBe(true);
  });
});
