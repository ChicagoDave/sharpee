/**
 * Tests for the now-deprecated `parseDecorations` / `hasDecorations`
 * shims in `@sharpee/text-service`.
 *
 * Per ADR-174, decoration parsing moved to
 * `@sharpee/engine/src/prose-pipeline/decorations/parser.ts`. The
 * functions here are no-op passthroughs retained only so the
 * deprecated text-service package keeps compiling for downstream
 * consumers; the markup paths the old parser supported are now
 * tested in the engine package.
 *
 * @see ADR-174 §Migration phasing
 */

import { describe, it, expect } from 'vitest';
import { parseDecorations, hasDecorations } from '../src/decoration-parser';

describe('parseDecorations (deprecated no-op)', () => {
  it('returns empty array for empty string', () => {
    expect(parseDecorations('')).toEqual([]);
  });

  it('passes plain text through as a single TextContent entry', () => {
    expect(parseDecorations('hello world')).toEqual(['hello world']);
  });

  it('does NOT parse bracket markup (engine pipeline owns that now)', () => {
    expect(parseDecorations('[item:sword]')).toEqual(['[item:sword]']);
    expect(parseDecorations('You see [item:a lamp].')).toEqual([
      'You see [item:a lamp].',
    ]);
  });

  it('does NOT parse asterisk markup (post-ADR-174 the syntax is gone)', () => {
    expect(parseDecorations('*emphasis*')).toEqual(['*emphasis*']);
    expect(parseDecorations('**strong**')).toEqual(['**strong**']);
  });
});

describe('hasDecorations (deprecated no-op)', () => {
  it('always returns false', () => {
    expect(hasDecorations('')).toBe(false);
    expect(hasDecorations('plain')).toBe(false);
    expect(hasDecorations('[item:sword]')).toBe(false);
    expect(hasDecorations('*emphasis*')).toBe(false);
  });
});
