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
  /** Emit the run-event stream on stdout instead of the human reporter. */
  json?: boolean;
  /** Carry `actualOutput` on every command result, not only failures. */
  captureOutput?: boolean;
  /** Carry a world snapshot on every command result and node entry (R3/R5). */
  captureWorld?: boolean;
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
  // The stream builder is transcript-tester's — branch-tester's D15 full-copy
  // covers the runner and its report, not the wire, which has one owner.
  const { RunEventStream, ndjsonEventLine } = require('@sharpee/transcript-tester') as typeof import('@sharpee/transcript-tester');

  const { dir, transcripts, verbose, stopOnFailure, json = false, captureOutput = false, captureWorld = false } = options;

  const stream = json
    ? new RunEventStream((event) => {
        process.stdout.write(ndjsonEventLine(event));
      })
    : undefined;
  stream?.runStart('tree', transcripts.length);

  const info = (msg: string): void => {
    if (!json) console.log(msg);
  };

  info(`Loading story from: ${dir}`);

  // ADR-302 D11: the tree is validated WHOLE before anything executes. A file
  // that will not parse is not a failing test — it is a tree that cannot be
  // assembled, so nothing runs and no partial result is offered.
  const parsed = [];
  const parseFailures: string[] = [];
  for (const transcriptPath of transcripts) {
    try {
      const transcript = parseTranscriptFile(transcriptPath);
      const errors = validateTranscript(transcript);
      // A transcript that is merely EMPTY is not a defect: it is the editor's
      // designed starting state, and it runs as a skip (phase-6 F1, David's
      // ruling 2026-08-08). Zero commands + exactly one problem means that
      // problem is the no-commands one; anything else keeps the D11 gate.
      if (transcript.commands.length === 0 && errors.length === 1) {
        parsed.push(transcript);
        continue;
      }
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
    for (const failure of parseFailures) {
      console.error(`  - ${failure}`);
      const [file, ...rest] = failure.split(': ');
      stream?.transcriptError(file, rest.join(': '));
    }
    stream?.runEnd(aggregateTestRun([]), 2);
    console.error(`\n${parseFailures.length} transcript(s) failed to parse — nothing ran.`);
    return 2;
  }

  const storyName = dir.split('/').filter(Boolean).pop() ?? dir;
  // D11: assembly is real work that precedes execution, and on a malformed tree
  // it is the only work there is.
  stream?.phase('assemble', 'started', storyName);
  const tree = assembleTree(parsed, storyName);
  stream?.phase('assemble', 'finished', storyName);
  if (tree.defects.length > 0) {
    // Every defect is a transcript that cannot run — reported as such rather
    // than leaving a consumer with an empty run and no explanation.
    for (const defect of tree.defects) stream?.transcriptError(defect.filePath, defect.message);
    stream?.runEnd(aggregateTestRun([]), 2);
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
  /** The file whose commands are currently arriving (command events carry it). */
  let currentFile: string | undefined;
  const freshGameForRoot = createRootGameFactory({
    load: (spec) => loadAuthorGame(dir, { entry: spec.entry, seed: spec.seed }),
    masterSeedOf: (game) =>
      (game as { engine?: { getMasterSeed?(): number } }).engine?.getMasterSeed?.(),
    onFirstBoot: (stem, seed) => {
      if (seed !== undefined) info(`Seed: ${seed} (${stem})`);
    },
  });

  // Execution order, not tree order: a node re-executed to build a sibling's
  // state gets its own index, because start/end pair positionally (a file
  // legitimately recurs within one tree run).
  let executionIndex = 0;
  let unreachedCount = 0;

  let run;
  try {
    run = await runTree(tree, freshGameForRoot as never, {
      verbose,
      stopOnFailure,
      captureWorld,
      observer: stream && {
        onCommandResult: (command) =>
          stream.commandResult(currentFile ?? '', command, captureOutput),
      },
      treeObserver: stream && {
        onNodeStart: ({ node, replayed, commandCount, entryWorld }) => {
          currentFile = node.transcript.filePath;
          stream.transcriptStart(node.transcript.filePath, executionIndex++, {
            commandCount,
            ...(node.parent ? { parent: node.parent.transcript.filePath } : {}),
            ...(replayed ? { replayed: true } : {}),
            ...(entryWorld !== undefined ? { world: entryWorld } : {}),
          });
        },
        onNodeEnd: ({ result }) => stream.transcriptEnd(result),
        onNodeUnreached: ({ node, origin }) => {
          unreachedCount += 1;
          // An unreached node is still announced, so the view can render the
          // blocked subtree greyed rather than silently missing it (D13).
          stream.transcriptStart(node.transcript.filePath, executionIndex++, {
            ...(node.parent ? { parent: node.parent.transcript.filePath } : {}),
          });
          stream.transcriptUnreached(node.transcript.filePath, origin.transcript.filePath);
        },
        onNodeSkipped: ({ node }) => {
          // Announced like an unreached node — start carries the parentage the
          // tree view joins on, end says why nothing follows (phase-6 F1).
          stream.transcriptStart(node.transcript.filePath, executionIndex++, {
            commandCount: 0,
            ...(node.parent ? { parent: node.parent.transcript.filePath } : {}),
          });
          stream.transcriptSkipped(node.transcript.filePath);
        },
      },
    });
  } catch (error) {
    // A boot failure and a non-deterministic replay both arrive here. Both mean
    // the run produced no trustworthy result, so neither is reported as a test
    // failure — exit 3 is "the story would not run", not "the story is wrong".
    announcedLoadFailure = true;
    console.error(`Error running the tree: ${error instanceof Error ? error.message : error}`);
  }
  if (announcedLoadFailure || !run) {
    stream?.runEnd(aggregateTestRun([]), 3, unreachedCount);
    return 3;
  }

  if (!json) {
    // Reported after the run, deliberately: interleaving live would put each
    // replayed ancestor's rows in the middle of the tree, which reads as the
    // same test running twice. The stream marks replays; the terminal cannot.
    for (const outcome of run.outcomes) {
      if (outcome.result) reportTranscript(outcome.result, { verbose });
    }

    // D13: unreached is not failed. Printed after the runs, so the tally reads
    // as blast radius rather than as more failures.
    console.log();
    for (const line of formatTreeRun(run)) console.log(line);
  }

  const results = run.outcomes.filter((o) => o.result !== undefined).map((o) => o.result!);
  const runResult = aggregateTestRun(results);
  const code = getExitCode(runResult);
  stream?.runEnd(runResult, code, unreachedCount);
  return code;
}
