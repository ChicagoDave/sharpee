/**
 * story-block-fields.test.ts — ADR-298 fielded story block (Chord 3.0.0).
 *
 * Grammar-level pins for AC-1..AC-5: the fielded header parses into the
 * typed shape; the positional form is a removed-form error with a fix-it;
 * unknown keys are parse errors naming the known set; a lone kebab atom in
 * `prologue:`/`description:` is always a phrase reference (compile error
 * when undeclared, resolves when declared); a missing `ifid:` warns and
 * nothing more. Fixture-corpus migration is Phase 2, not this file.
 */
import { describe, expect, it } from 'vitest';
import { compile, parse } from '../src';

const FIELDED = `story
  title: The Folly at Fernhill
  authors:
      Ada Lovelace
      Charles Babbage
  testers:
      Joe Mason
  ifid: 12345678-ABCD-ABCD-ABCD-123456789ABC
  id: fernhill
  story-version: 0.3.0
  description: One cold winter night to find the deed.
`;

describe('fielded story block (AC-1)', () => {
  const result = parse(FIELDED);

  it('parses with zero diagnostics', () => {
    expect(result.diagnostics).toEqual([]);
  });

  it('carries the typed fields', () => {
    const header = result.ast.header;
    expect(header?.title).toBe('The Folly at Fernhill');
    expect(header?.fields.authors).toEqual(['Ada Lovelace', 'Charles Babbage']);
    expect(header?.fields.testers).toEqual(['Joe Mason']);
    expect(header?.fields.ifid).toBe('12345678-ABCD-ABCD-ABCD-123456789ABC');
    expect(header?.fields.id).toBe('fernhill');
    expect(header?.fields.storyVersion).toBe('0.3.0');
    expect(header?.fields.description).toMatchObject({
      kind: 'literal',
      value: 'One cold winter night to find the deed.',
    });
  });

  it('projects the typed fields into IRMeta (title stays top-level)', () => {
    const { ir } = compile(FIELDED);
    expect(ir?.meta.title).toBe('The Folly at Fernhill');
    expect(ir?.meta.fields).toEqual({
      id: 'fernhill',
      storyVersion: '0.3.0',
      ifid: '12345678-ABCD-ABCD-ABCD-123456789ABC',
      authors: ['Ada Lovelace', 'Charles Babbage'],
      testers: ['Joe Mason'],
      description: { kind: 'literal', value: 'One cold winter night to find the deed.' },
    });
  });

  it('accepts a single inline author', () => {
    const result = parse('story\n  title: T\n  authors: Solo Author\n');
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(result.ast.header?.fields.authors).toEqual(['Solo Author']);
  });
});

describe('removed positional form (AC-2)', () => {
  it('errors with a fix-it naming the fielded shape', () => {
    const result = parse('story "Cloak of Darkness" by "Roger Firth"\n  id: cloak\n');
    const removed = result.diagnostics.find((d) => d.code === 'parse.removed-story-header');
    expect(removed).toBeDefined();
    expect(removed?.message).toContain('ADR-298');
    expect(removed?.message).toContain('title:');
    expect(removed?.message).toContain('authors:');
  });

  it('errors on the title-only positional form too', () => {
    const result = parse('story "Cloak of Darkness"\n  id: cloak\n');
    expect(result.diagnostics.some((d) => d.code === 'parse.removed-story-header')).toBe(true);
  });
});

describe('closed schema (AC-3)', () => {
  it('rejects an unknown key, naming the known field set', () => {
    const result = parse('story\n  title: T\n  titel: Oops\n');
    const unknown = result.diagnostics.find((d) => d.code === 'parse.header-unknown-field');
    expect(unknown).toBeDefined();
    expect(unknown?.message).toContain('titel');
    expect(unknown?.message).toContain('story-version');
    expect(unknown?.message).toContain('prologue');
  });

  it.each([
    ['version', 'story-version'],
    ['blurb', 'description'],
    ['by', 'authors'],
  ])('gives %s: a renamed-spelling fix-it (%s:)', (removed, replacement) => {
    const result = parse(`story\n  title: T\n  ${removed}: x\n`);
    const diag = result.diagnostics.find((d) => d.code === 'parse.header-unknown-field');
    expect(diag?.message).toContain(`\`${replacement}:\``);
  });

  it('requires a title: field', () => {
    const result = parse('story\n  id: anon\n');
    expect(result.diagnostics.some((d) => d.code === 'parse.story-title')).toBe(true);
  });

  it('rejects an empty authors: list', () => {
    const result = parse('story\n  title: T\n  authors:\n');
    expect(result.diagnostics.some((d) => d.code === 'parse.header-list-empty')).toBe(true);
  });
});

describe('bare phrase references (AC-4, compile-time half)', () => {
  it('classifies a lone kebab atom as a phrase reference', () => {
    const result = parse('story\n  title: T\n  prologue: opening-crawl\n');
    expect(result.ast.header?.fields.prologue).toMatchObject({ kind: 'phrase-ref', value: 'opening-crawl' });
  });

  it('classifies multi-word text as literal prose', () => {
    const result = parse('story\n  title: T\n  prologue: A cold night falls.\n');
    expect(result.ast.header?.fields.prologue).toMatchObject({ kind: 'literal', value: 'A cold night falls.' });
  });

  it('errors when the referenced phrase is not declared', () => {
    const { diagnostics } = compile('story\n  title: T\n  prologue: opening-crawl\n');
    const missing = diagnostics.find((d) => d.code === 'analysis.missing-phrase');
    expect(missing).toBeDefined();
    expect(missing?.message).toContain('opening-crawl');
  });

  it('resolves when the phrase is declared', () => {
    const source = [
      'story',
      '  title: T',
      '  prologue: opening-crawl',
      '',
      'define phrase opening-crawl',
      '  A cold night falls over Fernhill.',
      'end phrase',
      '',
    ].join('\n');
    const { ir, diagnostics } = compile(source);
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(ir?.meta.fields.prologue).toEqual({ kind: 'phrase-ref', value: 'opening-crawl' });
  });

  it('joins an indented prose body into a literal value', () => {
    const result = parse('story\n  title: T\n  description:\n      Line one.\n      Line two.\n');
    expect(result.ast.header?.fields.description).toMatchObject({
      kind: 'literal',
      value: 'Line one.\nLine two.',
    });
  });
});

describe('missing IFID (AC-5, compile-time half)', () => {
  it('warns — and only warns — when ifid: is absent', () => {
    const { diagnostics } = compile('story\n  title: T\n');
    const ifid = diagnostics.find((d) => d.code === 'analysis.missing-ifid');
    expect(ifid?.severity).toBe('warning');
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  });

  it('does not warn when ifid: is present', () => {
    const { diagnostics } = compile('story\n  title: T\n  ifid: 12345678-ABCD-ABCD-ABCD-123456789ABC\n');
    expect(diagnostics.find((d) => d.code === 'analysis.missing-ifid')).toBeUndefined();
  });
});
