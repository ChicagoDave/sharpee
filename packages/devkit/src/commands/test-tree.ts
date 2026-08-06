/**
 * test-tree.ts — `sharpee test --tree`: run an author project's transcript TREE.
 *
 * Author-side entry point for @sharpee/branch-tester (ADR-302). A transcript
 * names its parent with `continues:`, so the project's tests form a tree rather
 * than a directory of independent files; running the harness runs every
 * root-to-leaf path. There is deliberately no `--chain` here — ADR-302 D10
 * retires it, because a tree run has no other meaning.
 *
 * This exists so retiring the `branch-test` bin costs an author nothing: the
 * tree harness keeps an entry point, and it is the same command an author
 * already types for flat transcripts.
 *
 * Public interface: runTreeTestCommand(options) → process exit code.
 * Owner context: @sharpee/devkit (author tool).
 */
import { loadAuthorGame } from '../standalone/author-game.js';

export interface TreeTestOptions {
  /** Resolved project directory (the caller has already resolved name/dir/.story). */
  dir: string;
  /** Absolute `.transcript` paths forming the tree. */
  transcripts: string[];
  verbose: boolean;
  stopOnFailure: boolean;
}

/**
 * Run `sharpee test --tree`.
 *
 * @param options resolved project directory, the transcripts forming the tree,
 *   and the run flags.
 * @returns process exit code — 0 all passed, 1 failures, 2 a parse failure or a
 *   tree defect (nothing ran), 3 the story failed to load. Never calls
 *   `process.exit()`; the caller owns the process.
 */
export async function runTreeTestCommand(options: TreeTestOptions): Promise<number> {
  // Lazy require (the test.ts pattern): pull the harness only when testing.
  const {
    aggregateTestRun,
    assembleTree,
    createRootGameFactory,
    formatTreeRun,
    getExitCode,
    parseTranscriptFile,
    reportTranscript,
    runTree,
    validateTranscript,
  } = require('@sharpee/branch-tester') as typeof import('@sharpee/branch-tester');

  const { dir, transcripts, verbose, stopOnFailure } = options;

  console.log(`Loading story from: ${dir}`);

  // ADR-302 D11: the tree is validated WHOLE before anything executes. A file
  // that will not parse is not a failing test — it is a tree that cannot be
  // assembled, so nothing runs and no partial result is offered.
  const parsed = [];
  const parseFailures: string[] = [];
  for (const transcriptPath of transcripts) {
    try {
      const transcript = parseTranscriptFile(transcriptPath);
      const errors = validateTranscript(transcript);
      if (errors.length > 0) {
        parseFailures.push(`${transcriptPath}: ${errors.join('; ')}`);
        continue;
      }
      parsed.push(transcript);
    } catch (error) {
      parseFailures.push(`${transcriptPath}: ${error instanceof Error ? error.message : error}`);
    }
  }

  if (parseFailures.length > 0) {
    for (const failure of parseFailures) console.error(`  - ${failure}`);
    console.error(`\n${parseFailures.length} transcript(s) failed to parse — nothing ran.`);
    return 2;
  }

  const storyName = dir.split('/').filter(Boolean).pop() ?? dir;
  const tree = assembleTree(parsed, storyName);
  if (tree.defects.length > 0) {
    // D11 again: every defect reported together. A tree with a cycle has no
    // correct partial run to offer.
    for (const line of formatTreeRun({
      outcomes: [],
      defects: tree.defects,
      executedCommands: 0,
      authoredCommands: 0,
    })) {
      console.error(line);
    }
    return 2;
  }

  // D1 + D17: one boot per root and one per divergent sibling, with the root's
  // resolved seed re-pinned across all of them. The shared builder owns that
  // rule — see game-factory.ts for why it is not inlined here.
  let announcedLoadFailure = false;
  const freshGameForRoot = createRootGameFactory({
    load: (spec) => loadAuthorGame(dir, { entry: spec.entry, seed: spec.seed }),
    masterSeedOf: (game) =>
      (game as { engine?: { getMasterSeed?(): number } }).engine?.getMasterSeed?.(),
    onFirstBoot: (stem, seed) => {
      if (seed !== undefined) console.log(`Seed: ${seed} (${stem})`);
    },
  });

  let run;
  try {
    run = await runTree(tree, freshGameForRoot as never, {
      verbose,
      stopOnFailure,
      storyName,
    });
  } catch (error) {
    // A boot failure and a non-deterministic replay both arrive here. Both mean
    // the run produced no trustworthy result, so neither is reported as a test
    // failure — exit 3 is "the story would not run", not "the story is wrong".
    announcedLoadFailure = true;
    console.error(`Error running the tree: ${error instanceof Error ? error.message : error}`);
  }
  if (announcedLoadFailure || !run) return 3;

  for (const outcome of run.outcomes) {
    if (outcome.result) reportTranscript(outcome.result, { verbose });
  }

  // D13: unreached is not failed. Printed after the runs, so the tally reads as
  // blast radius rather than as more failures.
  console.log();
  for (const line of formatTreeRun(run)) console.log(line);

  const results = run.outcomes.filter((o) => o.result !== undefined).map((o) => o.result!);
  return getExitCode(aggregateTestRun(results));
}
