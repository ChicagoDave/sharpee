/**
 * claim-report.test.ts — the claims vocabulary both surfaces read (ADR-365
 * D6, ADR-367 D6): the counts come from the run's summary once it has
 * arrived and from the arrived verdicts before it, the pending line, the
 * claim's title and verdict word, and the wire's lock from a lock's check.
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { describe, expect, it } from 'vitest';
import {
  claimCounts,
  claimHeadline,
  claimTitle,
  claimVerdictWord,
  claimsPendingLine,
  claimsRatioLine,
  lockRowOf,
  type ClaimsSummaryRow,
} from '../src/claims/claim-report.js';

const SUMMARY: ClaimsSummaryRow = { source: 'fixture', declared: 3, held: 2, unproven: 1, walks: 1, totalWalkMs: 10, seed: 7, floored: true };

describe('the verdict counts', () => {
  it('read the summary once it has arrived, even when fewer rows are in hand', () => {
    const counts = claimCounts(SUMMARY, [{ verdict: 'held' }]);
    expect(counts).toEqual([
      { verdict: 'held', count: 2, text: '2 held' },
      { verdict: 'unproven', count: 1, text: '1 unproven' },
    ]);
  });

  it('count the arrived rows before the summary, omitting a verdict nothing reached', () => {
    const counts = claimCounts(undefined, [{ verdict: 'held' }, { verdict: 'unproven' }, { verdict: 'held' }]);
    expect(counts).toEqual([
      { verdict: 'held', count: 2, text: '2 held' },
      { verdict: 'unproven', count: 1, text: '1 unproven' },
    ]);
  });

  it('are empty before any verdict arrives', () => {
    expect(claimCounts(undefined, [])).toEqual([]);
  });
});

describe('the words around a claim', () => {
  // The first line is the one the IDE's real-path test
  // (TestingSurfaceRealPathTests.swift) expects byte for byte; pinned here so
  // a change to it shows without xcodebuild.
  it('the ratio line with an unproven count, without one, and without a seed; and the pending line', () => {
    expect(claimsRatioLine(SUMMARY)).toBe('claims: 2 of 3 held, 1 unproven (seed 7)');
    expect(claimsRatioLine({ ...SUMMARY, declared: 2, unproven: 0 })).toBe('claims: 2 of 2 held (seed 7)');
    const { seed: _seed, ...unseeded } = SUMMARY;
    expect(claimsRatioLine(unseeded)).toBe('claims: 2 of 3 held, 1 unproven');
    expect(claimsPendingLine(3)).toBe('claims: 3 so far');
  });

  it('a stale violated count on the row is not printed', () => {
    const stale = { ...SUMMARY, violated: 4 } as ClaimsSummaryRow;
    expect(claimsRatioLine(stale)).toBe('claims: 2 of 3 held, 1 unproven (seed 7)');
    expect(claimCounts(stale, []).map((entry) => entry.verdict)).toEqual(['held', 'unproven']);
  });

  it('the title is the name; the headline is the verdict word and the title', () => {
    expect(claimTitle({ name: 'the deed is in hand' })).toBe('the deed is in hand');
    expect(claimVerdictWord({ verdict: 'unproven' })).toBe('UNPROVEN');
    expect(claimVerdictWord({ verdict: 'held' })).toBe('HELD');
    expect(claimHeadline({ verdict: 'unproven', name: 'the box leaves' })).toBe('UNPROVEN  the box leaves');
  });
});

describe('a lock check onto the wire', () => {
  it('drops the claim name the row already carries, and keeps card and message only when present', () => {
    expect(lockRowOf({ claim: 'c', lineId: 'mainline', label: 'opening-hall', turn: 2, cardId: 'card0003', outcome: 'not-held', message: 'the player is in the Hall' })).toEqual({
      lineId: 'mainline', label: 'opening-hall', turn: 2, cardId: 'card0003', outcome: 'not-held', message: 'the player is in the Hall',
    });
    expect(lockRowOf({ claim: 'c', lineId: 'branch01', label: 'hall · north', turn: 3, outcome: 'held' })).toEqual({
      lineId: 'branch01', label: 'hall · north', turn: 3, outcome: 'held',
    });
  });
});
