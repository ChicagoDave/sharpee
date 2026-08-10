/**
 * test-tree-document.ts — `sharpee test --tree` over the ADR-307 tree
 * document (`<story-id>.tests.json`).
 *
 * The document path of `--tree`: when discovery finds a tree document beside
 * the `.story` file (and no explicit `.transcript` files were passed), this
 * runs it through branch-tester's greenfield walker — one JSON document, the
 * same one the Testing tab writes (D6's one-code-path contract). The
 * transcript path (`test-tree.ts`) stays the fallback until the cutover
 * phase deletes it.
 *
 * AC-4 at the CLI: a newer-version document is REFUSED with its named
 * message, and a malformed one is reported as an error — both exit 2,
 * nothing ran. Degrading to a fresh empty tree is the TAB's behavior (an
 * authoring surface starts over); a test runner silently passing zero tests
 * over a corrupted document would be the silent pass the plan forbids.
 *
 * Public interface: runTreeDocumentCommand(options) → process exit code.
 * Owner context: @sharpee/devkit (author tool).
 */
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { loadAuthorGame } from '../standalone/author-game.js';

export interface TreeDocumentTestOptions {
  /** Resolved project directory (absolute). */
  dir: string;
  /** The discovered document's absolute path. */
  docPath: string;
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
 * Run `sharpee test --tree` over a tree document.
 *
 * @param options resolved project directory, the document path, and run flags.
 * @returns process exit code — 0 all lines passed, 1 failures or errored
 *   lines, 2 the document was refused/malformed or has card-position defects
 *   (nothing ran), 3 the story failed to load. Never calls `process.exit()`;
 *   the caller owns the process.
 */
export async function runTreeDocumentCommand(
  options: TreeDocumentTestOptions,
): Promise<number> {
  // Lazy require (the test.ts pattern): pull the harness only when testing.
  const {
    aggregateTestRun,
    channelIdsReferencedBy,
    deserializeTreeDocument,
    flattenTreeLines,
    formatTreeDocumentRun,
    runTreeDocument,
  } = require('@sharpee/branch-tester') as typeof import('@sharpee/branch-tester');
  // The stream builder is transcript-tester's — the wire has one owner.
  const { RunEventStream, ndjsonEventLine } =
    require('@sharpee/transcript-tester') as typeof import('@sharpee/transcript-tester');

  const { dir, docPath, verbose, stopOnFailure, json = false, captureOutput = false, captureWorld = false } = options;

  const info = (message: string): void => {
    if (!json) console.log(message);
  };

  let text: string;
  try {
    text = readFileSync(docPath, 'utf-8');
  } catch (error) {
    console.error(`test: cannot read ${docPath}: ${error instanceof Error ? error.message : error}`);
    return 2;
  }

  const read = deserializeTreeDocument(text);
  if (read.status !== 'ok') {
    // Refusal and malformation both name themselves; neither runs anything.
    console.error(`test: ${path.basename(docPath)}: ${read.message}`);
    return 2;
  }
  const document = read.document;

  const { lines } = flattenTreeLines(document);
  const stream = json
    ? new RunEventStream((event) => {
        process.stdout.write(ndjsonEventLine(event));
      })
    : undefined;
  stream?.runStart('tree', lines.length);

  info(`Loading story from: ${dir}`);
  info(`Tree document: ${path.basename(docPath)} (seed ${document.seed}, ${lines.length} line(s))`);

  // The capture set (ADR-294 D15): the base channels the document's claims
  // read, plus the opening defaults' carriers — `prologue` and `info` are
  // always captured so the opening card's live defaults (prologue, title,
  // description — ADR-307 open question D) have something to read.
  const channels = [...new Set([...channelIdsReferencedBy(document), 'prologue', 'info'])];
  const loadGame = () =>
    loadAuthorGame(dir, {
      seed: document.seed,
      channels,
    });

  // Lines are announced on the stream by derived label (D2/Q-8) — the label
  // IS the identity on this wire; there are no file paths to join on.
  let executionIndex = 0;
  let currentLabel = '';
  let blockedCount = 0;
  const announced = new Set<string>();

  let run;
  try {
    run = await runTreeDocument(document, loadGame, {
      verbose,
      stopOnFailure,
      captureWorld,
      observer: stream && {
        onCommandResult: (command) => stream.commandResult(currentLabel, command, captureOutput),
      },
      lineObserver: stream && {
        onLineStart: ({ line, label }) => {
          currentLabel = label;
          announced.add(line.id);
          // Never `replayed: true` here: on the wire that flag means "this
          // whole execution is a state rebuild, not a row" (the v1 tree's
          // ancestor re-runs), and consumers drop such rows. A document
          // line replays its PREFIX inside its own single execution — the
          // line is a real row; its replay share shows in the human report.
          stream.transcriptStart(label, executionIndex++, {
            commandCount: line.cards.length,
            ...(line.parentId !== undefined ? { parent: line.parentId } : {}),
          });
        },
        onLineEnd: ({ line, outcome }) => {
          // A replay-diverged line never reached onLineStart; announce it so
          // the stream is still start-then-end, never an error from nowhere.
          if (!announced.has(line.id)) {
            stream.transcriptStart(outcome.label, executionIndex++, {});
          }
          if (outcome.result !== undefined) {
            // The label IS the identity on this wire (D2/Q-8): the walker's
            // synthesized transcripts deliberately carry no filePath (the
            // policy write-back guard), so stamp the label on the emitted
            // copy — consumers key start/result/end rows by one name.
            stream.transcriptEnd({
              ...outcome.result,
              transcript: { ...outcome.result.transcript, filePath: outcome.label },
            });
          } else {
            stream.transcriptError(outcome.label, outcome.error ?? outcome.status);
          }
        },
        onLineBlocked: ({ outcome }) => {
          blockedCount += 1;
          stream.transcriptStart(outcome.label, executionIndex++, {});
          stream.transcriptUnreached(outcome.label, outcome.blockedBy ?? '(unknown)');
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
  const code = failed > 0 ? 1 : 0;
  const results = run.lines.filter((l) => l.result !== undefined).map((l) => l.result!);
  stream?.runEnd(aggregateTestRun(results), code, blockedCount);
  return code;
}
