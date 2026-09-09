/**
 * analysis-passes.test.ts — the analyzer's pass list is data whose order
 * satisfies every entry's `requires`, and `run` executes exactly that list,
 * once, in order. A pass that reads a table before the pass that builds it
 * is a failing test naming both passes, not an author's unknown-timer error.
 * Reference: ADR-336 D3 (AC-3); GH #359 (the defect class this pins).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { compile } from '../src';
import { ANALYSIS_PASSES, analysisPassOrderViolations, type AnalysisPass } from '../src/analyzer';

const names = ANALYSIS_PASSES.map((p) => p.name);

function moved(list: ReadonlyArray<AnalysisPass>, name: string, before: string): AnalysisPass[] {
  const copy = list.filter((p) => p.name !== name);
  const target = copy.findIndex((p) => p.name === before);
  copy.splice(target, 0, list.find((p) => p.name === name)!);
  return copy;
}

describe('ANALYSIS_PASSES order', () => {
  it('names every pass once', () => {
    expect(new Set(names).size).toBe(names.length);
    expect(names.length).toBeGreaterThan(30);
  });

  it('lists each pass after every pass it requires', () => {
    expect(analysisPassOrderViolations(ANALYSIS_PASSES)).toEqual([]);
  });

  it('every requires names a pass on the list', () => {
    for (const pass of ANALYSIS_PASSES) {
      for (const required of pass.requires) expect(names).toContain(required);
    }
  });

  it('fails by name when a reader is moved above the pass that builds its table', () => {
    // The GH #359 shape: chapters resolve timer triggers, so buildChapters
    // above buildTimers reads a table nothing has built yet.
    const reordered = moved(ANALYSIS_PASSES, 'buildChapters', 'buildTimers');
    expect(analysisPassOrderViolations(reordered)).toEqual([{ name: 'buildChapters', requires: 'buildTimers' }]);
  });

  it('reports a requires that names no pass', () => {
    const list: AnalysisPass[] = [{ name: 'only', requires: ['missing'], run: () => {} }];
    expect(analysisPassOrderViolations(list)).toEqual([{ name: 'only', requires: 'missing' }]);
  });
});

describe('Analyzer.run', () => {
  afterEach(() => vi.restoreAllMocks());

  it('runs every pass exactly once, in list order, for one corpus compile', () => {
    const trace: string[] = [];
    for (const pass of ANALYSIS_PASSES) {
      const original = pass.run;
      vi.spyOn(pass, 'run').mockImplementation((analyzer) => {
        trace.push(pass.name);
        original(analyzer);
      });
    }
    const result = compile(readFileSync(join(__dirname, 'fixtures', 'cloak.story'), 'utf8'));
    expect(result.ok).toBe(true);
    expect(trace).toEqual(names);
  });
});
