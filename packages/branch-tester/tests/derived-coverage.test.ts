/**
 * derived-coverage.test.ts — the branch coverage report (ADR-356 D5, AC-8):
 * the ratio's denominator is the enumerator's count, a SKIPPED branch is a
 * gap carrying its authored span, a failed branch is exercised and cited by
 * its first failing claim. Real runs over the derived fixtures — no stub.
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile, type StoryIR } from '@sharpee/chord';
import { collectClauseBranches } from '@sharpee/world-index';
import { createStory } from '@sharpee/story-loader';
import { assembleGame } from '@sharpee/bootstrap';
import { runDerivedSuite, type DerivedGame } from '../src/derived-runner.js';
import { branchCoverageOf, formatDerivedRun } from '../src/coverage.js';

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

/** The 1-based line of the first source line containing `text`. */
function lineOf(source: string, text: string): number {
  const index = source.split('\n').findIndex((line) => line.includes(text));
  if (index < 0) throw new Error(`"${text}" is not in the fixture`);
  return index + 1;
}

describe('AC-8 — the report names unexercised branches by span', () => {
  it('reads n−1 / n with one unarrangeable branch, and the gap carries that branch\'s authored line', async () => {
    const source = fixtureSource('skip');
    const ir = compileSource(source);
    const run = await runDerivedSuite(ir, loaderFor(source));
    const coverage = branchCoverageOf(run);

    expect(coverage.declared).toBe(collectClauseBranches(ir).length);
    expect(coverage.declared).toBe(3);
    expect(coverage.exercised).toBe(2);
    expect(coverage.passed).toBe(2);
    expect(coverage.failed).toBe(0);
    expect(coverage.gaps).toHaveLength(1);

    const [gap] = coverage.gaps;
    expect(gap.status).toBe('skipped');
    expect(gap.shape).toBe('timer-phase');
    expect(gap.label).toBe('brass lamp · on examining');
    expect(gap.span?.line).toBe(lineOf(source, 'on the player examining while flicker has expired'));

    const report = formatDerivedRun(run, 'skip.story');
    expect(report).toContain('Branches exercised: 2 / 3');
    expect(report).toContain('Not exercised (1):');
    expect(report.at(-1)).toBe(`  skip.story:${gap.span!.line} · brass lamp · on examining — timer-phase (brass-lamp.flicker has expired)`);
    expect(report.some((line) => line.startsWith('✓ brass lamp · on touching'))).toBe(true);
    expect(report.some((line) => line.startsWith('Derived failures'))).toBe(false);
  }, 30_000);

  it('counts a failed branch as exercised and cites its first failing claim, not as a gap', async () => {
    const ir = compileSource(fixtureSource('vine'));
    const run = await runDerivedSuite(ir, loaderFor(fixtureSource('vine-defect')));
    const coverage = branchCoverageOf(run);

    expect(coverage.declared).toBe(8);
    expect(coverage.exercised).toBe(7);
    expect(coverage.passed).toBe(6);
    expect(coverage.failed).toBe(1);
    expect(coverage.gaps.map((gap) => gap.shape)).toEqual(['no-claims']);

    const report = formatDerivedRun(run, 'vine.story');
    expect(report).toContain('Branches exercised: 7 / 8');
    expect(report).toContain('Derived failures: 1');
    const failure = report.find((line) => line.startsWith('✗ vine · on pruning · when flowering'));
    expect(failure).toMatch(/— silver-locket\.location = greenhouse: silver-locket\.location is /);
    expect(failure).toMatch(/\(vine\.story:\d+\)$/);
  }, 30_000);

  it('a parse failure is an exercised failure cited by its detail', async () => {
    const source = fixtureSource('no-vocabulary');
    const run = await runDerivedSuite(compileSource(source), loaderFor(source));
    const coverage = branchCoverageOf(run);
    expect([coverage.declared, coverage.exercised, coverage.failed, coverage.gaps.length]).toEqual([2, 2, 1, 0]);
    const report = formatDerivedRun(run, 'no-vocabulary.story');
    expect(report.find((line) => line.startsWith('✗ mat · on entering_room'))).toBe(
      `✗ mat · on entering_room — parse failure: no language pattern for if.action.entering_room (no-vocabulary.story:${lineOf(source, 'on the player entering_room')})`
    );
  }, 30_000);
});
