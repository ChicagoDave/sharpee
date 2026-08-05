/**
 * coverage.test.ts — outcome-class coverage (ADR-293 D15): tracker
 * accumulation from trace events, `catalog − fired` via the process-global
 * catalog, per-point observed/unobserved classes, runner integration (the
 * trace → tracker path over a REAL EngineRandomService), the NDJSON coverage
 * record, and the formatting surfaces.
 *
 * Derived from the Behavior Statement. Points here use the unique
 * `tt-coverage.` prefix, and every report is built with that prefix filter —
 * the catalog is process-global, so unfiltered reports would see other test
 * files' points (which is itself asserted as the filter's behavior).
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { definePoint } from '@sharpee/core';
import { EngineRandomService } from '@sharpee/engine';
import { isCoverageRecord } from '@sharpee/ide-protocol';
import { CoverageTracker, formatCoverageSummary, formatCoverageBreakdown } from '../src/coverage.js';
import { coverageRecord } from '../src/aggregate.js';
import { parseTranscript } from '../src/parser.js';
import { runTranscript } from '../src/runner.js';

const PREFIX = ['tt-coverage'];

// Real catalog entries, registered once at module load (D2).
const AMBIENCE = definePoint('tt-coverage.ambience', { classes: ['yes', 'no'] as const });
const BLOW = definePoint('tt-coverage.blow', {
  classes: ['MISSED', 'SERIOUS_WOUND', 'KILLED'] as const
});
const EXIT_PICK = definePoint('tt-coverage.exit');
definePoint('tt-coverage.never-fired', { classes: ['yes', 'no'] as const });

describe('CoverageTracker accumulation and report (D15)', () => {
  it('crosses the catalog against firings: fired counts, observed and unobserved classes, never-fired rows', () => {
    const tracker = new CoverageTracker();
    tracker.record({ point: 'tt-coverage.ambience', cls: 'yes' });
    tracker.record({ point: 'tt-coverage.ambience', cls: 'yes' });
    tracker.record({ point: 'tt-coverage.ambience', cls: 'no' });
    tracker.record({ point: 'tt-coverage.blow', cls: 'MISSED' });
    tracker.record({ point: 'tt-coverage.exit' }); // plain draw, no cls

    const report = tracker.buildReport(PREFIX);

    expect(report.points).toEqual([
      {
        name: 'tt-coverage.ambience',
        classes: ['yes', 'no'],
        fired: 3,
        observed: ['no', 'yes'],
        unobserved: []
      },
      {
        name: 'tt-coverage.blow',
        classes: ['MISSED', 'SERIOUS_WOUND', 'KILLED'],
        fired: 1,
        observed: ['MISSED'],
        unobserved: ['SERIOUS_WOUND', 'KILLED']
      },
      { name: 'tt-coverage.exit', fired: 1 },
      {
        name: 'tt-coverage.never-fired',
        classes: ['yes', 'no'],
        fired: 0,
        observed: [],
        unobserved: ['yes', 'no']
      }
    ]);
    expect(report.pointsFired).toBe(3);
    expect(report.pointsNeverFired).toBe(1);
    // blow: 2 + never-fired: 2
    expect(report.classesUnobserved).toBe(4);
  });

  it('an empty tracker reports every declared point never-fired (catalog − fired with nothing fired)', () => {
    const report = new CoverageTracker().buildReport(PREFIX);

    expect(report.pointsFired).toBe(0);
    expect(report.pointsNeverFired).toBe(report.points.length);
    expect(report.points.length).toBeGreaterThanOrEqual(4);
  });

  it('the prefix filter scopes the report by first dotted segment (D2/A1 multi-story rule)', () => {
    const report = new CoverageTracker().buildReport(PREFIX);
    expect(report.points.every((p) => p.name.startsWith('tt-coverage.'))).toBe(true);

    // Unfiltered, the process-global catalog includes other prefixes too.
    const unfiltered = new CoverageTracker().buildReport();
    expect(unfiltered.points.length).toBeGreaterThan(report.points.length);
  });

  it('collectFrom reads system.draw events only, ignoring everything else', () => {
    const tracker = new CoverageTracker();
    tracker.collectFrom([
      { type: 'system.draw', data: { point: 'tt-coverage.ambience', cls: 'yes' } },
      { type: 'if.event.pushed', data: { point: 'not-a-trace' } },
      { type: 'system.parse_attempt', data: {} },
      { type: 'system.draw', data: undefined }, // malformed — ignored
      { type: 'system.draw', data: { point: 'tt-coverage.exit' } }
    ]);
    tracker.collectFrom(undefined); // no events — no-op

    const report = tracker.buildReport(PREFIX);
    expect(report.points.find((p) => p.name === 'tt-coverage.ambience')?.fired).toBe(1);
    expect(report.points.find((p) => p.name === 'tt-coverage.exit')?.fired).toBe(1);
  });

  it('forced firings count for class coverage (D8 — class coverage, not provenance-gated)', () => {
    const tracker = new CoverageTracker();
    tracker.record({ point: 'tt-coverage.blow', cls: 'KILLED' }); // provenance irrelevant

    const blow = tracker.buildReport(PREFIX).points.find((p) => p.name === 'tt-coverage.blow');
    expect(blow?.observed).toEqual(['KILLED']);
    expect(blow?.unobserved).toEqual(['MISSED', 'SERIOUS_WOUND']);
  });
});

describe('runner integration — trace to tracker over a real EngineRandomService', () => {
  let dir: string;
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tt-coverage-')); });
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

  /**
   * Stub story layer whose draws go through a REAL EngineRandomService, with
   * the trace sink wired to a lastEvents batch shaped like the engine's
   * system.draw re-emission — the real trace payload shape.
   */
  function tracedEngine(seed = 42) {
    const service = new EngineRandomService(seed);
    const engine: {
      lastEvents: Array<{ type: string; data?: unknown }>;
      executeCommand(cmd: string): string;
      world: object;
      engine: object;
    } = {
      lastEvents: [],
      executeCommand: (cmd: string) => {
        engine.lastEvents = [];
        if (cmd === 'fight') {
          const outcome = service.resolve(
            BLOW,
            (draw) => {
              const roll = draw.int(1, 100);
              return { cls: roll > 60 ? 'SERIOUS_WOUND' as const : 'MISSED' as const, value: roll };
            },
            () => 0
          );
          return `Blow: ${outcome.cls}.`;
        }
        if (cmd === 'listen') {
          return service.chance(AMBIENCE, 0.5) ? 'A bird chirps.' : 'Silence.';
        }
        return `You ${cmd}.`;
      },
      world: {},
      engine: {
        registerSaveRestoreHooks() { /* unused */ },
        async save() { return true; },
        async restore() { return true; },
        getMasterSeed: () => seed,
        getRandomService: () => service,
        setRandomTraceEnabled: (enabled: boolean) => {
          service.setTraceSink(
            enabled
              ? (record) => engine.lastEvents.push({ type: 'system.draw', data: record })
              : undefined
          );
        }
      }
    };
    return engine;
  }

  it('a run accumulates real drawn firings into the tracker via the runner', async () => {
    const transcript = parseTranscript(
      'title: T\n---\n> fight\n[OK: contains "Blow"]\n\n> listen\n[OK: contains "."]\n',
      path.join(dir, 'cov.transcript')
    );
    const tracker = new CoverageTracker();

    const result = await runTranscript(transcript, tracedEngine() as never, { coverage: tracker });

    expect(result.status).toBe('passed');
    const report = tracker.buildReport(PREFIX);
    const blow = report.points.find((p) => p.name === 'tt-coverage.blow');
    const ambience = report.points.find((p) => p.name === 'tt-coverage.ambience');
    expect(blow?.fired).toBe(1);
    expect(blow?.observed).toHaveLength(1); // whichever class seed 42 drew
    expect(ambience?.fired).toBe(1);
    expect(report.points.find((p) => p.name === 'tt-coverage.never-fired')?.fired).toBe(0);
  });

  it('the golden tier collects trace too — bless then replay both feed the tracker', async () => {
    const source = 'title: T\nstory: s\nseed: 42\n---\n> fight\n\n> listen\n';
    const bless = await runTranscript(
      parseTranscript(source, path.join(dir, 'g.transcript')),
      tracedEngine() as never,
      { bless: true, coverage: new CoverageTracker() }
    );
    expect(bless.status).toBe('passed');

    // Replay (mode: 'replay' — the golden loop, not the assertion loop).
    const tracker = new CoverageTracker();
    const replay = await runTranscript(
      parseTranscript(source, path.join(dir, 'g.transcript')),
      tracedEngine() as never,
      { coverage: tracker }
    );

    expect(replay.status).toBe('passed');
    expect(replay.tier).toBe('golden');
    const report = tracker.buildReport(PREFIX);
    expect(report.points.find((p) => p.name === 'tt-coverage.blow')?.fired).toBe(1);
    expect(report.points.find((p) => p.name === 'tt-coverage.ambience')?.fired).toBe(1);
  });

  it('one tracker folds a chain into one report (D15 aggregation ruling)', async () => {
    const engine = tracedEngine();
    const tracker = new CoverageTracker();
    const first = parseTranscript('title: A\n---\n> fight\n[OK: contains "Blow"]\n', path.join(dir, 'a.transcript'));
    const second = parseTranscript('title: B\n---\n> fight\n[OK: contains "Blow"]\n', path.join(dir, 'b.transcript'));

    await runTranscript(first, engine as never, { chain: true, coverage: tracker });
    await runTranscript(second, engine as never, { chain: true, coverage: tracker });

    expect(
      tracker.buildReport(PREFIX).points.find((p) => p.name === 'tt-coverage.blow')?.fired
    ).toBe(2);
  });
});

describe('the coverage NDJSON record (ADR-277 wire, ADR-294 D13)', () => {
  it('coverageRecord builds a guard-valid record from a report', () => {
    const tracker = new CoverageTracker();
    tracker.record({ point: 'tt-coverage.ambience', cls: 'yes' });
    const record = coverageRecord(tracker.buildReport(PREFIX));

    expect(record.type).toBe('coverage');
    expect(isCoverageRecord(record)).toBe(true);
    expect(isCoverageRecord(JSON.parse(JSON.stringify(record)))).toBe(true);
  });

  it('the guard rejects malformed points', () => {
    expect(
      isCoverageRecord({
        schemaVersion: 1,
        type: 'coverage',
        points: [{ name: 42, fired: 'many' }],
        pointsFired: 0,
        pointsNeverFired: 0,
        classesUnobserved: 0
      })
    ).toBe(false);
  });
});

describe('formatting (D15 surfaces)', () => {
  it('the always-printed summary is one line with the three counts', () => {
    const tracker = new CoverageTracker();
    tracker.record({ point: 'tt-coverage.ambience', cls: 'yes' });
    const summary = formatCoverageSummary(tracker.buildReport(PREFIX));

    expect(summary).not.toContain('\n');
    expect(summary).toMatch(/Coverage: 1 of \d+ points fired, \d+ never fired, \d+ classes unobserved/);
  });

  it('an empty report formats without throwing (the Math.max(0, ...) guard)', () => {
    expect(
      formatCoverageBreakdown({ points: [], pointsFired: 0, pointsNeverFired: 0, classesUnobserved: 0 })
    ).toBe('Coverage (0 points):');
  });

  it('the breakdown lists every point with fired counts, unobserved classes, and plain-draw markers', () => {
    const tracker = new CoverageTracker();
    tracker.record({ point: 'tt-coverage.blow', cls: 'MISSED' });
    tracker.record({ point: 'tt-coverage.exit' });
    const breakdown = formatCoverageBreakdown(tracker.buildReport(PREFIX));

    expect(breakdown).toMatch(/tt-coverage\.blow\s+fired 1\s+unobserved: SERIOUS_WOUND, KILLED/);
    expect(breakdown).toMatch(/tt-coverage\.exit\s+fired 1\s+\(plain draw\)/);
    expect(breakdown).toMatch(/tt-coverage\.never-fired\s+never fired\s+unobserved: yes, no/);
  });
});
