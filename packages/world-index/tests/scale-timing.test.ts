/**
 * scale-timing.test.ts — AC-8, driven through the real subprocess.
 *
 * Two things live here, and they are deliberately not the same thing.
 *
 * The **acceptance tests always run**: they spawn the built `dist/cli.js`
 * against generated stories at the smallest and largest sizes AC-8 names and
 * require a clean analysis from both. Nothing about those is gated, because a
 * real-path test that skips is the same as not having one (DEVARCH 13a).
 *
 * The **report is gated**, behind `WORLD_INDEX_SCALE_TABLE=1` (`pnpm scale`).
 * What it produces is a table of measurements for a human to read and record,
 * not a pass/fail signal, and it spends fifty-odd subprocess spawns doing it —
 * that belongs on demand rather than in every run of the suite. The only
 * assertion it makes is the one the phase exists to settle: that the analysis
 * does not grow quadratically in room count.
 *
 * Owner context: @sharpee/world-index — tests.
 *
 * @see ADR-321 AC-8: synthetic corpus and scale timing
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { profileStory, ratiosOf, type StoryRatios } from './corpus-shape.js';
import { CORPUS, compileStory } from './corpus.js';
import { formatTable, measure, measureTable, startupCost } from './scale-timing.js';
import type { CorpusShape } from './synthetic-corpus.js';

/** The room counts AC-8 names. */
const SIZES = [20, 40, 60, 80, 100];

/** Both shapes: the corpus's own proportions, and the labelled upper bound. */
const SHAPES: CorpusShape[] = ['derived', 'dense-chain'];

/**
 * Sampling for the gated report.
 *
 * The analysis clock is sampled heavily and the subprocess clock lightly, in
 * proportion to what each costs and how much noise each carries: an in-process
 * call runs in well under a millisecond, where timer jitter would otherwise
 * dominate, while a spawn costs tens of milliseconds and varies little.
 */
const REPORT_RUNS = { analysis: 100, subprocess: 5 };

/** Sampling for the always-on acceptance tests, kept cheap on purpose. */
const ACCEPTANCE_RUNS = { analysis: 3, subprocess: 1 };

/** Above this, the fixed point would be growing quadratically and the ADR's fallback is live. */
const QUADRATIC = 2;

let ratios: StoryRatios;
let directory: string;

beforeAll(() => {
  ratios = ratiosOf([
    profileStory(compileStory(CORPUS.fernhill)),
    profileStory(compileStory(CORPUS.alderman)),
    profileStory(compileStory(CORPUS.idesOfMarch)),
  ]);
  directory = mkdtempSync(join(tmpdir(), 'world-index-scale-'));
});

afterAll(() => rmSync(directory, { recursive: true, force: true }));

describe('the analyzer answers cleanly through the real subprocess at every scale', () => {
  it('reports a startup floor from a run that analyzes nothing', () => {
    expect(startupCost(3)).toBeGreaterThan(0);
  });

  for (const rooms of [SIZES[0], SIZES[SIZES.length - 1]]) {
    it(`analyzes a ${rooms}-room story end to end with no findings`, () => {
      const row = measure(rooms, ratios, 'derived', directory, ACCEPTANCE_RUNS);
      expect(row.rooms).toBe(rooms);
      expect(row.findings).toBe(0);
      expect(row.entities).toBeGreaterThan(rooms);
      expect(row.analysisMs).toBeGreaterThan(0);
      expect(row.subprocessMs).toBeGreaterThan(row.analysisMs);
    });
  }

  it('analyzes the bound shape end to end too, so its figures are comparable', () => {
    const row = measure(SIZES[SIZES.length - 1], ratios, 'dense-chain', directory, ACCEPTANCE_RUNS);
    expect(row.findings).toBe(0);
    expect(row.subprocessMs).toBeGreaterThan(0);
  });
});

describe.runIf(process.env.WORLD_INDEX_SCALE_TABLE === '1')('the AC-8 report', () => {
  it('measures every shape at every size and does not grow quadratically', () => {
    const table = measureTable(ratios, SIZES, SHAPES, directory, REPORT_RUNS);

    // The report is the deliverable: these figures are read off and recorded
    // against the phase, which is why this writes to stdout on purpose.
    process.stdout.write(`\n${formatTable(table)}\n\n`);

    expect(table.rows).toHaveLength(SIZES.length * SHAPES.length);
    for (const row of table.rows) expect(row.findings).toBe(0);
    for (const shape of SHAPES) expect(table.exponent[shape]).toBeLessThan(QUADRATIC);
  });
});
