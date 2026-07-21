/**
 * comments.test.ts — ADR-249 `##` comment lines: lexer flagging +
 * blank-delimitation (`lex.comment-blank-lines`), parser top-level skip,
 * and the structural inside-block rejection (`parse.comment-inside-block`)
 * across indent-terminated and `end`-terminated bodies. Covers ADR-249
 * acceptance-criteria groups 1 (lexer) and 2 (parser/analyzer) verbatim.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile, DiagnosticBag, lex } from '../src';

const errorCodes = (source: string) =>
  compile(source).diagnostics.filter((d) => d.severity === 'error').map((d) => d.code);

/**
 * Deep-copy with every `span` property removed. Comments occupy source
 * lines, so spans after a comment legitimately shift — IR identity is
 * asserted modulo spans (ADR-249 AC 3).
 */
const stripSpans = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stripSpans);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([k]) => k !== 'span')
        .map(([k, v]) => [k, stripSpans(v)]),
    );
  }
  return value;
};

/** Minimal valid story with `mid` spliced between the two create blocks. */
const story = (mid: string) => `story "T" by "A"
  id: t
  version: 0.0.1

create the Cave
  a room

  A cave.

${mid}create the player
  starts in the Cave

  You.
`;

describe('ADR-249 lexer: `##` comment lines (AC group 1)', () => {
  it('flags indent-0 `##` lines, single and stacked', () => {
    const lines = lex('## one\n## two\n\ncreate the rock\n', new DiagnosticBag());
    expect(lines[0].comment).toBe(true);
    expect(lines[1].comment).toBe(true);
    expect(lines[2].comment).toBe(false);
  });

  it('missing following blank raises lex.comment-blank-lines', () => {
    const bag = new DiagnosticBag();
    lex('## header\ncreate the rock\n', bag);
    expect(bag.all().map((d) => d.code)).toContain('lex.comment-blank-lines');
  });

  it('missing preceding blank raises lex.comment-blank-lines', () => {
    const bag = new DiagnosticBag();
    lex('create the rock\n## note\n\ncreate the hat\n', bag);
    expect(bag.all().map((d) => d.code)).toContain('lex.comment-blank-lines');
  });

  it('file start counts as the leading blank (file-header comment is legal)', () => {
    const bag = new DiagnosticBag();
    lex('## header comment\n\ncreate the rock\n', bag);
    expect(bag.all()).toHaveLength(0);
  });

  it('file end counts as the trailing blank (trailing comment is legal)', () => {
    const bag = new DiagnosticBag();
    lex('create the rock\n\n## trailing note', bag);
    expect(bag.all()).toHaveLength(0);
  });

  it('a file of only `##` lines lexes clean', () => {
    const bag = new DiagnosticBag();
    const lines = lex('## a\n## b\n', bag);
    expect(bag.all()).toHaveLength(0);
    expect(lines.every((l) => l.comment)).toBe(true);
  });

  it('an indented `##` line is an ordinary unflagged Line', () => {
    const lines = lex('  ## not a comment\n', new DiagnosticBag());
    expect(lines[0].comment).toBe(false);
  });

  it('`## ` with no text and `##text` with no space both count (prefix is `##`)', () => {
    const lines = lex('##\n## \n##text\n', new DiagnosticBag());
    expect(lines.map((l) => l.comment)).toEqual([true, true, true]);
  });

  it('one diagnostic per violating run, not per line', () => {
    const bag = new DiagnosticBag();
    lex('create the rock\n## one\n## two\ncreate the hat\n', bag);
    expect(bag.all().filter((d) => d.code === 'lex.comment-blank-lines')).toHaveLength(1);
  });
});

describe('ADR-249 parser: comment position (AC group 2)', () => {
  it('a blank-delimited comment block between top-level constructs compiles as if absent', () => {
    const plain = story('');
    const commented = story('## the cave is chapter 1\n## the player wakes here\n\n');
    expect(errorCodes(commented)).toEqual([]);
    expect(stripSpans(compile(commented).ir)).toEqual(stripSpans(compile(plain).ir));
  });

  it('a blank-delimited comment between a create header and its body raises parse.comment-inside-block', () => {
    const src = story('create the lamp\n\n## still deciding\n\n  a thing, portable\n\n');
    expect(errorCodes(src)).toContain('parse.comment-inside-block');
    expect(errorCodes(src)).not.toContain('lex.comment-blank-lines');
  });

  it('the same header/body split without blanks raises lex.comment-blank-lines', () => {
    const src = story('create the lamp\n## still deciding\n  a thing, portable\n\n');
    expect(errorCodes(src)).toContain('lex.comment-blank-lines');
  });

  it('a comment inside an end-terminated body (define phrase) raises parse.comment-inside-block', () => {
    const src = story('define phrase greeting\n  Hello there.\n\n## note to self\n\nend phrase\n\n');
    const codes = errorCodes(src);
    expect(codes).toContain('parse.comment-inside-block');
    // the block still terminates — no cascading unterminated-block error
    expect(codes).not.toContain('parse.unterminated-block');
  });

  it('an indented `##` line in phrase prose renders verbatim (opacity)', () => {
    const src = story('define phrase greeting\n  Hello there.\n  ## still deciding on this line\nend phrase\n\n');
    const result = compile(src);
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(JSON.stringify(result.ir)).toContain('## still deciding on this line');
  });

  it('an indented `##` line in a code position (trait body) raises parse.comment-inside-block', () => {
    const src = story('define trait glowy\n  ## brightness lives here\n  states: dim, bright\nend trait\n\n');
    expect(errorCodes(src)).toContain('parse.comment-inside-block');
  });

  it('an indented `##` line in a statement body raises parse.comment-inside-block', () => {
    const mid = 'create the lamp\n  a thing, portable\n  starts in the Cave\n\n  A lamp.\n\n  on taking it\n    ## remember to gate this\n    phrase taken-note\n  end on\n\n';
    expect(errorCodes(story(mid))).toContain('parse.comment-inside-block');
  });

  it('a file-header comment plus trailing comment compile clean end-to-end', () => {
    const src = `## the whole story\n\n${story('')}\n## done\n`;
    expect(errorCodes(src)).toEqual([]);
  });

  it('golden: the commented cloak twin compiles to an IR identical to cloak.story modulo spans (AC 3)', () => {
    const plain = readFileSync(join(__dirname, 'fixtures', 'cloak.story'), 'utf8');
    const commented = readFileSync(join(__dirname, 'fixtures', 'comments-golden.story'), 'utf8');
    const plainResult = compile(plain);
    const commentedResult = compile(commented);
    expect(commentedResult.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(stripSpans(commentedResult.ir)).toEqual(stripSpans(plainResult.ir));
  });
});
