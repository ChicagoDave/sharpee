/**
 * derived-stream.test.ts — the two wire mappers (ADR-356 on the run-event
 * wire, GH #524): `streamableDerivedOutcome` carries a branch's verdict with
 * the failure line the text report cites, and nothing a passed branch does
 * not have; `streamableDerivedSummary` carries the three ratios and their
 * gaps as the report prints them. Real runs over the derived fixtures.
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile, type StoryIR } from '@sharpee/chord';
import { createStory } from '@sharpee/story-loader';
import { assembleGame } from '@sharpee/bootstrap';
import { runDerivedSuite, type DerivedGame } from '../src/derived-runner.js';
import {
  branchCoverageOf,
  endingCoverageOf,
  formatDerivedRun,
  roomCoverageOf,
  streamableDerivedOutcome,
  streamableDerivedSummary,
} from '../src/coverage.js';

const SEED = 7;

function fixtureSource(name: string): string {
  return readFileSync(resolve(__dirname, 'fixtures/derived', `${name}.story`), 'utf8');
}

function compileSource(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  return result.ir;
}

function loaderFor(source: string): () => Promise<DerivedGame> {
  return async () => {
    const story = createStory(compileSource(source), { seed: SEED });
    return assembleGame(story, { seed: SEED, freshStory: () => createStory(compileSource(source), { seed: SEED }) }) as unknown as DerivedGame;
  };
}

describe('streamableDerivedOutcome', () => {
  it('carries a SKIPPED branch with its shape and span, and a passed branch with neither shape nor failure', async () => {
    const source = fixtureSource('skip');
    const run = await runDerivedSuite(compileSource(source), loaderFor(source));
    const payloads = run.outcomes.map(streamableDerivedOutcome);

    const skipped = payloads.find((payload) => payload.status === 'skipped')!;
    expect(skipped.label).toBe('brass lamp · on examining');
    expect(skipped.shape).toBe('timer-phase');
    expect(skipped.detail).toBe('brass-lamp.flicker has expired');
    expect(skipped.span?.line).toBe(run.outcomes.find((outcome) => outcome.status === 'skipped')!.span!.line);
    expect(Object.keys(skipped)).not.toContain('failure');

    const passed = payloads.find((payload) => payload.label === 'brass lamp · on touching')!;
    expect(passed.status).toBe('passed');
    expect(Object.keys(passed)).not.toContain('shape');
    expect(Object.keys(passed)).not.toContain('failure');
    expect(passed.command).toBeDefined();
    expect(passed.arranged?.length).toBeGreaterThan(0);
  }, 30_000);

  it('renders a failed branch\'s failure from its first failing claim — the same text the report row cites', async () => {
    const run = await runDerivedSuite(compileSource(fixtureSource('vine')), loaderFor(fixtureSource('vine-defect')));
    const failed = run.outcomes.find((outcome) => outcome.status === 'failed')!;
    const payload = streamableDerivedOutcome(failed);

    expect(payload.status).toBe('failed');
    expect(payload.failure).toMatch(/^silver-locket\.location = greenhouse: silver-locket\.location is /);
    const reportRow = formatDerivedRun(run, 'vine.story').find((line) => line.startsWith(`✗ ${failed.label}`))!;
    expect(reportRow).toContain(` — ${payload.failure} (`);
  }, 30_000);

  it('renders a parse failure\'s failure from its detail, since no claim ran', async () => {
    const source = fixtureSource('no-vocabulary');
    const run = await runDerivedSuite(compileSource(source), loaderFor(source));
    const failed = run.outcomes.find((outcome) => outcome.status === 'failed')!;
    expect(streamableDerivedOutcome(failed).failure).toBe('parse failure: no language pattern for if.action.entering_room');
  }, 30_000);
});

describe('streamableDerivedSummary', () => {
  const declaredEndings = [
    { id: 'fernhill-saved', kind: 'victory', statement: 'win', owner: { kind: 'entity', id: 'iron-gates' }, line: 65, file: null },
    { id: 'dawn-comes', kind: 'defeat', statement: 'lose', owner: { kind: 'story' }, line: 636, file: null },
    { id: null, kind: 'defeat', statement: 'kill', owner: { kind: 'story' }, line: 167, file: 'mercenaries.chord' },
  ] as const;
  const rooms = [{ id: 'iron-gates', name: 'Iron Gates' }, { id: 'cellar', name: 'Cellar' }] as never[];

  it('carries the three ratios and every gap as the report computes them', async () => {
    const source = fixtureSource('skip');
    const run = await runDerivedSuite(compileSource(source), loaderFor(source));
    const branches = branchCoverageOf(run);
    const endings = endingCoverageOf([...declaredEndings] as never, ['fernhill-saved']);
    const roomCoverage = roomCoverageOf(rooms, ['iron-gates']);

    const summary = streamableDerivedSummary(branches, endings, roomCoverage);
    expect(summary.branches).toEqual({
      declared: 3,
      exercised: 2,
      passed: 2,
      failed: 0,
      gaps: [{ label: 'brass lamp · on examining', status: 'skipped', shape: 'timer-phase', detail: 'brass-lamp.flicker has expired', span: branches.gaps[0].span }],
    });
    expect(summary.endings).toEqual({
      declared: 2,
      reached: 1,
      unreached: [{ id: 'dawn-comes', statement: 'lose', line: 636, file: null }],
      unnamed: [{ id: null, statement: 'kill', line: 167, file: 'mercenaries.chord' }],
    });
    expect(summary.rooms).toEqual({ declared: 2, entered: 1, unentered: ['cellar'] });
  }, 30_000);
});
