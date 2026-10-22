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

const SUMMARY: ClaimsSummaryRow = { source: 'fixture', declared: 4, held: 2, violated: 1, unproven: 1, walks: 1, totalWalkMs: 10, seed: 7, floored: true };

describe('the verdict counts', () => {
  it('read the summary once it has arrived, even when fewer rows are in hand', () => {
    const counts = claimCounts(SUMMARY, [{ verdict: 'held' }]);
    expect(counts).toEqual([
      { verdict: 'held', count: 2, text: '2 held' },
      { verdict: 'violated', count: 1, text: '1 violated' },
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
  it('the ratio line and the pending line', () => {
    expect(claimsRatioLine(SUMMARY)).toBe('claims: 2 of 4 held, 1 violated, 1 unproven (seed 7)');
    expect(claimsPendingLine(3)).toBe('claims: 3 so far');
  });

  it('a negative claim is marked in its title; the headline is the verdict word and the title', () => {
    expect(claimTitle({ name: 'the box leaves', never: true })).toBe('the box leaves (never)');
    expect(claimTitle({ name: 'the deed is in hand', never: false })).toBe('the deed is in hand');
    expect(claimVerdictWord({ verdict: 'unproven' })).toBe('UNPROVEN');
    expect(claimHeadline({ verdict: 'violated', name: 'the box leaves', never: true })).toBe('VIOLATED  the box leaves (never)');
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
