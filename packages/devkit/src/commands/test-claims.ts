/**
 * test-claims.ts — the claims tier of `sharpee test` (ADR-365 D6, D9, D10).
 *
 * A test tree's manifest may name a claims fragment (the optional `claims`
 * key, ADR-365 D7). When it does, this module compiles the fragment against
 * the story, normalizes the claim set through branch-tester's gate, runs
 * every claim through the claims runner at the tree's seed, and prints the
 * runner's report: the held-over-declared ratio (D6), each walk's cost, and
 * each claim's verdict with its witness or the reason it stayed open.
 *
 * Verdicts never change the exit code (D9): a violated or unproven claim is
 * the author's test-first list going red, and the report is the burndown.
 * What does fail the run is a claims file the command cannot run — a path
 * the manifest names that does not exist, a fragment not in the lock's
 * canonical shape (ADR-367 D4, AC-5), a fragment that does not compile, a
 * claim set the gate refuses — each exits 2 with the reason named, like a
 * tree the command cannot read, and no walk runs. A story that will not
 * boot exits 3.
 *
 * Runs after the derived tier (ADR-356 D5a), at the same seed, and only
 * when the manifest names a file: naming it is the author's opt-in, so
 * there is no flag. Under `--json` the report goes to stderr like the
 * derived report, and each claim's verdict rides the wire as a
 * `claim-result` with the ratio as `claims-summary` (ADR-367 D6; GH #555),
 * so the Testing tab shows the same claims section the report prints.
 *
 * The fragment is compiled BEFORE the tree runs (`compileClaimsFragment`),
 * because the tree run's floor (ADR-367 D5) evaluates every positive claim
 * at every card it replays: a claim a line reached is held by that line and
 * never walked, and a card's `locks` are checked where they were taken.
 * The floor's reading is handed to `runClaimsTests` with the compiled set.
 *
 * Public interface: compileClaimsFragment(dir, claimsFile) → the compiled
 * set or an exit code, runClaimsTests(options) → process exit code,
 * CLAIMS_WALK_BUDGET.
 * Owner context: @sharpee/devkit (author tool).
 */
import * as path from 'node:path';
import { readFileSync } from 'node:fs';
import type { ClaimFloorReading, ClaimSet } from '@sharpee/branch-tester';
import type { StoryIR } from '@sharpee/chord';
import type { StreamableClaimResult, StreamableClaimsSummary } from '@sharpee/transcript-tester';
import { findStoryFile, loadAuthorGame, makeFsImportResolver } from '../standalone/author-game.js';

/**
 * The per-walk budget `sharpee test` proves claims under — the table ADR-365
 * measured on Fernhill (every claim settles well inside it) and on Secret
 * Letter's market (where a loose set reports unproven at the budget, by
 * design). A walk that stops here leaves its claims unproven, never held.
 */
export const CLAIMS_WALK_BUDGET = { maxSeconds: 120, maxStates: 500_000, maxDepth: 80 } as const;

/** The fragment compiled against its story, ready to run. */
export interface CompiledClaimsFragment {
  storyFile: string;
  claimsFile: string;
  ir: StoryIR;
  claimSet: ClaimSet;
}

/**
 * Compile the claims fragment the manifest names, against the project's
 * story, and normalize it through branch-tester's gate. Nothing runs.
 *
 * @param dir resolved project directory (absolute)
 * @param claimsFile the fragment's path, relative to the `.story` file
 * @returns the compiled set, or the exit code to return — 2 the file is
 *   missing, does not compile, or is refused by the gate; 3 the project has
 *   more than one `.story` file
 */
export function compileClaimsFragment(dir: string, claimsFile: string): CompiledClaimsFragment | number {
  // Lazy require (the test.ts pattern): the harness loads only when testing.
  const { compileClaims } = require('@sharpee/chord') as typeof import('@sharpee/chord');
  const { checkCanonicalFragment, normalizeClaimSet } = require('@sharpee/branch-tester') as typeof import('@sharpee/branch-tester');

  let storyFile: string | null;
  try {
    storyFile = findStoryFile(dir);
  } catch (error) {
    console.error(`test: ${error instanceof Error ? error.message : error}`);
    return 3;
  }
  if (storyFile === null) {
    console.error(`test: the manifest names claims file '${claimsFile}', but ${dir} has no .story file to prove them against`);
    return 2;
  }

  const storyDir = path.dirname(storyFile);
  const fragmentPath = path.resolve(storyDir, claimsFile);
  let fragment: string;
  try {
    fragment = readFileSync(fragmentPath, 'utf-8');
  } catch (error) {
    const reason = (error as NodeJS.ErrnoException).code === 'ENOENT' ? 'not found' : (error instanceof Error ? error.message : String(error));
    console.error(`test: claims file '${claimsFile}' named by manifest.json: ${reason} (${fragmentPath})`);
    return 2;
  }

  // The fragment's canonical gate (ADR-367 D4, AC-5): every block must read
  // back as the lock would write it, so the next lock never fights a second
  // formatting. Named by block and line; nothing runs. Like the tree's gate.
  const gate = checkCanonicalFragment(fragment);
  if (gate.status === 'non-canonical') {
    const lines = gate.problems.map((problem) => `  ${claimsFile}:${problem.line} · ${problem.where} — ${problem.message}`);
    console.error(`test: claims file '${claimsFile}' is not in the lock's canonical form (fix the lines named, or re-lock):\n${lines.join('\n')}`);
    return 2;
  }

  // The story compiles here exactly as `compileChordStory` compiles it; the
  // fragment's names resolve against that story's entities (ADR-365 D7).
  const compiled = compileClaims(readFileSync(storyFile, 'utf-8'), fragment, {
    importResolver: makeFsImportResolver(storyDir),
    claimsFile,
  });
  if (!compiled.ok || compiled.claims === null) {
    const errors = compiled.diagnostics.filter((d) => d.severity === 'error');
    const lines = errors.map((d) => `  ${d.span.file ?? path.basename(storyFile!)}:${d.span.line}:${d.span.column} [${d.code}] ${d.message}`);
    console.error(`test: claims file '${claimsFile}' does not compile (${errors.length} error(s)):\n${lines.join('\n')}`);
    return 2;
  }

  let claimSet: ClaimSet;
  try {
    claimSet = normalizeClaimSet(compiled.claims, claimsFile);
  } catch (error) {
    console.error(`test: ${error instanceof Error ? error.message : error}`);
    return 2;
  }
  return { storyFile, claimsFile, ir: compiled.ir, claimSet };
}

export interface ClaimsTestOptions {
  /** The fragment, compiled before the tree ran. */
  compiled: CompiledClaimsFragment;
  /** The pinned seed every walk boots at — the tree document's. */
  seed: number;
  /** What the tree run's floor saw (ADR-367 D5); absent when no tree ran. */
  floor?: ClaimFloorReading;
  /** The run-event stream owns stdout; the claims report goes to stderr. */
  json: boolean;
  verbose: boolean;
  /**
   * The run-event stream to carry each claim's verdict and the ratio
   * (ADR-367 D6; GH #555's claims row). Absent when the caller has no
   * stream — the text report is the only output.
   */
  stream?: ClaimsEventSink;
}

/** The two stream methods the claims tier writes to — structurally, so the tier never names the stream class. */
export interface ClaimsEventSink {
  claimResult(row: StreamableClaimResult): void;
  claimsSummary(summary: StreamableClaimsSummary): void;
}

/**
 * Run the compiled claims and print the runner's report.
 *
 * @param options the compiled fragment, the seed, the floor's reading, and
 *   the output mode
 * @returns process exit code — 0 the claims ran, whatever their verdicts
 *   (D9); 3 the story would not boot. Never calls `process.exit()`.
 */
export async function runClaimsTests(options: ClaimsTestOptions): Promise<number> {
  const { runClaims, formatClaimsRun, claimResultRowOf, claimsSummaryRowOf } = require('@sharpee/branch-tester') as typeof import('@sharpee/branch-tester');
  const { compiled, seed, floor, json, verbose, stream } = options;
  const { storyFile, claimsFile, ir, claimSet } = compiled;
  const out = (line: string): void => {
    if (json) console.error(line);
    else console.log(line);
  };

  if (verbose) {
    out(`Claims budget per walk: ${CLAIMS_WALK_BUDGET.maxSeconds}s, ${CLAIMS_WALK_BUDGET.maxStates} states, depth ${CLAIMS_WALK_BUDGET.maxDepth}`);
  }

  let result: Awaited<ReturnType<typeof runClaims>>;
  try {
    result = await runClaims(ir, claimSet, () => loadAuthorGame(storyFile, { seed }), {
      seed,
      ...CLAIMS_WALK_BUDGET,
      ...(floor !== undefined ? { floor } : {}),
    });
  } catch (error) {
    console.error(`Error running the claims: ${error instanceof Error ? error.message : error}`);
    return 3;
  }

  // The wire (D6): one row per claim with its locks, then the ratio — after
  // the derived tier's events and before `run-end`, which the caller writes.
  if (stream) {
    for (const claim of result.claims) stream.claimResult(claimResultRowOf(claim, result));
    stream.claimsSummary(claimsSummaryRowOf(result));
  }

  out('');
  out(`Claims: ${claimsFile}`);
  for (const line of formatClaimsRun(result).split('\n')) out(line);
  return 0;
}
