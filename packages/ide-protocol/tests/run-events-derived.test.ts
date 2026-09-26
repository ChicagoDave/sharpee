/**
 * Guard tests for the derived tier's two run events (ADR-356 on the wire,
 * GH #524): `derived-branch` and `derived-summary`.
 *
 * The property these exist to hold is D5a's — a SKIPPED branch is its own
 * status, never a failure — so the status set gets its own asserting tests
 * rather than a shape check alone.
 */

import { describe, it, expect } from 'vitest';
import {
  RUN_EVENT_SCHEMA_VERSION,
  isDerivedBranchEvent,
  isDerivedRunSummaryEvent,
  isRunEvent,
  type DerivedBranchEvent,
  type DerivedRunSummaryEvent,
} from '../src/index.js';

const envelope = { schemaVersion: RUN_EVENT_SCHEMA_VERSION, seq: 0, elapsedMs: 0 } as const;
const span = { file: 'mercenaries.chord', line: 167, column: 3, endLine: 167, endColumn: 40 };

describe('derived-branch', () => {
  const skipped: DerivedBranchEvent = {
    ...envelope,
    type: 'derived-branch',
    label: 'case clock · on winding · refused clock-already-going',
    span: { line: 573, column: 5, endLine: 573, endColumn: 44 },
    status: 'skipped',
    shape: 'negation',
    detail: '`case-clock is stopped` already holds in the booted world',
  };
  const failed: DerivedBranchEvent = {
    ...envelope,
    type: 'derived-branch',
    label: 'Tobias · topic boiler',
    span,
    status: 'failed',
    failure: 'emitted tobias-boiler-reply: "tobias-boiler-reply" was not emitted',
    command: 'ask tobias about boiler',
    arranged: ['player.location = Cellar'],
  };

  it('accepts every status in the closed set, with a span or null', () => {
    for (const status of ['passed', 'failed', 'skipped', 'error'] as const) {
      expect(isDerivedBranchEvent({ ...envelope, type: 'derived-branch', label: 'x', span: null, status })).toBe(true);
    }
    expect(isDerivedBranchEvent(skipped)).toBe(true);
    expect(isDerivedBranchEvent(failed)).toBe(true);
    expect(isRunEvent(skipped)).toBe(true);
    expect(isRunEvent(failed)).toBe(true);
  });

  it('keeps SKIPPED distinct from failed: a boolean or a spelling off the set is rejected', () => {
    expect(isDerivedBranchEvent({ ...skipped, status: false })).toBe(false);
    expect(isDerivedBranchEvent({ ...skipped, status: 'SKIPPED' })).toBe(false);
    expect(isDerivedBranchEvent({ ...skipped, status: 'skip' })).toBe(false);
    expect(isDerivedBranchEvent({ ...failed, status: true })).toBe(false);
  });

  it('requires the span key (null is a value, absence is not) and rejects a malformed span', () => {
    const { span: _omitted, ...noSpan } = skipped;
    void _omitted;
    expect(isDerivedBranchEvent(noSpan)).toBe(false);
    expect(isDerivedBranchEvent({ ...skipped, span: { line: 573 } })).toBe(false);
    expect(isDerivedBranchEvent({ ...skipped, span: 'fernhill.story:573' })).toBe(false);
  });

  it('rejects non-string optional fields and the superseded schema version', () => {
    expect(isDerivedBranchEvent({ ...skipped, shape: 7 })).toBe(false);
    expect(isDerivedBranchEvent({ ...failed, failure: ['x'] })).toBe(false);
    expect(isDerivedBranchEvent({ ...failed, arranged: 'player.location = Cellar' })).toBe(false);
    expect(isDerivedBranchEvent({ ...skipped, schemaVersion: 1 })).toBe(false);
    expect(isRunEvent({ ...skipped, schemaVersion: 1 })).toBe(false);
  });
});

describe('derived-summary', () => {
  const summary: DerivedRunSummaryEvent = {
    ...envelope,
    type: 'derived-summary',
    branches: {
      declared: 63,
      exercised: 33,
      passed: 31,
      failed: 2,
      gaps: [
        { label: 'boiler · on switching_on', status: 'skipped', shape: 'negation', detail: '`boiler is cold` already holds', span: { line: 271, column: 3, endLine: 271, endColumn: 20 } },
        { label: 'story · sequence the fuse burn step', status: 'error', span: null },
      ],
    },
    endings: {
      declared: 3,
      reached: 2,
      unreached: [{ id: 'dawn-comes', statement: 'lose', line: 636, file: null }],
      unnamed: [{ id: null, statement: 'kill', line: 167, file: 'mercenaries.chord' }],
    },
    rooms: { declared: 13, entered: 13, unentered: [] },
  };

  it('accepts the three ratios with their gap lists, and survives the decode boundary', () => {
    expect(isDerivedRunSummaryEvent(summary)).toBe(true);
    expect(isRunEvent(summary)).toBe(true);
    expect(isDerivedRunSummaryEvent({ ...summary, rooms: { declared: 13, entered: 12, unentered: ['cellar'] } })).toBe(true);
  });

  it('a gap is skipped or error, never failed — a failed branch is exercised, not a gap', () => {
    const failedGap = { label: 'x', status: 'failed', span: null };
    expect(isDerivedRunSummaryEvent({ ...summary, branches: { ...summary.branches, gaps: [failedGap] } })).toBe(false);
  });

  it('rejects a missing list, a non-numeric ratio, and an ending gap off its closed set', () => {
    const { unentered: _omitted, ...roomsWithoutList } = summary.rooms;
    void _omitted;
    expect(isDerivedRunSummaryEvent({ ...summary, rooms: roomsWithoutList })).toBe(false);
    expect(isDerivedRunSummaryEvent({ ...summary, endings: { ...summary.endings, reached: '2' } })).toBe(false);
    expect(
      isDerivedRunSummaryEvent({
        ...summary,
        endings: { ...summary.endings, unreached: [{ id: 'dawn-comes', statement: 'defeat', line: 636, file: null }] },
      }),
    ).toBe(false);
    expect(isDerivedRunSummaryEvent({ ...summary, schemaVersion: 1 })).toBe(false);
  });
});
