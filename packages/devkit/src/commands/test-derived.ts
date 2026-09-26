/**
 * test-derived.ts — the derived rule-test tier of `sharpee test` (ADR-356
 * D5a).
 *
 * The story's own IR is the test suite: `world-index` enumerates one branch
 * per clause leaf, `branch-tester`'s derived runner arranges each branch's
 * precondition through the loader, runs its one command through the real
 * engine, and asserts its effects. This module runs that suite over a
 * project and prints D5's report — the branches ratio and every unexercised
 * branch by its source span, then the endings and rooms ratios: endings the
 * tree's END STATE cards proved over endings the story declares, and rooms
 * either tier placed the player in over rooms the story declares (D4/D5).
 * The tree run supplies its half through `tree`; an unreached ending or an
 * unentered room is a gap, never a failure.
 *
 * Runs by default beside the tree document (D5a, Q-3). A derived FAILURE
 * means the story does not do what its own source says and exits 1; a
 * SKIPPED branch is a limit of the arrange floor, appears in the ratio and
 * the gap list, and leaves the exit code alone. A module project (no
 * `.story` file) has no IR and so no derived suite.
 *
 * The suite compiles the story from SOURCE on every run (the same compile
 * `loadAuthorGame` boots from) — never a committed `dist/*.ir.json`, which
 * can silently drift from the `.story` it was compiled from (GH #519).
 *
 * Under `--json` the report goes to stderr: the run-event wire carries the
 * tree's rows and has no event for a derived outcome yet, so the human
 * report is the one record of why a run exited 1.
 *
 * Public interface: runDerivedTests(options) → process exit code.
 * Owner context: @sharpee/devkit (author tool).
 */
import * as path from 'node:path';
import { compileChordStory, findStoryFile, loadAuthorGame } from '../standalone/author-game.js';

export interface DerivedTestOptions {
  /** Resolved project directory (absolute). */
  dir: string;
  /** The pinned seed every branch boots at — the tree document's. */
  seed: number;
  /** The run-event stream owns stdout; the derived report goes to stderr. */
  json: boolean;
  verbose: boolean;
  /**
   * What the tree document's run contributed (ADR-356 D4/D5): the ending
   * ids its END STATE cards proved, and the rooms its replays walked. Absent
   * when no tree ran — the ratios then count the derived tier alone.
   */
  tree?: { endingsReached: string[]; roomsEntered: string[] };
}

/**
 * Run the derived rule-test suite over a project and print its report.
 *
 * @param options the project, the seed, and the output mode
 * @returns process exit code — 0 every exercised branch passed (SKIPPED
 *   branches included), 1 a derived branch failed or errored, 3 the story
 *   would not compile or boot (nothing ran). Never calls `process.exit()`.
 */
export async function runDerivedTests(options: DerivedTestOptions): Promise<number> {
  // Lazy require (the test.ts pattern): the harness loads only when testing.
  const { runDerivedSuite, formatDerivedRun, endingCoverageOf, roomCoverageOf, formatCoverageSummary } =
    require('@sharpee/branch-tester') as typeof import('@sharpee/branch-tester');
  const { endingsOf, roomsOf } =
    require('@sharpee/world-index') as typeof import('@sharpee/world-index');

  const { dir, seed, json, verbose, tree } = options;
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
    if (verbose) out('Derived rule tests: none — a module project has no story IR to derive from.');
    return 0;
  }

  let ir: ReturnType<typeof compileChordStory>;
  try {
    ir = compileChordStory(storyFile);
  } catch (error) {
    console.error(`Error compiling the story for the derived suite: ${error instanceof Error ? error.message : error}`);
    return 3;
  }

  let run;
  try {
    run = await runDerivedSuite(ir, () => loadAuthorGame(storyFile, { seed }));
  } catch (error) {
    console.error(`Error running the derived suite: ${error instanceof Error ? error.message : error}`);
    return 3;
  }

  out('');
  const storyName = path.basename(storyFile);
  for (const line of formatDerivedRun(run, storyName)) out(line);
  const endings = endingCoverageOf(endingsOf(ir), tree?.endingsReached ?? []);
  const rooms = roomCoverageOf(roomsOf(ir), [...(tree?.roomsEntered ?? []), ...run.roomsEntered]);
  for (const line of formatCoverageSummary(endings, rooms, storyName)) out(line);

  return run.failed + run.errored > 0 ? 1 : 0;
}
