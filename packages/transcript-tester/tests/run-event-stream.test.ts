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
