/**
 * claims.test.ts — the run column's claims-tier shaping (ADR-365 D6 and
 * ADR-367 D6 on the wire; GH #555).
 *
 * Derived from the Behavior Statement: the row and summary keep the payload
 * minus the envelope; the header is the ratio; the sentence beside a verdict
 * and the lock lines are the CLI report's OWN words — pinned against the
 * REAL `@sharpee/branch-tester` report functions fed the same row, so drift
 * between `sharpee test`'s report and the tab is a failing test.
 *
 * Owner context: tools/ide — the testing play surface's web bundle.
 */
import { describe, expect, it } from 'vitest';
import { claimHeadline, claimLockLine, claimSentence, claimsRatioLine, type ClaimResultRow } from '@sharpee/branch-tester/claim-report';
import { claimLockText, claimLockVisit, claimRowOf, claimWhyText, claimsCountsOf, claimsHeaderText, claimsSummaryOf } from '../src/claims';

const envelope = { schemaVersion: 2 as const, seq: 3, elapsedMs: 40 };
const row: ClaimResultRow = {
  name: 'the Landing is reached',
  never: false,
  kind: 'room',
  verdict: 'held',
  settledBy: 'line',
  set: 'the declared set',
  thingsInSet: 1,
  inertInSet: 0,
  line: { id: 'mainline', label: 'opening-hall', turn: 2 },
  floored: true,
  locks: [
    { lineId: 'mainline', label: 'opening-hall', turn: 2, cardId: 'card0003', outcome: 'held' },
    { lineId: 'branch01', label: 'hall · north', turn: 3, cardId: 'card0011', outcome: 'not-held', message: 'the player is in the Hall' },
  ],
};

describe('claimRowOf / claimsSummaryOf', () => {
  it('keep the payload and drop the envelope', () => {
    expect(claimRowOf({ ...envelope, type: 'claim-result', ...row })).toEqual(row);
    const summary = { source: 'x.claims.chord', declared: 2, held: 1, violated: 0, unproven: 1, walks: 1, totalWalkMs: 12, seed: 7, floored: true };
    expect(claimsSummaryOf({ ...envelope, type: 'claims-summary', ...summary })).toEqual(summary);
  });
});

describe('the words are the report\'s', () => {
  it('the sentence beside a verdict is claimSentence, the lock lines are claimLockLine without the indent', () => {
    expect(claimWhyText(row)).toBe(claimSentence(row));
    expect(claimWhyText(row)).toBe('by line mainline "opening-hall" at turn 2; its lock at line branch01 "hall · north" turn 3 is NOT held there');
    expect(claimHeadline(row)).toBe('HELD  the Landing is reached');
    expect(claimLockText(row, row.locks![0])).toBe('lock "the Landing is reached" at line mainline "opening-hall" at turn 2 — held there');
    expect(claimLockText(row, row.locks![1])).toBe(claimLockLine(row.name, row.locks![1]).trimStart());
    expect(claimLockText(row, row.locks![1])).toBe('lock "the Landing is reached" at line branch01 "hall · north" at turn 3 — NOT held there: the player is in the Hall');
  });

  it('a budget stop names the walk and the set\'s cost; an exhaustion names the set; a never claim says tried', () => {
    const budget: ClaimResultRow = { ...row, verdict: 'unproven', settledBy: 'budget', line: undefined, locks: undefined, thingsInSet: 38, inertInSet: 2, stopped: { reason: 'max-seconds', states: 1200 } };
    expect(claimWhyText(budget)).toBe('not reached by any line; the walk stopped at max-seconds after 1200 states; its set carries 38 things, 2 of which the claim\'s rules never reach; each independent thing doubles the states to exhaust');
    const never: ClaimResultRow = { ...row, name: 'the note leaves the Hall', never: true, settledBy: 'exhaustion', line: undefined, locks: undefined };
    expect(claimWhyText(never)).toBe('every reachable state under its set was tried (the declared set)');
    expect(claimHeadline(never)).toBe('HELD  the note leaves the Hall (never)');
  });

  it('the header is the report\'s ratio line once the summary has arrived, else the count so far', () => {
    const summary = { source: 'x', declared: 10, held: 9, violated: 1, unproven: 0, walks: 4, totalWalkMs: 1, floored: true };
    expect(claimsHeaderText(summary, [row])).toBe(claimsRatioLine(summary));
    expect(claimsHeaderText(summary, [row])).toBe('claims: 9 of 10 held, 1 violated');
    expect(claimsHeaderText(undefined, [row, row])).toBe('claims: 2 so far');
  });

  it('the counts are the summary\'s once it has arrived, the rows\' before it', () => {
    const summary = { source: 'x', declared: 10, held: 9, violated: 1, unproven: 0, walks: 4, totalWalkMs: 1, floored: true };
    expect(claimsCountsOf(summary, [row]).map((count) => count.text)).toEqual(['9 held', '1 violated']);
    expect(claimsCountsOf(undefined, [row, row]).map((count) => count.text)).toEqual([`2 ${row.verdict}`]);
  });

  it('a lock visits its line and its card when the wire named one', () => {
    expect(claimLockVisit(row.locks![1])).toEqual({ lineId: 'branch01', cardId: 'card0011' });
    expect(claimLockVisit({ lineId: 'l', label: 'x', turn: 1, outcome: 'held' })).toEqual({ lineId: 'l' });
  });
});
