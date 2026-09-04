/**
 * scale-timing.ts — what the World Index costs as a story grows.
 *
 * Purpose: ADR-321 AC-8. Reach is a fixed point over locks and gates together
 * (D4), so its cost is not obviously linear in room count, and the ADR sets no
 * budget in advance — this harness produces the figures that budget decision is
 * made from.
 *
 * Two clocks run, because they answer different questions and neither answers
 * both:
 *
 * - **subprocess** — `node dist/cli.js <story>.ir.json`, exactly how the IDE
 *   invokes the analyzer (D2). This is what an author actually waits for, and it
 *   is dominated by a fixed cost that has nothing to do with their story.
 * - **analysis** — `buildDocument` alone, in process and warm. Its absolute
 *   value is not the author's cost (the tests run this package's source through
 *   Vite, not the shipped build), but its *growth* across room counts is the
 *   term the fixed point contributes, measured where a millisecond of process
 *   noise cannot swamp it.
 *
 * The fixed cost is measured rather than inferred: `startupCost` spawns the CLI
 * with no arguments, which answers a usage failure without reading or analyzing
 * anything, so what it times is node startup plus module load and nothing else.
 * Subtracting one build's timing from another's would have mixed two artifacts
 * and called the difference a constant.
 *
 * Compilation is excluded from both clocks: the IDE analyzes a story it has
 * already built, so charging the compile to the analyzer would overstate it.
 *
 * Public interface: ScaleRow, ScaleTable, measure, startupCost, measureTable,
 * formatTable.
 *
 * Owner context: @sharpee/world-index — tests and measurement support.
 *
 * @packageDocumentation
 * @see ADR-321 AC-8: synthetic corpus and scale timing
 */

import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

import { compile } from '@sharpee/chord';
import { buildDocument, type WorldIndexResponse } from '../src/document.js';
import type { StoryRatios } from './corpus-shape.js';
import { generateStory, type CorpusShape } from './synthetic-corpus.js';

/** The built entry point the IDE spawns. */
const CLI = fileURLToPath(new URL('../dist/cli.js', import.meta.url));

/** One story, timed. */
export interface ScaleRow {
  /** Rooms the story declares. */
  rooms: number;
  /** Which shape was generated. */
  shape: CorpusShape;
  /** Entities of every kind. */
  entities: number;
  /** Size of the compiled IR on disk. */
  irBytes: number;
  /** Reach findings — zero for a solvable story, and a check that it stayed one. */
  findings: number;
  /** Median in-process `buildDocument`, for growth. */
  analysisMs: number;
  /** Median end-to-end subprocess, for what an author waits. */
  subprocessMs: number;
}

/** Every story timed, plus what the numbers mean together. */
export interface ScaleTable {
  /** One row per shape and size. */
  rows: ScaleRow[];
  /** Node startup plus module load, measured with no story at all. */
  startupMs: number;
  /**
   * Observed growth of the analysis across the measured range, per shape: the
   * exponent `k` in `time ∝ rooms^k`. About 1 is linear; about 2 is quadratic,
   * which is the outcome that would put the documented fallback on the table.
   */
  exponent: Partial<Record<CorpusShape, number>>;
}

/**
 * The middle value of a sample.
 *
 * @param values the sample, in any order
 * @returns the median
 * @throws {RangeError} when the sample is empty
 */
function median(values: readonly number[]): number {
  if (values.length === 0) throw new RangeError('cannot take the median of an empty sample');
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

/**
 * Time one call, repeatedly, and take the median.
 *
 * @param runs how many times to call it
 * @param call the thing to time
 * @returns the median duration in milliseconds
 */
function timed(runs: number, call: () => void): number {
  const samples: number[] = [];
  for (let run = 0; run < runs; run += 1) {
    const start = performance.now();
    call();
    samples.push(performance.now() - start);
  }
  return median(samples);
}

/**
 * What the analyzer costs before it has looked at anything.
 *
 * Spawns the CLI with no arguments: it answers a usage failure without reading a
 * file or running a derivation, so this is node startup and module load, exactly
 * and separately.
 *
 * @param runs how many spawns to time
 * @returns the median startup in milliseconds
 * @throws {Error} when the no-argument run does not produce a usage failure —
 *   then it is not measuring what this claims to measure
 */
export function startupCost(runs: number): number {
  return timed(runs, () => {
    const result = spawnSync(process.execPath, [CLI], { encoding: 'utf8' });
    const document = JSON.parse(result.stdout) as WorldIndexResponse;
    if (document.ok || document.failure.cause !== 'usage') {
      throw new Error(`expected a usage failure from a no-argument run, got: ${result.stdout}`);
    }
  });
}

/**
 * Time one generated story on both clocks.
 *
 * Writes the compiled IR into `directory` as a side effect: the subprocess needs
 * a real file to read, which is the point of measuring the real path at all.
 *
 * @param rooms the room count to generate
 * @param ratios the proportions measured off the real corpus
 * @param shape which shape to generate
 * @param directory a writable directory for the IR file
 * @param runs how many times to sample each clock
 * @returns the row
 * @throws {Error} when the story does not compile, or the subprocess fails or
 *   answers a failure document — a timing taken from either is meaningless
 */
export function measure(
  rooms: number,
  ratios: StoryRatios,
  shape: CorpusShape,
  directory: string,
  runs: { analysis: number; subprocess: number },
): ScaleRow {
  const compiled = compile(generateStory(rooms, ratios, shape));
  if (!compiled.ok) {
    throw new Error(
      `synthetic story (${shape}, ${rooms} rooms) did not compile: ${compiled.diagnostics[0]?.message}`,
    );
  }

  const path = join(directory, `${shape}-${rooms}.ir.json`);
  const serialized = JSON.stringify(compiled.ir);
  writeFileSync(path, serialized, 'utf8');

  buildDocument(compiled.ir, 'timing');
  const analysisMs = timed(runs.analysis, () => void buildDocument(compiled.ir, 'timing'));

  let findings = -1;
  const subprocessMs = timed(runs.subprocess, () => {
    const result = spawnSync(process.execPath, [CLI, path], { encoding: 'utf8' });
    if (result.status !== 0) {
      throw new Error(`analyzer failed on ${path}: ${result.stdout || result.stderr}`);
    }
    const document = JSON.parse(result.stdout) as WorldIndexResponse;
    if (!document.ok) throw new Error(`analyzer answered a failure document: ${document.failure.message}`);
    findings = document.reach.findingCount;
  });

  return {
    rooms,
    shape,
    entities: compiled.ir.entities.length,
    irBytes: serialized.length,
    findings,
    analysisMs,
    subprocessMs,
  };
}

/**
 * The exponent `k` fitting `time ∝ rooms^k` across a shape's rows.
 *
 * Taken from the two ends of the measured range rather than a least-squares fit:
 * the range is one order of magnitude wide with five points on it, and a fitted
 * line would suggest a precision these timings do not have.
 *
 * @param rows the rows for one shape, in any order
 * @returns the exponent, or undefined when fewer than two distinct sizes ran
 */
function growthExponent(rows: readonly ScaleRow[]): number | undefined {
  const sorted = [...rows].sort((left, right) => left.rooms - right.rooms);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (first === undefined || last === undefined || first.rooms === last.rooms) return undefined;
  if (first.analysisMs <= 0 || last.analysisMs <= 0) return undefined;
  return Math.log(last.analysisMs / first.analysisMs) / Math.log(last.rooms / first.rooms);
}

/**
 * Time every shape at every size.
 *
 * @param ratios the proportions measured off the real corpus
 * @param sizes the room counts to time
 * @param shapes the shapes to time
 * @param directory a writable directory for the IR files
 * @param runs how many times to sample each clock
 * @returns every row, the measured startup constant, and the growth per shape
 */
export function measureTable(
  ratios: StoryRatios,
  sizes: readonly number[],
  shapes: readonly CorpusShape[],
  directory: string,
  runs: { analysis: number; subprocess: number },
): ScaleTable {
  const rows: ScaleRow[] = [];
  for (const shape of shapes) {
    for (const rooms of sizes) rows.push(measure(rooms, ratios, shape, directory, runs));
  }

  const exponent: Partial<Record<CorpusShape, number>> = {};
  for (const shape of shapes) {
    const fitted = growthExponent(rows.filter((row) => row.shape === shape));
    if (fitted !== undefined) exponent[shape] = fitted;
  }

  return { rows, startupMs: startupCost(runs.subprocess), exponent };
}

/**
 * Render the table for a human to read and record.
 *
 * @param table the measured table
 * @returns the report, ready to print
 */
export function formatTable(table: ScaleTable): string {
  const ms = (value: number): string => `${value.toFixed(2)}ms`;
  const lines: string[] = [];

  lines.push(`World Index scale timing — ${process.version} on ${process.platform}`);
  lines.push(`Startup floor (node + module load, no story): ${ms(table.startupMs)}`);
  lines.push('');
  lines.push('shape         rooms  entities      IR   analysis   subprocess   over floor');
  lines.push('-----------   -----  --------   -----   --------   ----------   ----------');
  for (const row of table.rows) {
    lines.push(
      [
        row.shape.padEnd(13),
        String(row.rooms).padStart(4),
        String(row.entities).padStart(9),
        `${Math.round(row.irBytes / 1024)}K`.padStart(7),
        ms(row.analysisMs).padStart(10),
        ms(row.subprocessMs).padStart(12),
        ms(Math.max(0, row.subprocessMs - table.startupMs)).padStart(12),
      ].join(' '),
    );
  }
  lines.push('');
  for (const [shape, exponent] of Object.entries(table.exponent)) {
    lines.push(`Growth of the analysis, ${shape}: time proportional to rooms^${exponent.toFixed(2)}`);
  }

  return lines.join('\n');
}
