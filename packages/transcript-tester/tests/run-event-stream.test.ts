/**
 * run-event-stream.test.ts — the stream's two derived methods (ADR-356 on
 * the wire, GH #524): each writes one event carrying the envelope and the
 * payload verbatim, optional fields present exactly when given, and `seq`
 * stays monotonic across a run that mixes tree and derived events.
 *
 * Owner context: transcript-tester test suite (tooling).
 */
import { describe, expect, it } from 'vitest';
import type { RunEvent } from '@sharpee/ide-protocol';
import { RunEventStream, type StreamableDerivedOutcome, type StreamableDerivedSummary } from '../src/index.js';

function recorder(): { events: RunEvent[]; stream: RunEventStream; tick: () => void } {
  const events: RunEvent[] = [];
  let clock = 1_000;
  const stream = new RunEventStream((event) => events.push(event), () => clock);
  return { events, stream, tick: () => { clock += 250; } };
}

const skipped: StreamableDerivedOutcome = {
  label: 'brass lamp · on examining',
  span: { line: 12, column: 3, endLine: 12, endColumn: 50 },
  status: 'skipped',
  shape: 'timer-phase',
  detail: 'brass-lamp.flicker has expired',
};

const passed: StreamableDerivedOutcome = {
  label: 'brass lamp · on touching',
  span: { line: 9, column: 3, endLine: 9, endColumn: 30 },
  status: 'passed',
  command: 'touch lamp',
  arranged: ['player.location = Hall'],
};

const summary: StreamableDerivedSummary = {
  branches: { declared: 3, exercised: 2, passed: 2, failed: 0, gaps: [{ label: skipped.label, status: 'skipped', shape: 'timer-phase', span: skipped.span }] },
  endings: { declared: 0, reached: 0, unreached: [], unnamed: [] },
  rooms: { declared: 1, entered: 1, unentered: [] },
};

describe('RunEventStream — command-result names its card (ADR-357 D9)', () => {
  const base = {
    passed: false,
    expectedFailure: false,
    skipped: false,
    actualOutput: 'You cannot go that way.',
  };

  it('writes cardId when the command carries one and omits the key when it does not', () => {
    const { events, stream } = recorder();
    stream.commandResult('main', { ...base, command: { input: 'north', lineNumber: 0, cardId: 'c-north' } });
    stream.commandResult('/t/a.transcript', { ...base, command: { input: 'north', lineNumber: 7 } });

    const [withCard, withoutCard] = events as Array<Record<string, unknown>>;
    expect(withCard.type).toBe('command-result');
    expect(withCard.cardId).toBe('c-north');
    expect(withoutCard.type).toBe('command-result');
    expect('cardId' in withoutCard).toBe(false);
  });
});

describe('RunEventStream — derived-branch and derived-summary', () => {
  it('writes each derived event with the envelope and the payload verbatim, omitting absent optionals', () => {
    const { events, stream, tick } = recorder();
    stream.runStart('tree', 1);
    tick();
    stream.derivedBranch(skipped);
    tick();
    stream.derivedBranch(passed);
    stream.derivedSummary(summary);

    expect(events.map((event) => event.type)).toEqual(['run-start', 'derived-branch', 'derived-branch', 'derived-summary']);
    expect(events[1]).toEqual({
      schemaVersion: 2,
      seq: 1,
      elapsedMs: 250,
      type: 'derived-branch',
      ...skipped,
    });
    expect(events[2]).toEqual({ schemaVersion: 2, seq: 2, elapsedMs: 500, type: 'derived-branch', ...passed });
    // A passed branch carries no shape, detail or failure key at all — not `undefined`.
    expect(Object.keys(events[2])).not.toContain('shape');
    expect(Object.keys(events[2])).not.toContain('failure');
    expect(events[3]).toEqual({ schemaVersion: 2, seq: 3, elapsedMs: 500, type: 'derived-summary', ...summary });
  });

  it('keeps seq monotonic across a run that interleaves tree and derived events', () => {
    const { events, stream } = recorder();
    stream.runStart('tree', 1);
    stream.transcriptStart('/story/x.tests.json#main', 0, { commandCount: 2 });
    stream.transcriptEnd({ transcript: { filePath: '/story/x.tests.json#main' }, status: 'passed', passed: 2, failed: 0, expectedFailures: 0, skipped: 0, duration: 10 });
    stream.derivedBranch(passed);
    stream.derivedBranch(skipped);
    stream.derivedSummary(summary);
    stream.runEnd({ totalPassed: 2, totalFailed: 0, totalExpectedFailures: 0, totalSkipped: 0, totalErrors: 0, totalDuration: 10 }, 0);

    expect(events.map((event) => event.seq)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    const derivedSeqs = events.filter((event) => event.type === 'derived-branch').map((event) => event.seq);
    const treeEndSeq = events.find((event) => event.type === 'transcript-end')!.seq;
    const summarySeq = events.find((event) => event.type === 'derived-summary')!.seq;
    const endSeq = events.find((event) => event.type === 'run-end')!.seq;
    expect(Math.min(...derivedSeqs)).toBeGreaterThan(treeEndSeq);
    expect(summarySeq).toBeGreaterThan(Math.max(...derivedSeqs));
    expect(endSeq).toBeGreaterThan(summarySeq);
  });
});

// ── the claims tier on the same stream (ADR-365 D6, ADR-367 D6; GH #555) ───

describe('RunEventStream — claim-result and claims-summary', () => {
  it('writes each claims event with the envelope and the payload verbatim, omitting absent optionals, seq monotonic after the derived tier', () => {
    const { events, stream, tick } = recorder();
    stream.runStart('tree', 1);
    tick();
    stream.derivedSummary(summary);
    tick();
    stream.claimResult({
      name: 'the deed box is open', never: false, kind: 'flag', verdict: 'held', settledBy: 'line',
      set: 'the declared set', thingsInSet: 13, inertInSet: 0,
      line: { id: 'weefpbmr', label: 'opening-iron-gates', turn: 23 }, floored: true,
      locks: [{ lineId: 'hpjuaufx', label: 'folly · open deed box with locket', turn: 22, cardId: 'c1', outcome: 'held' }],
    });
    tick();
    stream.claimResult({
      name: 'the deed box leaves the Folly', never: true, kind: 'placement', verdict: 'violated', settledBy: 'witness',
      set: 'the set of "the deed box leaves the Folly"', thingsInSet: 6, inertInSet: 0, witness: ['north', 'take deed box'], depth: 2, floored: true,
    });
    tick();
    stream.claimsSummary({ source: 'fernhill.claims.chord', declared: 2, held: 1, violated: 1, unproven: 0, walks: 1, totalWalkMs: 800, seed: 42, floored: true });

    const [, derivedEvent, held, violated, ratio] = events as Array<Record<string, unknown>>;
    expect(derivedEvent.type).toBe('derived-summary');
    expect(held.type).toBe('claim-result');
    expect(held.name).toBe('the deed box is open');
    expect(held.locks).toEqual([{ lineId: 'hpjuaufx', label: 'folly · open deed box with locket', turn: 22, cardId: 'c1', outcome: 'held' }]);
    expect('witness' in held).toBe(false);
    expect(violated.type).toBe('claim-result');
    expect(violated.witness).toEqual(['north', 'take deed box']);
    expect('locks' in violated).toBe(false);
    expect('line' in violated).toBe(false);
    expect(ratio.type).toBe('claims-summary');
    expect(ratio).toMatchObject({ source: 'fernhill.claims.chord', declared: 2, held: 1, violated: 1, unproven: 0, walks: 1, seed: 42, floored: true });
    expect(events.map((event) => event.seq)).toEqual([0, 1, 2, 3, 4]);
    expect(events.map((event) => event.elapsedMs)).toEqual([0, 250, 500, 750, 1000]);
    expect(events.every((event) => event.schemaVersion === 2)).toBe(true);
  });
});
