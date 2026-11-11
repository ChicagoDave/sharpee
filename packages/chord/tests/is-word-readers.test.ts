/**
 * is-word-readers.test.ts — the compile-side half of "every `is` word has a
 * reader": a trait adjective after `is` compiles as a word the evaluator
 * reads (the composition), and a word after `the match is` is held to the
 * declared states plus the platform words, so a misspelling is an error.
 *
 * The runtime half (the reader table and the composition read) is
 * story-loader's is-word-conformance test.
 *
 * References:
 * - ADR-394 D3 — a trait adjective after `is` reads the composition; `the match is` validates.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const fixture = (name: string) => readFileSync(join(__dirname, 'fixtures', name), 'utf8');

describe('`is <word>` on the each binder and a trait adjective', () => {
  const result = compile(fixture(join('gates', 'is-word-readers.story')));
  const errors = result.diagnostics.filter((d) => d.severity === 'error');

  it('refuses only the misspelt state on `the match`, with a suggestion', () => {
    expect(result.ok).toBe(false);
    expect(errors.map((d) => `${d.span.line} ${d.code}`)).toEqual(['16 analysis.unknown-value']);
    expect(errors[0].message).toContain('`gleamng` is not a state or a known trait');
    expect(errors[0].message).toContain('gleaming');
  });

  it('accepts a declared state and a trait adjective on `the match` (lines 14, 15)', () => {
    expect(errors.some((d) => d.span.line === 14 || d.span.line === 15)).toBe(false);
  });
});
