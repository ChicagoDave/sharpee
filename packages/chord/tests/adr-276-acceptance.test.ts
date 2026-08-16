/**
 * adr-276-acceptance.test.ts — ADR-276 Phase 8 acceptance pins.
 *
 * Acceptance item 1 (composite): one story carrying all four of the ADR's
 * named violations — a typo'd `remove from action` target, an unmatched
 * removal shape, a `true`/`false` setting given a word, and an unknown
 * direction word — yields ALL FOUR diagnostics, with spans, from a single
 * compile. Acceptance item 7 (collected): a story with N ≥ 3 alteration
 * errors across ≥ 2 census entries surfaces all N in one compile, versus
 * the loader's historical one-`LoadError`-per-attempt.
 *
 * Census 16 note (recorded Phase 6): the unknown direction word is
 * PARSER-gated — a non-direction word never parses as an exit and falls
 * into composition parsing, surfacing as `analysis.trait-not-declared`
 * with a span. The violation is still refused at compile; the code is the
 * composition gate's, not a dedicated direction code.
 *
 * Owner context: @sharpee/chord test suite.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src/index.js';

/** The ADR Acceptance composite: all four named violations in one story. */
export const COMPOSITE_ACCEPTANCE_SOURCE = [
  'story',
  '  title: Composite Acceptance',
  '  authors:',
  '    Test',
  '  id: composite-acceptance',
  '  use combat',
  '',
  'create the Lab',
  '  a room',
  '  sideways to the Den', // unknown direction word (census 16, parser-gated)
  '',
  '  A lab.',
  '',
  'create the Den',
  '  a room',
  '',
  '  A den.',
  '',
  'create the orc',
  '  a person, combatant with hostile maybe', // boolean setting given a word (census 4)
  '  in the Lab',
  '',
  '  An orc.',
  '',
  'create the player',
  '  starts in the Lab',
  '',
  '  You.',
  '',
  'remove from action takingg', // typo'd removal target (census 2)
  '  take the item',
  '',
  'remove from action taking',
  '  yoink the item', // unmatched removal shape (census 3)
  '',
].join('\n');

/** The four codes the composite must surface, in source order. */
export const COMPOSITE_ACCEPTANCE_CODES = [
  'analysis.trait-not-declared',
  'analysis.setting-not-boolean',
  'analysis.removal-target',
  'analysis.unmatched-removal-pattern',
] as const;

describe('ADR-276 Acceptance item 1 — the composite four-violation story', () => {
  it('surfaces all four diagnostics, each with a span, from a single compile', () => {
    const result = compile(COMPOSITE_ACCEPTANCE_SOURCE);
    const diagnostics = result.diagnostics.filter((d) => d.code !== 'analysis.missing-ifid');
    expect(result.ok).toBe(false);
    expect(diagnostics.map((d) => d.code)).toEqual([...COMPOSITE_ACCEPTANCE_CODES]);
    for (const d of diagnostics) {
      expect(d.severity).toBe('error');
      expect(d.span.line).toBeGreaterThan(0);
      expect(d.span.column).toBeGreaterThan(0);
    }
    // Four distinct sites — collected, not one-per-attempt.
    expect(new Set(diagnostics.map((d) => d.span.line)).size).toBe(4);
  });
});

describe('ADR-276 Acceptance item 7 — alteration errors are collected', () => {
  it('a story with three alteration errors (census 1, 2, 3) surfaces all three in one compile', () => {
    const source = [
      'story',
      '  title: Alterations',
      '  authors:',
      '    Test',
      '  id: alterations',
      '',
      'create the Lab',
      '  a room',
      '',
      '  A lab.',
      '',
      'create the player',
      '  starts in the Lab',
      '',
      '  You.',
      '',
      'extend action takng', // census 1
      '  grammar',
      '    snag the item',
      '',
      'remove from action blorf', // census 2
      '  take the item',
      '',
      'remove from action taking',
      '  yoink the item', // census 3
      '',
    ].join('\n');
    const result = compile(source);
    expect(result.ok).toBe(false);
    expect(result.diagnostics.filter((d) => d.code !== 'analysis.missing-ifid').map((d) => d.code)).toEqual([
      'analysis.extend-target',
      'analysis.removal-target',
      'analysis.unmatched-removal-pattern',
    ]);
  });
});
