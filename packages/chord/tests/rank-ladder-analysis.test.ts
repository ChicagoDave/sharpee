/**
 * rank-ladder-analysis.test.ts — ADR-261 D2/D5/D7 analysis side: rungs reach
 * the IR sorted, with kebab ids derived from the author's name, and the three
 * ladder diagnostics fire with spans.
 *
 * REAL-PATH: every case drives source through the real parse → analyze
 * pipeline via `compile()`.
 *
 * Covers ADR-261 acceptance #1 and #6.
 */
import { describe, expect, it } from 'vitest';
import { compile, EXTENSION_MANIFESTS } from '../src';

const story = (headerBody: string) => `story "The Folly" by "T"
  id: folly
  version: 0.0.1
${headerBody}
create the Lawn
  a room

  A lawn.

create the player
  starts in the Lawn

  You.
`;

const errors = (source: string) =>
  compile(source).diagnostics.filter((d) => d.severity === 'error');

const errorCodes = (source: string) => errors(source).map((d) => d.code);

describe('the scoring manifest (ADR-261 D1)', () => {
  it('the manifest registry knows scoring', () => {
    expect(EXTENSION_MANIFESTS.has('scoring')).toBe(true);
  });

  it('contributes no trait adjectives — the constructs are the gated surface', () => {
    expect(EXTENSION_MANIFESTS.get('scoring')!.traitAdjectives).toEqual([]);
  });
});

describe('rank ladder → IR (ADR-261 acceptance #1)', () => {
  it('compiles clean and puts `scoring` on ir.uses', () => {
    const result = compile(story(
      '  score lamp worth 200\n' +
      '  use scoring\n' +
      '    rank "Curious Visitor" at 0\n' +
      '    rank "Attentive Guest" at 40\n' +
      '    rank "Master of the Folly" at 120\n'
    ));

    expect(result.diagnostics).toEqual([]);
    expect(result.ir.uses).toContain('scoring');
  });

  it('sorts rungs ascending regardless of source order', () => {
    const result = compile(story(
      '  score lamp worth 200\n' +
      '  use scoring\n' +
      '    rank "Master of the Folly" at 120\n' +
      '    rank "Curious Visitor" at 0\n' +
      '    rank "Attentive Guest" at 40\n'
    ));

    expect(result.ir.ranks.map((r) => r.threshold)).toEqual([0, 40, 120]);
    expect(result.ir.ranks.map((r) => r.name)).toEqual([
      'Curious Visitor',
      'Attentive Guest',
      'Master of the Folly',
    ]);
  });

  it('derives kebab ids from the author\'s name (ADR-254)', () => {
    const result = compile(story(
      '  score lamp worth 200\n' +
      '  use scoring\n' +
      '    rank "Master of the Folly" at 120\n'
    ));

    expect(result.ir.ranks[0].id).toBe('master-of-the-folly');
  });

  it('strips punctuation when deriving an id, keeping the name intact', () => {
    const result = compile(story(
      '  score lamp worth 200\n' +
      '  use scoring\n' +
      '    rank "Master of the Folly!" at 120\n'
    ));

    expect(result.ir.ranks[0].id).toBe('master-of-the-folly');
    expect(result.ir.ranks[0].name).toBe('Master of the Folly!');
  });

  it('carries `says` as phraseKey, and omits it on a silent rung (D7)', () => {
    const result = compile(story(
      '  score lamp worth 200\n' +
      '  use scoring\n' +
      '    rank "Curious Visitor" at 0\n' +
      '    rank "Attentive Guest" at 40 says settled-in\n'
    ));

    expect(result.ir.ranks[0].phraseKey).toBeUndefined();
    expect(result.ir.ranks[1].phraseKey).toBe('settled-in');
  });

  it('`use scoring` with no ladder yields an empty ranks array (D3)', () => {
    const result = compile(story('  use scoring\n'));

    expect(result.diagnostics).toEqual([]);
    expect(result.ir.uses).toContain('scoring');
    expect(result.ir.ranks).toEqual([]);
  });

  it('a story with no `use scoring` has no ranks and does not name the extension', () => {
    const result = compile(story('  version: 0.0.2\n'));

    expect(result.ir.uses).not.toContain('scoring');
    expect(result.ir.ranks).toEqual([]);
  });
});

describe('ladder diagnostics (ADR-261 acceptance #6)', () => {
  it('duplicate threshold → analysis.duplicate-rank-threshold with the span', () => {
    const found = errors(story(
      '  score lamp worth 200\n' +
      '  use scoring\n' +
      '    rank "Curious Visitor" at 40\n' +
      '    rank "Attentive Guest" at 40\n'
    ));

    expect(found.map((d) => d.code)).toEqual(['analysis.duplicate-rank-threshold']);
    // The span points at the SECOND rung — the one that could be moved.
    expect(found[0].span.line).toBe(7);
  });

  it('duplicate kebab id → analysis.duplicate-rank-id with the span', () => {
    const found = errors(story(
      '  score lamp worth 200\n' +
      '  use scoring\n' +
      '    rank "Master of the Folly" at 40\n' +
      '    rank "Master of the folly!" at 80\n'
    ));

    expect(found.map((d) => d.code)).toEqual(['analysis.duplicate-rank-id']);
    expect(found[0].span.line).toBe(7);
  });

  it('a rung above the declared ceiling → analysis.rank-above-max', () => {
    const found = errors(story(
      '  score lamp worth 100\n' +
      '  use scoring\n' +
      '    rank "Curious Visitor" at 0\n' +
      '    rank "Unreachable" at 500\n'
    ));

    expect(found.map((d) => d.code)).toEqual(['analysis.rank-above-max']);
    expect(found[0].message).toContain('100 points');
  });

  it('a rung AT the ceiling is fine — that is the perfect-score rung', () => {
    const result = compile(story(
      '  score lamp worth 100\n' +
      '  use scoring\n' +
      '    rank "Master of the Folly" at 100\n'
    ));

    expect(result.diagnostics).toEqual([]);
  });

  it('sums every declared score when computing the ceiling', () => {
    const result = compile(story(
      '  score lamp worth 60\n' +
      '  score urn worth 60\n' +
      '  use scoring\n' +
      '    rank "Master of the Folly" at 120\n'
    ));

    expect(result.diagnostics).toEqual([]);
  });

  it('a ladder with no declared scores skips the ceiling check', () => {
    // maxScore is 0, so "above max" would reject every rung — the check is
    // about an unreachable rank, not about declaring scores.
    expect(errorCodes(story(
      '  use scoring\n' +
      '    rank "Curious Visitor" at 0\n' +
      '    rank "Attentive Guest" at 40\n'
    ))).toEqual([]);
  });

  it('a rank name with no letters or digits → analysis.rank-id-empty', () => {
    expect(errorCodes(story(
      '  score lamp worth 200\n' +
      '  use scoring\n' +
      '    rank "!!!" at 40\n'
    ))).toEqual(['analysis.rank-id-empty']);
  });
});
