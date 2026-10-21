/**
 * Guard tests for the claims tier's two run events (ADR-365 D6 and ADR-367
 * D6 on the wire; GH #555): `claim-result` and `claims-summary`.
 *
 * The property these hold is D9's: a verdict is one of three words and a
 * lock's outcome one of three, so a consumer cannot read UNPROVEN as failed
 * or a held lock as broken. Shape checks beside the closed sets.
 */

import { describe, it, expect } from 'vitest';
import {
  RUN_EVENT_SCHEMA_VERSION,
  isClaimResultEvent,
  isClaimsSummaryEvent,
  isRunEvent,
  type ClaimResultEvent,
  type ClaimsSummaryEvent,
} from '../src/index.js';

const envelope = { schemaVersion: RUN_EVENT_SCHEMA_VERSION, seq: 0, elapsedMs: 0 } as const;

describe('claim-result', () => {
  const byLine: ClaimResultEvent = {
    ...envelope,
    type: 'claim-result',
    name: 'the deed box is open',
    never: false,
    kind: 'flag',
    verdict: 'held',
    settledBy: 'line',
    set: 'the set of "the deed box is open"',
    thingsInSet: 1,
    inertInSet: 0,
    line: { id: 'weefpbmr', label: 'opening-iron-gates', turn: 23 },
    floored: true,
    locks: [{ lineId: 'hpjuaufx', label: 'folly · open deed box with locket', turn: 22, cardId: 't1500031', outcome: 'held' }],
  };
  const budget: ClaimResultEvent = {
    ...envelope,
    type: 'claim-result',
    name: 'the player is in the Kraken Landing',
    never: false,
    kind: 'room',
    verdict: 'unproven',
    settledBy: 'budget',
    set: 'the declared set',
    thingsInSet: 38,
    inertInSet: 0,
    stopped: { reason: 'max-seconds', states: 120_000 },
    floored: true,
    locks: [{ lineId: 'a366titn', label: 'landing-pad · show card to quint', turn: 160, outcome: 'not-held', message: 'the player is in the Shuttle Gate' }],
  };

  it('accepts every verdict, every settledBy, and every lock outcome in their closed sets', () => {
    for (const verdict of ['held', 'violated', 'unproven'] as const) expect(isClaimResultEvent({ ...byLine, verdict })).toBe(true);
    for (const settledBy of ['line', 'witness', 'exhaustion', 'budget'] as const) expect(isClaimResultEvent({ ...byLine, settledBy })).toBe(true);
    for (const outcome of ['held', 'not-held', 'unknown-claim'] as const) {
      expect(isClaimResultEvent({ ...byLine, locks: [{ ...byLine.locks![0], outcome }] })).toBe(true);
    }
    expect(isClaimResultEvent(budget)).toBe(true);
    expect(isRunEvent(byLine)).toBe(true);
    expect(isRunEvent(budget)).toBe(true);
  });

  it('rejects a verdict, a settledBy, or a lock outcome outside the set, and a lock without its line', () => {
    expect(isClaimResultEvent({ ...byLine, verdict: 'failed' })).toBe(false);
    expect(isClaimResultEvent({ ...byLine, verdict: true })).toBe(false);
    expect(isClaimResultEvent({ ...byLine, settledBy: 'walk' })).toBe(false);
    expect(isClaimResultEvent({ ...byLine, locks: [{ ...byLine.locks![0], outcome: 'broken' }] })).toBe(false);
    expect(isClaimResultEvent({ ...byLine, locks: [{ label: 'x', turn: 1, outcome: 'held' }] })).toBe(false);
    expect(isClaimResultEvent({ ...byLine, line: { id: 'x' } })).toBe(false);
    expect(isClaimResultEvent({ ...budget, stopped: { reason: 'max-seconds' } })).toBe(false);
  });

  it('optional fields are optional: no line, no witness, no locks, no stopped', () => {
    const { line: _l, locks: _k, ...bare } = byLine;
    expect(isClaimResultEvent({ ...bare, settledBy: 'exhaustion' })).toBe(true);
    expect(isClaimResultEvent({ ...bare, settledBy: 'witness', witness: ['read auction notice'], depth: 1 })).toBe(true);
    expect(isClaimResultEvent({ ...bare, settledBy: 'witness', witness: [1] })).toBe(false);
  });

  it('rejects a missing floored flag and a wrong schema version', () => {
    const { floored: _f, ...noFloor } = byLine;
    expect(isClaimResultEvent(noFloor)).toBe(false);
    expect(isClaimResultEvent({ ...byLine, schemaVersion: 1 })).toBe(false);
  });
});

describe('claims-summary', () => {
  const summary: ClaimsSummaryEvent = {
    ...envelope,
    type: 'claims-summary',
    source: 'fernhill.claims.chord',
    declared: 10,
    held: 9,
    violated: 1,
    unproven: 0,
    walks: 4,
    totalWalkMs: 1012,
    seed: 42,
    floored: true,
  };

  it('accepts the ratio with or without a seed, and rejects a missing count', () => {
    expect(isClaimsSummaryEvent(summary)).toBe(true);
    const { seed: _s, ...noSeed } = summary;
    expect(isClaimsSummaryEvent(noSeed)).toBe(true);
    expect(isRunEvent(summary)).toBe(true);
    const { held: _h, ...noHeld } = summary;
    expect(isClaimsSummaryEvent(noHeld)).toBe(false);
    expect(isClaimsSummaryEvent({ ...summary, walks: '4' })).toBe(false);
  });
});
