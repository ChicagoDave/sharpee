/**
 * test-lens.ts — the examinable lens's tier of `sharpee test` (ADR-408 D7,
 * D8).
 *
 * After the claims tier, at the tree document's seed, on a fixed budget of
 * its own (`LENS_TIER_MAX_SECONDS`), this module runs branch-tester's
 * `runExaminableLens` over the IR the test command compiled, and:
 *   - under `--json`, emits one `lens-finding` per folded finding and one
 *     `lens-summary`, before `run-end`, with every source key and the
 *     target's declaration resolved to spans here, as the consumer
 *     (ADR-333 D2, ADR-408 D8, D10);
 *   - prints the lens's own report (to stderr under `--json`, like the
 *     derived and claims reports; to stdout otherwise), each source with its
 *     file and line.
 *
 * It never returns an exit code: no lens outcome changes `sharpee test`'s
 * (D7). A language with no extractor is a `lens-summary` carrying the
 * refusal; a lens that cannot finish (the engine refused a save) is one
 * carrying that reason; neither touches the run's code.
 *
 * Public interface: runLensTier(options), LENS_TIER_MAX_SECONDS,
 *   LensEventSink, LensTierOptions, lensFindingEventOf.
 * Owner context: @sharpee/devkit (author tool).
 */
import * as path from 'node:path';
import type { StoryIR } from '@sharpee/chord';
import type { NounExtractorLookup } from '@sharpee/if-domain/nouns';
import type { ExaminableFinding, LensFindingEvent, LensSummaryEvent, RunEventEnvelope } from '@sharpee/ide-protocol';
import { loadAuthorGame } from '../standalone/author-game.js';
import { lensSourceLocator, resolveSourceSpan } from './lens-sources.js';
import { nounExtractorLookup } from './world-index.js';

/**
 * The tier's time budget, in seconds (ADR-408 D8: David, 2026-11-23, option
 * "b"). By route the slowest measured story took 12.8 s and every other
 * under a second (`docs/work/lens-findings-in-ide/timings.md`); a room the
 * budget leaves unreached is listed in the summary, never dropped.
 */
export const LENS_TIER_MAX_SECONDS = 30;

/** A `lens-finding` as the stream takes it: the event minus its envelope. */
export type LensFindingRow = Omit<LensFindingEvent, keyof RunEventEnvelope | 'type'>;

/** A `lens-summary` as the stream takes it: the event minus its envelope. */
export type LensSummaryRow = Omit<LensSummaryEvent, keyof RunEventEnvelope | 'type'>;

/** The two stream methods the lens tier writes to — structurally, so the tier never names the stream class. */
export interface LensEventSink {
  lensFinding(row: LensFindingRow): void;
  lensSummary(summary: LensSummaryRow): void;
}

export interface LensTierOptions {
  /** The `.story` file the run tested. */
  storyFile: string;
  /** The IR the test command compiled from it; never one read from `dist/` (D8). */
  ir: StoryIR;
  /** The tree document's seed. */
  seed: number;
  /** The run-event stream owns stdout; the lens report goes to stderr. */
  json: boolean;
  verbose: boolean;
  /** The run-event stream; absent when the run has none. */
  stream?: LensEventSink;
  /** Language code to extractor or refusal; `sharpee world-index`'s lookup unless a test supplies its own. */
  lookup?: NounExtractorLookup;
}

/**
 * One folded finding as its `lens-finding` row: each source with its span,
 * and the target's declaration span when a thing answered.
 *
 * @param finding the lens document's finding
 * @param ir the IR the lens ran on, which the spans are resolved from
 * @returns the row the stream emits
 */
export function lensFindingEventOf(finding: ExaminableFinding, ir: StoryIR): LensFindingRow {
  const declaration = finding.targetId === undefined
    ? undefined
    : ir.entities.find((entity) => entity.id === finding.targetId)?.span ?? null;
  return {
    lens: 'examinable',
    phrase: finding.phrase,
    kind: finding.kind,
    detail: finding.detail,
    thing: finding.thing,
    ...(finding.target !== undefined ? { target: finding.target } : {}),
    ...(finding.targetId !== undefined ? { targetId: finding.targetId, targetSpan: declaration ?? null } : {}),
    ...(finding.resolvedForm !== undefined ? { resolvedForm: finding.resolvedForm } : {}),
    sources: finding.sources.map((source) => ({ ...source, span: resolveSourceSpan(ir, source) })),
    rooms: finding.rooms,
  };
}

/**
 * Run the lens tier and report it.
 *
 * @param options the story, its IR, the seed, the output mode and the stream
 * @returns once the rows and the report are written; never an exit code (D7)
 */
export async function runLensTier(options: LensTierOptions): Promise<void> {
  const { runExaminableLens, formatExaminableReport } = require('@sharpee/branch-tester') as typeof import('@sharpee/branch-tester');
  const { storyFile, ir, seed, json, verbose, stream } = options;
  const out = (line: string): void => {
    if (json) console.error(line);
    else console.log(line);
  };
  const storyName = path.basename(storyFile);
  const refuse = (refusal: string): void => {
    stream?.lensSummary({ lens: 'examinable', seed, maxSeconds: LENS_TIER_MAX_SECONDS, refusal });
    out('');
    out(`Examinable lens: ${refusal}`);
  };

  let output: Awaited<ReturnType<typeof runExaminableLens>>;
  try {
    output = await runExaminableLens(ir, () => loadAuthorGame(storyFile, { seed, undoSnapshots: 0 }), {
      story: storyName,
      seed,
      lookup: options.lookup ?? nounExtractorLookup,
      maxSeconds: LENS_TIER_MAX_SECONDS,
    });
  } catch (error) {
    refuse(`the lens stopped: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }
  if (!output.ok || !output.report) {
    refuse(output.refusal?.message ?? 'the lens wrote neither a report nor a refusal');
    return;
  }

  const report = output.report;
  if (stream) {
    for (const finding of report.findings) stream.lensFinding(lensFindingEventOf(finding, ir));
    stream.lensSummary({
      lens: 'examinable',
      seed,
      maxSeconds: LENS_TIER_MAX_SECONDS,
      reach: report.reach,
      phrasesExecuted: report.phrasesExecuted,
      counts: report.counts,
    });
  }
  out('');
  out('Examinable lens:');
  for (const line of formatExaminableReport(output.story, report, { locate: lensSourceLocator(ir, storyName) })) out(line);
  if (verbose) out(`Examinable lens time: ${(report.reach.ms / 1000).toFixed(1)}s of ${LENS_TIER_MAX_SECONDS}s`);
}
