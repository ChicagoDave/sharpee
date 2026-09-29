/**
 * test-tree-document.ts — `sharpee test` over a story's test tree: the
 * `<story-id>.tests/` directory of segments and a manifest (ADR-307, ADR-355).
 *
 * The only test model for Chord projects since ADR-307's cutover: discovery
 * finds the tree directory beside the `.story` file, reads its files, and
 * branch-tester assembles and walks them — the same files the Testing tab
 * writes (D6's one-code-path contract). The transcript-grammar fallback
 * (`test-tree.ts`) is retired.
 *
 * A tree that does not read is an error, never an empty pass: a newer-version
 * tree is REFUSED with its named message and a malformed one is reported —
 * both exit 2, nothing ran. Degrading to a fresh empty tree is the TAB's
 * behavior (an authoring surface starts over); a test runner silently passing
 * zero tests over a corrupted tree would be the silent pass the plan forbids.
 *
 * The canonical gate runs here too: a tree whose files are not byte-for-byte
 * what the writer emits (re-indented, keys reordered by a second writer) is
 * reported by file name and exits 2 before anything runs. The same check is
 * the local pre-commit hook's (`scripts/check-test-trees.mjs`).
 *
 * The derived rule-test tier (ADR-356 D5a) runs after the tree, at the
 * document's seed, through `test-derived.ts`: a derived failure exits 1 like
 * a failed line, a SKIPPED branch never changes the code. The tree run hands
 * it the endings its END STATE cards proved and the rooms its replays walked,
 * for D5's endings and rooms ratios.
 *
 * Public interface: findTreeDirectory(projectDir), readTreeFiles(treePath),
 * runTreeDocumentCommand(options) → process exit code.
 * Owner context: @sharpee/devkit (author tool).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import * as path from 'node:path';
import type { TreeFiles } from '@sharpee/branch-tester';
import { loadAuthorGame } from '../standalone/author-game.js';
import { runDerivedTests } from './test-derived.js';

/**
 * Find a project's test tree: the `<story-id>.tests/` directory beside the
 * `.story` file at the project root. The story id is the `.story` file's stem
 * (`fernhill.story` → `fernhill.tests/`) — runner discovery keys off the id it
 * already knows (ADR-307 D2/Q-2, ADR-355 D3). A module story (no `.story`
 * file) has no test tree.
 *
 * @param projectDir resolved project directory (absolute).
 * @returns the tree directory's absolute path, or undefined when the project
 *   has no `.story` file or no tree directory beside it.
 */
export function findTreeDirectory(projectDir: string): string | undefined {
  // Lazy require (this file's pattern): the harness loads only when needed.
  const { treeDirectoryNameFor } =
    require('@sharpee/branch-tester') as typeof import('@sharpee/branch-tester');
  let entries: string[];
  try {
    entries = readdirSync(projectDir);
  } catch {
    return undefined;
  }
  // Code-unit ordering, stated explicitly — NOT `localeCompare`: which story a
  // multi-`.story` directory resolves to must not depend on the machine's
  // locale, or the same project would test a different story elsewhere.
  const storyFiles = entries
    .filter((name) => name.endsWith('.story'))
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  for (const storyFile of storyFiles) {
    const storyId = storyFile.slice(0, -'.story'.length);
    const candidate = path.join(projectDir, treeDirectoryNameFor(storyId));
    if (isDirectory(candidate)) return candidate;
  }
  return undefined;
}

/**
 * Read a tree directory's own files (not its subdirectories) into the map
 * branch-tester assembles — file name → contents.
 *
 * @param treePath the tree directory's absolute path.
 * @returns the files, keyed by file name.
 * @throws the file system's error when the directory or a file cannot be read.
 */
export function readTreeFiles(treePath: string): TreeFiles {
  const files: TreeFiles = {};
  for (const name of readdirSync(treePath)) {
    const filePath = path.join(treePath, name);
    if (statSync(filePath).isFile()) files[name] = readFileSync(filePath, 'utf-8');
  }
  return files;
}

function isDirectory(candidate: string): boolean {
  try {
    return statSync(candidate).isDirectory();
  } catch {
    return false;
  }
}

export interface TreeDocumentTestOptions {
  /** Resolved project directory (absolute). */
  dir: string;
  /** The discovered tree directory's absolute path. */
  treePath: string;
  verbose: boolean;
  stopOnFailure: boolean;
  /** Emit the run-event stream on stdout instead of the human report. */
  json?: boolean;
  /** Carry `actualOutput` on every command result, not only failures. */
  captureOutput?: boolean;
  /** Carry a world snapshot on every command result. */
  captureWorld?: boolean;
}

/**
 * Run `sharpee test` over a test tree.
 *
 * @param options resolved project directory, the tree directory, and run flags.
 * @returns process exit code — 0 all lines and every derived branch passed,
 *   1 failures or errored lines or a failed derived branch, 2 the tree was
 *   refused, malformed, not in canonical form, or has card-position defects
 *   (nothing ran), 3 the story failed to load. Never calls `process.exit()`;
 *   the caller owns the process.
 */
export async function runTreeDocumentCommand(
  options: TreeDocumentTestOptions,
): Promise<number> {
  // Lazy require (the test.ts pattern): pull the harness only when testing.
  const {
    aggregateTestRun,
    assembleTree,
    channelIdsReferencedBy,
    checkCanonicalTree,
    flattenTreeLines,
    formatTreeDocumentRun,
    runTreeDocument,
    streamableCommandResult,
  } = require('@sharpee/branch-tester') as typeof import('@sharpee/branch-tester');
  // The stream builder is transcript-tester's — the wire has one owner.
  const { RunEventStream, ndjsonEventLine } =
    require('@sharpee/transcript-tester') as typeof import('@sharpee/transcript-tester');

  const { dir, treePath, verbose, stopOnFailure, json = false, captureOutput = false, captureWorld = false } = options;
  const treeName = `${path.basename(treePath)}/`;

  const info = (message: string): void => {
    if (!json) console.log(message);
  };

  let files: TreeFiles;
  try {
    files = readTreeFiles(treePath);
  } catch (error) {
    console.error(`test: cannot read ${treePath}: ${error instanceof Error ? error.message : error}`);
    return 2;
  }

  const read = assembleTree(files);
  if (read.status !== 'ok') {
    // Refusal and malformation both name themselves; neither runs anything.
    console.error(`test: ${treeName}: ${read.message}`);
    return 2;
  }
  const document = read.document;

  // The canonical gate: a second writer's formatting is caught before it is
  // committed, not discovered as a whole-file diff afterwards.
  const gate = checkCanonicalTree(files);
  if (gate.status === 'non-canonical') {
    console.error(
      `test: ${treeName} has files not in canonical form (re-save them from the Testing tab):\n` +
        gate.files.map((name) => `  ${name}`).join('\n'),
    );
    return 2;
  }

  const { lines } = flattenTreeLines(document);
  const stream = json
    ? new RunEventStream((event) => {
        process.stdout.write(ndjsonEventLine(event));
      })
    : undefined;
  stream?.runStart('tree', lines.length);

  info(`Loading story from: ${dir}`);
  info(`Test tree: ${treeName} (seed ${document.seed}, ${lines.length} line(s))`);

  // The capture set (ADR-294 D15): exactly the base channels the document's
  // claims reference — the JSON is the source of truth (David 2026-08-10),
  // so every claim a run evaluates is IN the document, including the opening
  // and policy claims recording persisted. Nothing is captured on spec.
  const channels = [...new Set(channelIdsReferencedBy(document))];
  const loadGame = () =>
    loadAuthorGame(dir, {
      seed: document.seed,
      channels,
    });

  // Lines are announced on the stream by their id — the id of the segment
  // each begins with (ADR-355 D5) — in the wire's `file` field, the same
  // identity domain as `parent` and `blockedBy`. The derived label rides
  // `transcript-start` as display only: two lines can share a label, and a
  // label-keyed consumer folded their results into one row (GH #494).
  let executionIndex = 0;
  let currentLine = '';
  let blockedCount = 0;
  const announced = new Set<string>();

  let run;
  try {
    run = await runTreeDocument(document, loadGame, {
      verbose,
      stopOnFailure,
      captureWorld,
      observer: stream && {
        // The run detail view's rows (David 2026-08-10): every assertion's
        // verdict rides the wire, described in the tab's claim idiom.
        onCommandResult: (command) =>
          stream.commandResult(currentLine, streamableCommandResult(command), captureOutput),
      },
      lineObserver: stream && {
        onLineStart: ({ line, label }) => {
          currentLine = line.id;
          announced.add(line.id);
          // Never `replayed: true` here: on the wire that flag means "this
          // whole execution is a state rebuild, not a row" (the v1 tree's
          // ancestor re-runs), and consumers drop such rows. A document
          // line replays its PREFIX inside its own single execution — the
          // line is a real row; its replay share shows in the human report.
          stream.transcriptStart(line.id, executionIndex++, {
            label,
            commandCount: line.cards.length,
            ...(line.parentId !== undefined ? { parent: line.parentId } : {}),
          });
        },
        onLineEnd: ({ line, outcome }) => {
          // A replay-diverged line never reached onLineStart; announce it so
          // the stream is still start-then-end, never an error from nowhere.
          if (!announced.has(line.id)) {
            stream.transcriptStart(line.id, executionIndex++, { label: outcome.label });
          }
          if (outcome.result !== undefined) {
            // The walker's synthesized transcripts deliberately carry no
            // filePath (the policy write-back guard), so stamp the line id on
            // the emitted copy — consumers key start/result/end by one id.
            stream.transcriptEnd({
              ...outcome.result,
              transcript: { ...outcome.result.transcript, filePath: line.id },
            });
          } else {
            stream.transcriptError(line.id, outcome.error ?? outcome.status);
          }
        },
        onLineBlocked: ({ line, outcome }) => {
          blockedCount += 1;
          stream.transcriptStart(line.id, executionIndex++, { label: outcome.label });
          stream.transcriptUnreached(line.id, outcome.blockedBy ?? '(unknown)');
        },
      },
    });
  } catch (error) {
    // A boot failure: the run produced no trustworthy result — exit 3 is
    // "the story would not run", not "the story is wrong".
    console.error(`Error running the tree: ${error instanceof Error ? error.message : error}`);
    stream?.runEnd(aggregateTestRun([]), 3);
    return 3;
  }

  if (run.defects.length > 0) {
    for (const line of formatTreeDocumentRun(run)) console.error(line);
    stream?.runEnd(aggregateTestRun([]), 2);
    return 2;
  }

  if (!json) {
    console.log();
    for (const line of formatTreeDocumentRun(run)) console.log(line);
  }

  const failed = run.lines.filter((l) => l.status === 'failed' || l.status === 'error').length;
  const treeCode = failed > 0 ? 1 : 0;

  // ADR-356 D5a: the derived rule-test tier, by default, at the same seed.
  // Its failure is a failure of the build; its SKIPPED branches are not.
  const derivedCode = await runDerivedTests({
    dir,
    seed: document.seed,
    json,
    verbose,
    tree: { endingsReached: run.endingsReached, roomsEntered: run.roomsEntered },
    // The derived events ride the tree's own stream, after its lines and
    // before `run-end` (GH #524); no other event moves.
    stream,
  });
  const code = Math.max(treeCode, derivedCode);

  const results = run.lines.filter((l) => l.result !== undefined).map((l) => l.result!);
  stream?.runEnd(aggregateTestRun(results), code, blockedCount);
  return code;
}
