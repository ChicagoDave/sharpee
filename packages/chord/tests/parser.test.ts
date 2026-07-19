/**
 * parser.test.ts — golden parser tests for the core grammar (ownership
 * package, 2026-07-11).
 *
 * cloak.story here is the design.md §3.1 text updated to the ownership
 * grammar (behaviors live on their owners as `on`/`after` clauses); the AST
 * assertions pin the structures Phase 3 (resolver/IR) consumes. Malformed
 * fixtures pin the resynchronize-and-report behavior (one mistake → one
 * diagnostic, later declarations still parse), and the removals describe
 * pins the ownership-package parse errors with their fix-its.
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
} from '../src';

function fixture(name: string): string {
  return readFileSync(join(__dirname, 'fixtures', name), 'utf8');
}

describe('cloak.story (design.md §3.1, ownership grammar)', () => {
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
    expect(on.clauseKind).toBe('on');
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

  it('parses the bar stumble reaction: after-clause, named condition, ordinal blocks', () => {
    const bar = creates[2];
    expect(bar.onClauses).toHaveLength(1);
    const clause = bar.onClauses[0];
    expect(clause).toMatchObject({ clauseKind: 'after', action: 'entering', binding: 'it', once: false });
    expect(clause.condition).toMatchObject({ kind: 'condition-ref', name: 'in-darkness' });
    expect(clause.body).toHaveLength(3);
    expect(clause.body[0]).toMatchObject({ kind: 'phrase', phraseKey: 'stumble' } satisfies Partial<PhraseStmt>);
    const first = clause.body[1] as OrdinalBlock;
    const third = clause.body[2] as OrdinalBlock;
    expect(first).toMatchObject({ kind: 'ordinal', ordinal: 1, ordinalWord: 'first' });
    expect(first.body).toMatchObject([{ kind: 'change', entity: { words: ['message'] }, state: 'trampled' }]);
    expect(third).toMatchObject({ kind: 'ordinal', ordinal: 3, ordinalWord: 'third' });
    expect(third.body).toMatchObject([{ kind: 'change', entity: { words: ['message'] }, state: 'obliterated' }]);
  });

  it('parses the hang verb definition', () => {
    const verb = decls[8] as DefineVerb;
    expect(verb.verbs).toEqual(['hang', 'hook']);
    expect(verb.pattern).toMatchObject([
      { kind: 'word', word: 'put' },
      { kind: 'slot', word: 'something' },
      { kind: 'word', word: 'on' },
      { kind: 'slot', word: 'something' },
    ]);
  });

  it('parses the en-US phrases block: prose joins, markers', () => {
    const phrases = decls[9] as DefinePhrases;
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
    const hatch = decls[10] as DefineText;
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

  it('parses one chance in 3 as an after-clause while condition', () => {
    const west = result.ast.declarations.filter((d): d is CreateDecl => d.kind === 'create')[1];
    expect(west.name.words).toEqual(['West', 'Room']);
    expect(west.onClauses).toHaveLength(2);
    expect(west.onClauses[0]).toMatchObject({ clauseKind: 'after', action: 'entering', condition: null });
    expect(west.onClauses[1]).toMatchObject({ clauseKind: 'after', action: 'entering' });
    expect(west.onClauses[1].condition).toMatchObject({ kind: 'chance', n: 3 });
  });

  it('matches the golden AST snapshot', () => {
    expect(result.ast).toMatchSnapshot();
  });
});

describe('malformed fixtures — one mistake, one diagnostic, parsing continues', () => {
  it('top-level when rule: removal diagnostic with the owner fix-it, later declarations still parse', () => {
    const result = parse(fixture('malformed/missing-end-when.story'));
    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('parse.removed-when');
    expect(errors[0].message).toContain('after <verb> it');
    expect(result.ast.declarations.some((d) => d.kind === 'create')).toBe(true);
    expect(result.ast.declarations.some((d) => d.kind === 'define-phrases')).toBe(true);
  });

  it('missing end after: single unterminated-block error, later create still parses', () => {
    const result = parse(fixture('malformed/missing-end-after.story'));
    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('parse.unterminated-block');
    expect(errors[0].message).toContain('end after');
    const creates = result.ast.declarations.filter((d): d is CreateDecl => d.kind === 'create');
    expect(creates.length).toBeGreaterThanOrEqual(2);
  });

  it('unknown statement: single error naming the statement, rest of the clause parses', () => {
    const result = parse(fixture('malformed/unknown-statement.story'));
    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('parse.unknown-statement');
    expect(errors[0].message).toContain('frobnicate');
    expect(errors[0].span.line).toBe(11);
    const east = result.ast.declarations.find((d): d is CreateDecl => d.kind === 'create');
    expect(east?.onClauses[0].body).toMatchObject([{ kind: 'phrase', phraseKey: 'stumble' }]);
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

describe('ownership-package removals — parse errors with fix-its (ratchet 2026-07-11)', () => {
  const HEADER = 'story "T" by "N"\n  id: t\n  version: 0.0.1\n\n';

  function errorsOf(source: string) {
    return parse(source).diagnostics.filter((d) => d.severity === 'error');
  }

  it('top-level once rule: removed, fix-it names the `, once` clause modifier', () => {
    const errors = errorsOf(`${HEADER}once after-hours\n  phrase bye\nend once\n`);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('parse.removed-once');
    expect(errors[0].message).toContain(', once');
  });

  it('define flag: removed, fix-it names states and derived conditions', () => {
    const errors = errorsOf(`${HEADER}define flag after-hours starts false\n`);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('parse.removed-flag');
    expect(errors[0].message).toContain('states:');
  });

  it('top-level define score: removed, fix-it names the owner-attached form', () => {
    const errors = errorsOf(`${HEADER}define score gold worth 5\n`);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('parse.removed-score');
    expect(errors[0].message).toContain('score <name> worth N');
  });

  it('if statement: removed, fix-it names must, the when suffix, and select', () => {
    const errors = errorsOf(
      `${HEADER}create the Hall\n  a room\n\n  A hall.\n\n  on entering it\n    if it is a room\n      win\n    end if\n  end on\n`,
    );
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('parse.removed-if');
    expect(errors[0].span.line).toBe(11);
    expect(errors[0].message).toContain('must');
    expect(errors[0].message).toContain('select');
  });

  it('flag trait-field type: removed, fix-it names trait states', () => {
    const errors = errorsOf(`${HEADER}define trait sticky\n  data\n    glue: flag starts false\nend trait\n`);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('parse.removed-flag-field');
    expect(errors[0].message).toContain('states[, reversible]');
  });

  it('refuse inside an after clause: reactions cannot refuse (D3)', () => {
    const errors = errorsOf(`${HEADER}create the Hall\n  a room\n\n  A hall.\n\n  after entering it\n    refuse nope\n  end after\n`);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('parse.react-refusal');
    expect(errors[0].message).toContain('`on` clause');
  });

  it('must not: negative requirements are not a form (D6)', () => {
    const errors = errorsOf(`${HEADER}define trait guard\n  on opening it\n    it must not be locked: nope\n  end on\nend trait\n`);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('parse.must-negative');
    expect(errors[0].message).toContain('refuse when');
  });
});

describe('define phrase — flush-left body text (OOM guard, 2026-07-19)', () => {
  const HEADER = 'story "T" by "N"\n  id: t\n  version: 0.0.1\n\n';

  function errorsOf(source: string) {
    return parse(source).diagnostics.filter((d) => d.severity === 'error');
  }

  it('column-1 prose: ONE indent diagnostic, the block terminates, later declarations parse', () => {
    const result = parse(
      `${HEADER}define phrase p\nProse at column zero.\nAnother flush-left line.\nend phrase\n\ncreate the Hall\n  a room\n\n  A hall.\n`,
    );
    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('parse.phrase-text-indent');
    expect(errors[0].span.line).toBe(6);
    const phrase = result.ast.declarations.find((d): d is DefinePhrase => d.kind === 'define-phrase');
    expect(phrase?.key).toBe('p');
    expect(result.ast.declarations.some((d) => d.kind === 'create')).toBe(true);
  });

  it('verbatim variant: the same guard holds (parseVerbatimBlock also requires depth)', () => {
    const errors = errorsOf(`${HEADER}define phrase v, verbatim\nFlush left.\nend phrase\n`);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('parse.phrase-text-indent');
  });

  it('indented prose is untouched: zero diagnostics', () => {
    const errors = errorsOf(`${HEADER}define phrase ok\n  Properly indented prose.\nend phrase\n`);
    expect(errors).toEqual([]);
  });
});
