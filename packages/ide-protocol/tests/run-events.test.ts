/**
 * Guard tests for the run-event stream (`RUN_EVENT_SCHEMA_VERSION = 2`).
 *
 * Covers the decode-boundary predicates — the version gate, the envelope every
 * event carries, and one round-trip per variant — plus the two properties the
 * vocabulary exists for and would silently lose: that a producer which explores
 * rather than replays can drive the whole stream without a second design, and
 * that `seq` makes the stream orderable independently of arrival.
 */

import { describe, it, expect } from 'vitest';
import {
  RUN_EVENT_SCHEMA_VERSION,
  isRunStartEvent,
  isPhaseEvent,
  isTranscriptStartEvent,
  isCommandResultEvent,
  isTranscriptEndEvent,
  isProgressEvent,
  isCoverageEvent,
  isRunEndEvent,
  isRunEvent,
  type RunEvent,
  type RunStartEvent,
  type PhaseEvent,
  type TranscriptStartEvent,
  type CommandResultEvent,
  type TranscriptEndEvent,
  type ProgressEvent,
  type CoverageEvent,
  type RunEndEvent,
} from '../src/index.js';

const envelope = { schemaVersion: RUN_EVENT_SCHEMA_VERSION, seq: 0, elapsedMs: 0 } as const;

describe('envelope and version gate', () => {
  it('rejects a record carrying the superseded version 1', () => {
    const v1 = { schemaVersion: 1, type: 'run-start', mode: 'chain', transcriptCount: 3 };
    expect(isRunStartEvent(v1)).toBe(false);
    expect(isRunEvent(v1)).toBe(false);
  });

  it('rejects an event missing the envelope, however well-formed its payload', () => {
    const noSeq = { schemaVersion: RUN_EVENT_SCHEMA_VERSION, type: 'run-start', mode: 'tests', elapsedMs: 4 };
    const noElapsed = { schemaVersion: RUN_EVENT_SCHEMA_VERSION, type: 'run-start', mode: 'tests', seq: 0 };
    expect(isRunStartEvent(noSeq)).toBe(false);
    expect(isRunStartEvent(noElapsed)).toBe(false);
  });

  it('rejects an unknown event type', () => {
    expect(isRunEvent({ ...envelope, type: 'finding', detail: 'softlock' })).toBe(false);
  });

  it('rejects non-objects at the decode boundary', () => {
    for (const value of [null, undefined, 'run-start', 42, []]) {
      expect(isRunEvent(value)).toBe(false);
    }
  });
});

describe('per-variant round trips', () => {
  it('accepts a run-start for every run mode', () => {
    for (const mode of ['tests', 'chain', 'tree', 'explore'] as const) {
      const event: RunStartEvent = { ...envelope, type: 'run-start', mode, transcriptCount: 2 };
      expect(isRunStartEvent(JSON.parse(JSON.stringify(event)))).toBe(true);
    }
    expect(isRunStartEvent({ ...envelope, type: 'run-start', mode: 'skein', transcriptCount: 2 })).toBe(false);
  });

  it('accepts phase events in started/finished pairs', () => {
    const started: PhaseEvent = { ...envelope, type: 'phase', name: 'compile', status: 'started' };
    const finished: PhaseEvent = { ...envelope, type: 'phase', name: 'compile', status: 'finished', detail: 'fernhill.story' };
    expect(isPhaseEvent(started)).toBe(true);
    expect(isPhaseEvent(finished)).toBe(true);
    expect(isPhaseEvent({ ...envelope, type: 'phase', name: 'warmup', status: 'started' })).toBe(false);
  });

  it('accepts a transcript-start with and without its tree fields', () => {
    const root: TranscriptStartEvent = { ...envelope, type: 'transcript-start', file: '/t/a.transcript', index: 0 };
    const child: TranscriptStartEvent = {
      ...envelope,
      type: 'transcript-start',
      file: '/t/b.transcript',
      index: 1,
      commandCount: 12,
      parent: '/t/a.transcript',
      replayed: true,
    };
    expect(isTranscriptStartEvent(root)).toBe(true);
    expect(isTranscriptStartEvent(child)).toBe(true);
    expect(isTranscriptStartEvent({ ...root, replayed: 'yes' })).toBe(false);
  });

  it('accepts a command-result with and without captured output', () => {
    const base: CommandResultEvent = {
      ...envelope,
      type: 'command-result',
      file: '/t/a.transcript',
      line: 7,
      input: 'north',
      passed: true,
      expectedFailure: false,
      skipped: false,
    };
    expect(isCommandResultEvent(base)).toBe(true);
    expect(isCommandResultEvent({ ...base, passed: false, actualOutput: 'You cannot go that way.' })).toBe(true);
    expect(isCommandResultEvent({ ...base, line: '7' })).toBe(false);
  });

  it('accepts every transcript-end status, including the two that never ran', () => {
    const base = {
      ...envelope,
      type: 'transcript-end' as const,
      file: '/t/a.transcript',
      passed: 0,
      failed: 0,
      expectedFailures: 0,
      skipped: 0,
      duration: 0,
    };
    const error: TranscriptEndEvent = { ...base, status: 'error', errorMessage: 'story failed to load' };
    const unreached: TranscriptEndEvent = { ...base, status: 'unreached', blockedBy: '/t/spine.transcript' };
    expect(isTranscriptEndEvent({ ...base, status: 'passed', passed: 12 })).toBe(true);
    expect(isTranscriptEndEvent({ ...base, status: 'failed', failed: 1 })).toBe(true);
    expect(isTranscriptEndEvent(error)).toBe(true);
    expect(isTranscriptEndEvent(unreached)).toBe(true);
    expect(isTranscriptEndEvent({ ...base, status: 'blocked' })).toBe(false);
  });

  it('accepts a coverage event and a run-end', () => {
    const coverage: CoverageEvent = {
      ...envelope,
      type: 'coverage',
      points: [{ name: 'combat.troll.swing', classes: ['hit', 'miss'], fired: 3, observed: ['hit'], unobserved: ['miss'] }],
      pointsFired: 1,
      pointsNeverFired: 0,
      classesUnobserved: 1,
    };
    const end: RunEndEvent = {
      ...envelope,
      type: 'run-end',
      totalPassed: 952,
      totalFailed: 0,
      totalExpectedFailures: 0,
      totalSkipped: 0,
      totalErrors: 0,
      totalUnreached: 0,
      totalDuration: 8452,
      exitCode: 0,
    };
    expect(isCoverageEvent(coverage)).toBe(true);
    expect(isRunEndEvent(end)).toBe(true);
    expect(isRunEndEvent({ ...end, totalUnreached: undefined })).toBe(false);
  });
});

describe('seq orders the stream independently of arrival', () => {
  it('restores emission order from shuffled lines', () => {
    const emitted: RunEvent[] = [0, 1, 2, 3].map((seq) => ({
      schemaVersion: RUN_EVENT_SCHEMA_VERSION,
      seq,
      elapsedMs: seq * 100,
      type: 'command-result',
      file: '/t/a.transcript',
      line: seq + 1,
      input: `command ${seq}`,
      passed: true,
      expectedFailure: false,
      skipped: false,
    }));

    const shuffled = [emitted[2], emitted[0], emitted[3], emitted[1]];
    expect(shuffled.every(isRunEvent)).toBe(true);
    const restored = [...shuffled].sort((a, b) => a.seq - b.seq);
    expect(restored.map((e) => e.seq)).toEqual([0, 1, 2, 3]);
    expect(restored).toEqual(emitted);
  });
});

/**
 * The vocabulary's real claim is that the eventual explorer (ADR-131 / ADR-294)
 * drives this same stream rather than needing a second one. An explorer differs
 * from a transcript run in exactly the ways that would break a stream designed
 * only for replay: it cannot say how many transcripts it will produce, it has no
 * authored file to start from, its progress has no denominator, and its budget
 * is three-dimensional and IS the report ("none found within N states / depth D
 * / T minutes"). This drives all four through the guards.
 */
describe('an explorer-shaped producer drives the same stream', () => {
  const explorerRun = (): RunEvent[] => {
    const events: RunEvent[] = [];
    let seq = 0;
    const at = (elapsedMs: number) => ({ schemaVersion: RUN_EVENT_SCHEMA_VERSION, seq: seq++, elapsedMs } as const);

    // No transcriptCount: the count is not knowable before the search runs.
    events.push({ ...at(0), type: 'run-start', mode: 'explore' });
    events.push({ ...at(5), type: 'phase', name: 'load', status: 'started' });
    events.push({ ...at(410), type: 'phase', name: 'load', status: 'finished' });
    events.push({ ...at(420), type: 'phase', name: 'execute', status: 'started' });

    // Progress with no denominator, and a budget across three dimensions.
    events.push({
      ...at(60_000),
      type: 'progress',
      scope: 'states',
      done: 12_400,
      budgets: [
        { unit: 'states', spent: 12_400, limit: 50_000 },
        { unit: 'seconds', spent: 60, limit: 300 },
        { unit: 'depth', spent: 14, limit: 40 },
      ],
    });

    // A candidate path the author will accept or discard as a file: a transcript
    // with no parent, no replay, and no pre-known command count.
    events.push({ ...at(61_000), type: 'transcript-start', file: '/t/proposed-softlock-1.transcript', index: 0 });
    events.push({
      ...at(61_200),
      type: 'command-result',
      file: '/t/proposed-softlock-1.transcript',
      line: 1,
      input: 'drop lantern',
      passed: true,
      expectedFailure: false,
      skipped: false,
    });
    events.push({
      ...at(61_400),
      type: 'transcript-end',
      file: '/t/proposed-softlock-1.transcript',
      status: 'passed',
      passed: 1,
      failed: 0,
      expectedFailures: 0,
      skipped: 0,
      duration: 400,
    });

    events.push({ ...at(300_000), type: 'phase', name: 'execute', status: 'finished' });
    events.push({
      ...at(300_010),
      type: 'run-end',
      totalPassed: 1,
      totalFailed: 0,
      totalExpectedFailures: 0,
      totalSkipped: 0,
      totalErrors: 0,
      totalUnreached: 0,
      totalDuration: 300_010,
      exitCode: 0,
    });
    return events;
  };

  it('every event survives the decode boundary', () => {
    const events = explorerRun();
    for (const event of events) {
      expect(isRunEvent(JSON.parse(JSON.stringify(event)))).toBe(true);
    }
  });

  it('opens without a transcript count, because a search cannot know one', () => {
    const start = explorerRun()[0] as RunStartEvent;
    expect(start.mode).toBe('explore');
    expect(start.transcriptCount).toBeUndefined();
    expect(isRunStartEvent(start)).toBe(true);
  });

  it('reports budget consumption across three dimensions with no denominator', () => {
    const progress = explorerRun().find((e): e is ProgressEvent => e.type === 'progress');
    expect(progress).toBeDefined();
    expect(progress!.total).toBeUndefined();
    expect(progress!.budgets?.map((b) => b.unit)).toEqual(['states', 'seconds', 'depth']);
    expect(isProgressEvent(progress)).toBe(true);
  });

  it('proposes transcripts that are neither parented nor replayed', () => {
    const start = explorerRun().find((e): e is TranscriptStartEvent => e.type === 'transcript-start');
    expect(start).toBeDefined();
    expect(start!.parent).toBeUndefined();
    expect(start!.replayed).toBeUndefined();
    expect(start!.commandCount).toBeUndefined();
    expect(isTranscriptStartEvent(start)).toBe(true);
  });

  it('keeps seq monotonic across a run whose events are not transcript-driven', () => {
    const seqs = explorerRun().map((e) => e.seq);
    expect(seqs).toEqual([...seqs].sort((a, b) => a - b));
    expect(new Set(seqs).size).toBe(seqs.length);
  });
});
