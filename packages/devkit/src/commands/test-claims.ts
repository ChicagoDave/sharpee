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
 * the manifest names that does not exist, a fragment that does not compile,
 * a claim set the gate refuses — each exits 2 with the reason named, like a
 * tree the command cannot read, and no walk runs. A story that will not
 * boot exits 3.
 *
 * Runs after the derived tier (ADR-356 D5a), at the same seed, and only
 * when the manifest names a file: naming it is the author's opt-in, so
 * there is no flag. Under `--json` the report goes to stderr like the
 * derived report; no claim event rides the wire (GH #555 holds the wire
 * field and the Testing tab row as their own discussion).
 *
 * Public interface: runClaimsTests(options) → process exit code,
 * CLAIMS_WALK_BUDGET.
 * Owner context: @sharpee/devkit (author tool).
 */
import * as path from 'node:path';
import { readFileSync } from 'node:fs';
import { findStoryFile, loadAuthorGame, makeFsImportResolver } from '../standalone/author-game.js';

/**
 * The per-walk budget `sharpee test` proves claims under — the table ADR-365
 * measured on Fernhill (every claim settles well inside it) and on Secret
 * Letter's market (where a loose set reports unproven at the budget, by
 * design). A walk that stops here leaves its claims unproven, never held.
 */
export const CLAIMS_WALK_BUDGET = { maxSeconds: 120, maxStates: 500_000, maxDepth: 80 } as const;

export interface ClaimsTestOptions {
  /** Resolved project directory (absolute). */
  dir: string;
  /** The claims fragment the manifest names, relative to the `.story` file. */
  claimsFile: string;
  /** The pinned seed every walk boots at — the tree document's. */
  seed: number;
  /** The run-event stream owns stdout; the claims report goes to stderr. */
  json: boolean;
  verbose: boolean;
}

/**
 * Run the claims the manifest names and print the runner's report.
 *
 * @param options the project, the fragment, the seed, and the output mode
 * @returns process exit code — 0 the claims ran, whatever their verdicts
 *   (D9); 2 the claims file is missing, does not compile, or is refused by
 *   the gate (nothing ran); 3 the story would not boot. Never calls
 *   `process.exit()`.
 */
export async function runClaimsTests(options: ClaimsTestOptions): Promise<number> {
  // Lazy require (the test.ts pattern): the harness loads only when testing.
  const { compileClaims } = require('@sharpee/chord') as typeof import('@sharpee/chord');
  const { normalizeClaimSet, runClaims, formatClaimsRun } =
    require('@sharpee/branch-tester') as typeof import('@sharpee/branch-tester');

  const { dir, claimsFile, seed, json, verbose } = options;
  const out = (line: string): void => {
    if (json) console.error(line);
    else console.log(line);
  };

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

  let claimSet: ReturnType<typeof normalizeClaimSet>;
  try {
    claimSet = normalizeClaimSet(compiled.claims, claimsFile);
  } catch (error) {
    console.error(`test: ${error instanceof Error ? error.message : error}`);
    return 2;
  }

  if (verbose) {
    out(`Claims budget per walk: ${CLAIMS_WALK_BUDGET.maxSeconds}s, ${CLAIMS_WALK_BUDGET.maxStates} states, depth ${CLAIMS_WALK_BUDGET.maxDepth}`);
  }

  let result: Awaited<ReturnType<typeof runClaims>>;
  try {
    result = await runClaims(compiled.ir, claimSet, () => loadAuthorGame(storyFile!, { seed }), {
      seed,
      ...CLAIMS_WALK_BUDGET,
    });
  } catch (error) {
    console.error(`Error running the claims: ${error instanceof Error ? error.message : error}`);
    return 3;
  }

  out('');
  out(`Claims: ${claimsFile}`);
  for (const line of formatClaimsRun(result).split('\n')) out(line);
  return 0;
}
