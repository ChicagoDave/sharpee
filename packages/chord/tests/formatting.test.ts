/**
 * formatting.test.ts — the 2026-07-10 grammar-log changes: prose block as
 * the only phrase-text form, blank-line paragraph breaks, the built-in
 * `{br}` marker, and the `verbatim` phrase modifier.
 */
import { describe, expect, it } from 'vitest';
import { compile, parse } from '../src';

const HEADER = 'story "Format" by "Nobody"\n  id: format\n  version: 0.0.1\n\n';

describe('prose block is the only phrase-text form', () => {
  it('rejects the quoted same-line form with a fix-it', () => {
    const result = parse(`${HEADER}define phrases en-US\n  greet: "Hello."\n`);
    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('parse.phrase-text-form');
    expect(errors[0].span.line).toBe(6);
    expect(errors[0].message).toContain('indented prose block');
  });

  it('rejects same-line bare text after the colon', () => {
    const result = parse(`${HEADER}define phrases en-US\n  greet: Hello there.\n`);
    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('parse.phrase-text-form');
  });

  it('rejects the quoted form in entity phrase overrides', () => {
    const source = `${HEADER}create the sign\n  phrase read-it: "Words."\n\n  A sign.\n`;
    const result = parse(source);
    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    expect(errors.some((e) => e.code === 'parse.phrase-text-form')).toBe(true);
  });
});

describe('blank-line paragraph breaks', () => {
  it('a phrases entry carries paragraphs as \\n\\n', () => {
    const result = compile(
      `${HEADER}define phrases en-US\n  tale:\n    First paragraph line one\n    and line two.\n\n    Second paragraph.\n`,
    );
    expect(result.ok).toBe(true);
    const tale = result.ir.phrases.locales['en-US'].tale;
    expect(tale.variants[0].text).toBe('First paragraph line one and line two.\n\nSecond paragraph.');
  });

  it('consecutive bare paragraphs in a create block form a multi-paragraph description', () => {
    const result = compile(
      `${HEADER}create the Hall\n  a room\n\n  The first paragraph of the hall.\n\n  The second paragraph of the hall.\n`,
    );
    expect(result.ok).toBe(true);
    const desc = result.ir.phrases.locales['en-US']['hall.description'];
    expect(desc.variants[0].text).toBe('The first paragraph of the hall.\n\nThe second paragraph of the hall.');
  });
});

describe('{br} built-in marker', () => {
  it('passes the unbound-marker gate without a declaration', () => {
    const result = compile(
      `${HEADER}define phrases en-US\n  verse:\n    Line one.{br}\n    Line two.\n`,
    );
    expect(result.ok).toBe(true);
    expect(result.ir.phrases.locales['en-US'].verse.variants[0].markers).toEqual(['br']);
  });

  it('reserves `br` as a phrase name', () => {
    const result = compile(`${HEADER}define phrases en-US\n  br:\n    Nope.\n`);
    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    expect(errors.some((e) => e.code === 'analysis.reserved-marker')).toBe(true);
  });

  it('reserves `br` as a hatch name', () => {
    const result = compile(`${HEADER}define text br from "./extras.ts"\n`);
    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    expect(errors.some((e) => e.code === 'analysis.reserved-marker')).toBe(true);
  });
});

describe('verbatim phrase modifier', () => {
  it('preserves line structure, blank lines, and relative indentation', () => {
    const source =
      `${HEADER}define phrase treasure-map, verbatim\n` +
      `      N\n` +
      `    W + E\n` +
      `      S\n` +
      `\n` +
      `  X marks the spot.\n` +
      `end phrase\n`;
    const result = compile(source);
    expect(result.ok).toBe(true);
    const map = result.ir.phrases.locales['en-US']['treasure-map'];
    expect(map.verbatim).toBe(true);
    expect(map.strategy).toBeNull();
    expect(map.variants[0].text).toBe('    N\n  W + E\n    S\n\nX marks the spot.');
  });

  it('rejects `or` variants inside a verbatim phrase', () => {
    const source = `${HEADER}define phrase sign, verbatim\n  One.\nor\n  Two.\nend phrase\n`;
    const result = parse(source);
    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    expect(errors.some((e) => e.code === 'parse.verbatim-variants')).toBe(true);
  });

  it('plain and strategy phrases have no verbatim flag in the IR', () => {
    const result = compile(`${HEADER}define phrases en-US\n  plain:\n    Text.\n`);
    expect(result.ok).toBe(true);
    expect('verbatim' in result.ir.phrases.locales['en-US'].plain).toBe(false);
  });
});
