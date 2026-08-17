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
    expect(result.diagnostics.filter((d) => d.code !== 'analysis.missing-ifid')).toEqual([]);
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
      themes: [],
      description: { kind: 'literal', value: 'One cold winter night to find the deed.' },
    });
  });

  it('accepts a single indented author', () => {
    const result = parse('story\n  title: T\n  authors:\n    Solo Author\n');
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(result.ast.header?.fields.authors).toEqual(['Solo Author']);
  });

  it('rejects the inline form — names live one per indented line', () => {
    const result = parse('story\n  title: T\n  authors: Solo Author\n');
    const error = result.diagnostics.find((d) => d.code === 'parse.header-inline-list');
    expect(error).toBeDefined();
    expect(error?.message).toContain('indented');
    // One mistake, one diagnostic: neither the empty-list nor the
    // required-field error piles on top of the inline rejection.
    expect(result.diagnostics.some((d) => d.code === 'parse.header-list-empty')).toBe(false);
    expect(result.diagnostics.some((d) => d.code === 'parse.story-authors')).toBe(false);
  });

  it('requires an authors: list', () => {
    const result = parse('story\n  title: T\n');
    expect(result.diagnostics.some((d) => d.code === 'parse.story-authors')).toBe(true);
  });
});

describe('client-config keys (ADR-252 D3 × ADR-298 amendment, GH #221)', () => {
  const CONFIGURED = [
    'story',
    '  title: T',
    '  authors:',
    '    N',
    '  id: fernhill',
    '  client: browser',
    '  theme: parchment',
    '  template: two-pane',
    '  themes: parchment, paper',
    '  default-theme: parchment',
    '  storage-prefix: fernhill-demo',
    '',
  ].join('\n');

  it('parses all six keys into the typed fields', () => {
    const result = parse(CONFIGURED);
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const f = result.ast.header?.fields;
    expect(f?.client).toBe('browser');
    expect(f?.theme).toBe('parchment');
    expect(f?.template).toBe('two-pane');
    expect(f?.themes).toEqual(['parchment', 'paper']);
    expect(f?.defaultTheme).toBe('parchment');
    expect(f?.storagePrefix).toBe('fernhill-demo');
  });

  it('projects them into IRMeta.fields', () => {
    const { ir } = compile(CONFIGURED);
    expect(ir?.meta.fields).toMatchObject({
      client: 'browser',
      theme: 'parchment',
      template: 'two-pane',
      themes: ['parchment', 'paper'],
      defaultTheme: 'parchment',
      storagePrefix: 'fernhill-demo',
    });
  });

  it('omitted client-config keys stay absent (themes empty)', () => {
    const { ir } = compile('story\n  title: T\n  authors:\n    N\n');
    expect(ir?.meta.fields.client).toBeUndefined();
    expect(ir?.meta.fields.themes).toEqual([]);
  });
});

describe('publish-source (ADR-284 — the first boolean header field)', () => {
  const withValue = (value: string) => `story\n  title: T\n  authors:\n    N\n  publish-source: ${value}\n`;

  it('reads yes/true as true and no/false as false, case-insensitively', () => {
    for (const word of ['yes', 'true', 'YES', 'True']) {
      const result = parse(withValue(word));
      expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
      expect(result.ast.header?.fields.publishSource).toBe(true);
    }
    for (const word of ['no', 'false', 'NO', 'False']) {
      const result = parse(withValue(word));
      expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
      expect(result.ast.header?.fields.publishSource).toBe(false);
    }
  });

  it('projects the declared value into IRMeta.fields', () => {
    expect(compile(withValue('yes')).ir?.meta.fields.publishSource).toBe(true);
    expect(compile(withValue('no')).ir?.meta.fields.publishSource).toBe(false);
  });

  it('stays absent when the field is omitted — the build owns the default', () => {
    const { ir } = compile('story\n  title: T\n  authors:\n    N\n');
    expect(ir?.meta.fields.publishSource).toBeUndefined();
  });

  it('rejects a non-boolean value rather than reading it as no', () => {
    const result = parse(withValue('maybe'));
    const error = result.diagnostics.find((d) => d.code === 'parse.header-field-not-boolean');
    expect(error).toBeDefined();
    expect(error?.message).toContain('`yes` or `no`');
    // The defect this guards: a typo must not silently mean "do not publish
    // the source" — the field is left undeclared, not coerced to false.
    expect(result.ast.header?.fields.publishSource).toBeUndefined();
  });

  it('is named in the closed-schema error, so a misspelling can find it', () => {
    const result = parse('story\n  title: T\n  authors:\n    N\n  publish_source: yes\n');
    const error = result.diagnostics.find((d) => d.code === 'parse.header-unknown-field');
    expect(error?.message).toContain('publish-source');
  });
});

describe('auto-assertion (Phase 6e, #253 — the transcript auto-assertion policy)', () => {
  const withValue = (value: string) => `story\n  title: T\n  authors:\n    N\n  auto-assertion: ${value}\n`;

  it('reads each closed-set value, case-insensitively', () => {
    for (const value of ['all-emitted-text', 'room-description', 'room-name-and-description', 'All-Emitted-Text']) {
      const result = parse(withValue(value));
      expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
      expect(result.ast.header?.fields.autoAssertion).toBe(value.toLowerCase());
    }
  });

  it('projects the declared value into IRMeta.fields', () => {
    expect(compile(withValue('all-emitted-text')).ir?.meta.fields.autoAssertion).toBe('all-emitted-text');
    expect(compile(withValue('room-description')).ir?.meta.fields.autoAssertion).toBe('room-description');
  });

  it('stays absent when the field is omitted — "let me decide" is the runner default', () => {
    const { ir } = compile('story\n  title: T\n  authors:\n    N\n');
    expect(ir?.meta.fields.autoAssertion).toBeUndefined();
  });

  it('rejects an unknown value rather than reading it as "let me decide"', () => {
    const result = parse(withValue('everything'));
    const error = result.diagnostics.find((d) => d.code === 'parse.header-field-bad-value');
    expect(error).toBeDefined();
    expect(error?.message).toContain('all-emitted-text');
    // A typo must not silently disable the policy the author chose.
    expect(result.ast.header?.fields.autoAssertion).toBeUndefined();
  });

  it('is named in the closed-schema error, so a misspelling can find it', () => {
    const result = parse('story\n  title: T\n  authors:\n    N\n  auto_assertion: all-emitted-text\n');
    const error = result.diagnostics.find((d) => d.code === 'parse.header-unknown-field');
    expect(error?.message).toContain('auto-assertion');
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
      '  authors:',
      '    N',
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

describe('an absent ifid: is not the compiler’s business (ADR-309)', () => {
  // Was: a `analysis.missing-ifid` warning. The toolchain now owns the
  // identifier — minted at creation, rendered into the header on save and
  // build — so a story without the line is a state the tool repairs, not one
  // the compiler reports. What must hold is that it compiles CLEANLY.
  it('compiles with no diagnostic at all when ifid: is absent', () => {
    const { diagnostics } = compile('story\n  title: T\n  authors:\n    N\n');
    expect(diagnostics.map((d) => d.code)).not.toContain('analysis.missing-ifid');
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  });

  it('still carries the value through to the IR when it is present', () => {
    const { ir, diagnostics } = compile(
      'story\n  title: T\n  authors:\n    N\n  ifid: 12345678-ABCD-ABCD-ABCD-123456789ABC\n',
    );
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(ir.meta.fields.ifid).toBe('12345678-ABCD-ABCD-ABCD-123456789ABC');
  });
});
