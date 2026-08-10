/**
 * tree-walker.ts — running the Testing tree document (ADR-307 D4/D5/D6).
 *
 * The greenfield runtime for the tree document (`<story-id>.tests.json`):
 * `sharpee test --tree` deserializes the same JSON the Testing tab writes and
 * this module walks it. It owes the deprecated transcript tree runner
 * (`tree-runner.ts`, ADR-302) nothing — no stem identities, no header
 * inheritance, no per-node reseeds (David's ruling 2026-08-10: v1 is
 * deprecated; the walker is designed on the tree's own terms).
 *
 * **Lines, not files.** The main line is the document's top-level cards; each
 * `branches` entry is its own line, recursively. The main line runs once,
 * continuously, on its boot engine; every branch line gets a fresh boot and a
 * verbatim replay of its full prefix — every command from the root through
 * its fork card — then runs its own cards live (D5: fresh boot +
 * deterministic replay at the pinned seed).
 *
 * **A seam is a failed claim, not corruption** (D4). A failed assertion never
 * blocks descendant lines — the tree is a script, and a content edit shows as
 * that turn's failed claim while everything else keeps running. Only an
 * EXECUTION error (engine error, blank output, a card the run never reached)
 * marks state suspect from that card on: lines forking at or after it report
 * `blocked` with the origin named, and never run (D13's one-failure economy).
 * Prefix replays execute commands without re-evaluating claims — a seam in
 * the prefix already reported on the line that owns it.
 *
 * **Derived labels only** (D2/Q-8). The main line labels from the room the
 * game opens in (`opening-iron-gates`), a branch from its fork room and first
 * command (`gravel-drive · east`) — computed from the live world when the
 * line starts, persisted nowhere.
 *
 * Assertion evaluation is `runTranscript`'s, unmodified: cards synthesize
 * in-memory `Transcript` objects, so opening-claim evaluation, policy-default
 * synthesis (`auto-assertion.ts`), the assertion boundary, and blank-output
 * detection are the single existing code path. Defaults synthesize live and
 * are never persisted: synthesized transcripts carry no `filePath`, so the
 * runner's policy write-back cannot fire. The walker never writes anything.
 *
 * Public interface: `runTreeDocument`, `flattenTreeLines`,
 * `formatTreeDocumentRun`, `TreeLine`, `TreeLineOutcome`,
 * `TreeDocumentRunResult`, `TreeLineObserver`, `TreeWalkerGame`.
 * Owner context: @sharpee/branch-tester — the Chord/IDE testing world's
 * harness (transcript-tester's text world is untouched).
 */

import {
  Assertion,
  Transcript,
  TranscriptCommand,
  TranscriptItem,
  TranscriptResult,
  RunnerOptions,
} from './types.js';
import { runTranscript, captureWorldSnapshot } from './runner.js';
import {
  TreeCard,
  TreeDocument,
  branchLineLabelOf,
  mainLineLabelOf,
  roomSlugOf,
} from './tree-document.js';

/**
 * The engine surface the walker drives — structural, so the walker never
 * imports the engine class (the same treatment `runner.ts` gives it). The
 * full runner surface (channels, events, world) passes through untyped;
 * `runTranscript` reads what it needs.
 */
export interface TreeWalkerGame {
  executeCommand(input: string): Promise<string> | string;
  /**
   * Resume the engine after a game-over stopped it. A line may legitimately
   * fork on the card that ended the game — its replay lands on a stopped
   * engine, and the branch's own cards still have to run.
   */
  reviveEngine?(): void;
  world?: unknown;
}

/** Boots one fresh game at the document's pinned seed. Called once per line. */
export type TreeGameLoader = () => Promise<TreeWalkerGame>;

/**
 * One line of the tree: the main line, or one branch alternative. The unit a
 * run row reports on.
 */
export interface TreeLine {
  /** Structural identity: `main`, then `main/b<id>` per branch, recursively. */
  readonly id: string;
  /** Owning line, absent for the main line. */
  readonly parentId?: string;
  /** The branch's stable id from the document, absent for the main line. */
  readonly branchId?: number;
  /** Card index in the PARENT line's `cards` the fork lives on. */
  readonly forkIndex?: number;
  /**
   * The verbatim command stream from the root through the fork card — what a
   * fresh boot replays before this line's own cards. The boot look is in it
   * (`look`), because it is part of the stream the main line executed and a
   * replay must match that stream exactly or the pinned seed means nothing.
   */
  readonly prefix: string[];
  /** The line's own cards. */
  readonly cards: TreeCard[];
  /** The line's first typed command — half of a branch's derived label. */
  readonly firstCommand?: string;
}

/** A structural problem the wire validator cannot see (card position). */
export interface TreeLineDefect {
  /** JSON-path-ish location of the offending card. */
  readonly path: string;
  readonly message: string;
}

/** What happened to one line. */
export interface TreeLineOutcome {
  readonly id: string;
  /** Derived display label (D2/Q-8) — never persisted. */
  readonly label: string;
  /**
   * `passed`/`failed` — the line ran and its claims held / did not.
   * `blocked` — an ancestor's execution error invalidated the state this
   * line forks from; it never ran (`blockedBy` names the origin line).
   * `error` — the line's own replay diverged or its run never completed.
   */
  readonly status: 'passed' | 'failed' | 'blocked' | 'error';
  /** Typed turns on this line (its own cards, prefix excluded). */
  readonly turnCount: number;
  readonly result?: TranscriptResult;
  /** Line id of the execution error's owner, when `blocked`. */
  readonly blockedBy?: string;
  readonly error?: string;
}

/** Watches lines run, for live consumers (the `--json` stream). */
export interface TreeLineObserver {
  /** A line is about to run its own cards; its prefix has replayed. */
  onLineStart?(info: { line: TreeLine; label: string; replayedCommands: number }): void;
  onLineEnd?(info: { line: TreeLine; outcome: TreeLineOutcome }): void;
  /** A line that never ran — an ancestor's execution error blocked it. */
  onLineBlocked?(info: { line: TreeLine; outcome: TreeLineOutcome }): void;
}

/** Runner options plus the line-shaped observation the runner has no concept of. */
export type TreeDocumentRunOptions = RunnerOptions & {
  lineObserver?: TreeLineObserver;
};

/** The outcome of running one document. */
export interface TreeDocumentRunResult {
  /** Per-line outcomes in run order (depth-first, main line first). */
  readonly lines: TreeLineOutcome[];
  /** Card-position defects. Non-empty means **nothing ran**. */
  readonly defects: TreeLineDefect[];
  /** Every command sent to an engine: boot looks, replays, line commands. */
  readonly executedCommands: number;
  /** Typed turn cards across all lines — what the author actually played. */
  readonly authoredCommands: number;
}

/**
 * Cut a document into its lines, depth-first: the main line, then each
 * branch in fork order, each followed by its own nested branches.
 *
 * Also validates what the wire validator cannot: `opening`/`boot` cards are
 * the main line's head (opening first, boot at most once, directly after),
 * and appear nowhere else — a branch continues a game that has already
 * opened. A defective document produces its defects and no runnable lines.
 *
 * @param document a valid (post-deserialize) tree document.
 * @returns the lines in run order, and any card-position defects.
 */
export function flattenTreeLines(document: TreeDocument): {
  lines: TreeLine[];
  defects: TreeLineDefect[];
} {
  const lines: TreeLine[] = [];
  const defects: TreeLineDefect[] = [];

  const walk = (
    cards: TreeCard[],
    id: string,
    path: string,
    isMain: boolean,
    parent?: { parentId: string; branchId: number; forkIndex: number },
    prefix: string[] = [],
  ): void => {
    lines.push({
      id,
      ...(parent !== undefined
        ? { parentId: parent.parentId, branchId: parent.branchId, forkIndex: parent.forkIndex }
        : {}),
      prefix,
      cards,
      ...(firstCommandOf(cards) !== undefined ? { firstCommand: firstCommandOf(cards) } : {}),
    });

    const stream = [...prefix];
    cards.forEach((card, index) => {
      const cardPath = `${path}[${index}]`;
      if (card.type === 'opening' && !(isMain && index === 0)) {
        defects.push({
          path: cardPath,
          message: `an 'opening' card is only valid as the main line's first card`,
        });
      }
      if (
        card.type === 'boot' &&
        !(isMain && index <= 1 && cards.slice(0, index).every((c) => c.type === 'opening'))
      ) {
        defects.push({
          path: cardPath,
          message: `a 'boot' card is only valid at the main line's head, directly after the opening`,
        });
      }
      // The command stream the card contributes: a typed turn its command,
      // the boot look its `look` (part of what the main line really
      // executed, so part of what a replay must repeat), the opening nothing.
      const command = commandOf(card);
      if (command !== undefined) stream.push(command);
      for (const branch of card.branches ?? []) {
        walk(
          branch.cards,
          `${id}/b${branch.branch}`,
          `${cardPath}.branches[b${branch.branch}].cards`,
          false,
          { parentId: id, branchId: branch.branch, forkIndex: index },
          [...stream],
        );
      }
    });
  };

  walk(document.cards, 'main', 'cards', true);
  return { lines, defects: defects.length > 0 ? defects : [] };
}

/**
 * Run a tree document against real games (ADR-307 D5/D6).
 *
 * Depth-first over the lines: the main line runs on its own boot; each branch
 * line boots fresh, replays its prefix verbatim (commands only — claims in
 * the prefix already reported on the line that owns them), then runs its own
 * cards through `runTranscript`. Assertion failures never block descendants
 * (D4: seams, not corruption); execution errors do (D13).
 *
 * @param document a valid tree document (the caller has already deserialized;
 *   refusal and malformed handling are the caller's, per AC-4).
 * @param loadGame boots one fresh game at the document's pinned seed.
 * @param options runner options plus the optional line observer.
 * @returns per-line outcomes and command tallies. Card-position defects run
 *   nothing.
 * @throws only when `loadGame` itself throws — a story that will not boot is
 *   a load error, not a test result.
 */
export async function runTreeDocument(
  document: TreeDocument,
  loadGame: TreeGameLoader,
  options: TreeDocumentRunOptions = {},
): Promise<TreeDocumentRunResult> {
  const { lines, defects } = flattenTreeLines(document);
  if (defects.length > 0) {
    return { lines: [], defects, executedCommands: 0, authoredCommands: 0 };
  }

  const outcomes: TreeLineOutcome[] = [];
  /** Per finished line: its outcome plus where (if anywhere) execution broke. */
  const tracked = new Map<string, { outcome: TreeLineOutcome; execErrorIndex?: number }>();
  let executedCommands = 0;
  let authoredCommands = 0;

  const record = (
    line: TreeLine,
    outcome: TreeLineOutcome,
    execErrorIndex?: number,
  ): void => {
    outcomes.push(outcome);
    tracked.set(line.id, {
      outcome,
      ...(execErrorIndex !== undefined ? { execErrorIndex } : {}),
    });
    if (outcome.status === 'blocked') {
      options.lineObserver?.onLineBlocked?.({ line, outcome });
    } else {
      options.lineObserver?.onLineEnd?.({ line, outcome });
    }
  };

  for (const line of lines) {
    // ── Blocked? (D13, narrowed by D4 to execution errors only) ──────────
    const origin = blockOriginOf(line, tracked);
    if (origin !== undefined) {
      record(line, {
        id: line.id,
        label: blockedLabelOf(line),
        status: 'blocked',
        turnCount: countTurns(line.cards),
        blockedBy: origin,
      });
      continue;
    }

    // ── Boot (one fresh game per line, at the document's pinned seed) ────
    const game = await loadGame();

    // ── Replay the prefix, verbatim, claims not re-evaluated ─────────────
    // Only what the runner itself treats as an execution error counts as
    // one here — a throw, or the stopped-engine sentinel. Any other output
    // is engine text the owning line saw too and is not divergence.
    let replayError: string | undefined;
    for (const command of line.prefix) {
      let failure: string | undefined;
      try {
        const output = String(await game.executeCommand(command));
        if (output === 'Error: Engine is not running') failure = output;
      } catch (error) {
        failure = error instanceof Error ? error.message : String(error);
      }
      executedCommands += 1;
      if (failure !== undefined) {
        // The owning line executed this same command cleanly (an execution
        // error there would have blocked this line), so failing here means
        // the run is not reproducible at this seed.
        replayError =
          `replay of "${command}" failed ("${failure}") where the owning line ` +
          `succeeded — the tree is not reproducible at this seed (ADR-307 D5)`;
        break;
      }
    }
    if (replayError !== undefined) {
      record(line, {
        id: line.id,
        label: blockedLabelOf(line),
        status: 'error',
        turnCount: countTurns(line.cards),
        error: replayError,
      });
      continue;
    }
    // A prefix ending on the card that ended the game leaves the engine
    // stopped; the line's own cards still run (fork-on-the-death-card is a
    // legitimate shape). Harmless when the engine is running.
    game.reviveEngine?.();

    // ── Label, then run the line's own cards ─────────────────────────────
    const label = labelOf(line, game);
    options.lineObserver?.onLineStart?.({ line, label, replayedCommands: line.prefix.length });

    const { transcript, cardIndexOfCommand } = transcriptOfLine(line);
    const result = await runTranscript(transcript, game as never, {
      ...options,
    });

    const executedRows = result.commands.filter((row) => row.command.input !== '(opening)');
    executedCommands += executedRows.length;
    // The line's own contribution to the authored stream: its typed turns
    // plus its boot look (a card the session played). `executed - authored`
    // is then exactly the replay share — a linear document shows none.
    authoredCommands += line.cards.filter((card) => commandOf(card) !== undefined).length;

    const execErrorIndex = execErrorCardIndexOf(
      executedRows,
      cardIndexOfCommand,
      transcript.commands.length,
    );

    record(
      line,
      {
        id: line.id,
        label,
        status: result.status === 'passed' ? 'passed' : result.status === 'failed' ? 'failed' : 'error',
        turnCount: countTurns(line.cards),
        result,
        ...(result.errorMessage !== undefined ? { error: result.errorMessage } : {}),
      },
      execErrorIndex,
    );
  }

  return { lines: outcomes, defects: [], executedCommands, authoredCommands };
}

/**
 * Render a document run as plain lines: one row per line, then the tally,
 * then the replay share (shown, not inferred — the cost of a long spine
 * above many branches should be visible in the run that pays it).
 */
export function formatTreeDocumentRun(run: TreeDocumentRunResult): string[] {
  const rows: string[] = [];

  if (run.defects.length > 0) {
    rows.push(`Tree document is malformed — ${run.defects.length} defect(s); nothing ran.`);
    for (const defect of run.defects) rows.push(`  ${defect.path}: ${defect.message}`);
    return rows;
  }

  let passed = 0;
  let failed = 0;
  let blocked = 0;
  let errored = 0;
  for (const line of run.lines) {
    const turns = `${line.turnCount} turn${line.turnCount === 1 ? '' : 's'}`;
    switch (line.status) {
      case 'passed':
        passed += 1;
        rows.push(`✓ ${line.label} (${turns})`);
        break;
      case 'failed': {
        failed += 1;
        const cite = firstFailureOf(line.result);
        rows.push(`✗ ${line.label} (${turns})${cite !== undefined ? ` — ${cite}` : ''}`);
        break;
      }
      case 'blocked': {
        blocked += 1;
        const origin = run.lines.find((l) => l.id === line.blockedBy);
        rows.push(`◌ ${line.label} — blocked by ${origin?.label ?? line.blockedBy}`);
        break;
      }
      case 'error':
        errored += 1;
        rows.push(`✗ ${line.label}${line.error !== undefined ? ` — ${line.error}` : ''}`);
        break;
    }
  }

  const parts = [`${passed} passed`];
  if (failed > 0) parts.push(`${failed} failed`);
  if (errored > 0) parts.push(`${errored} errored`);
  if (blocked > 0) parts.push(`${blocked} blocked`);
  rows.push(parts.join(', '));

  const replayed = run.executedCommands - run.authoredCommands;
  if (replayed > 0) {
    rows.push(
      `${run.executedCommands} commands (${run.authoredCommands} authored + ${replayed} replayed)`,
    );
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Internal: card → runner-shape mapping.
// ---------------------------------------------------------------------------

/** The command a card contributes to the executed stream, if any. */
function commandOf(card: TreeCard): string | undefined {
  if (card.type === 'turn') return card.command;
  // The boot look is a real executed command — the automatic first `look`
  // every session plays. The opening is what the story said unprompted.
  if (card.type === 'boot') return 'look';
  return undefined;
}

/** The line's first typed command, for its derived label. */
function firstCommandOf(cards: TreeCard[]): string | undefined {
  return cards.find((card) => card.type === 'turn')?.command;
}

/** Typed turns among `cards` — the line's own authored size. */
function countTurns(cards: TreeCard[]): number {
  return cards.filter((card) => card.type === 'turn').length;
}

/**
 * A card's assertions in the runner's shape (the closed families of D2).
 *
 * `exact` supersedes the contains family (the schema says so; the surface's
 * composer already drops contains under exact). `skip: true` wins whole: the
 * card executes and asserts nothing. `noDefaults` with no authored claims is
 * a deliberate "assert nothing" — mapped to a skip so the runner neither
 * synthesizes defaults nor trips the assertion boundary. A bare card (no
 * assertions object at all) stays bare: policy defaults synthesize live in
 * the runner, and without a policy the assertion boundary fails it by name —
 * the runner's existing rule, unmodified.
 */
function assertionsOfCard(card: TreeCard): Assertion[] {
  if (card.skip === true) return [{ type: 'skip' }];
  const authored = card.assertions;
  if (authored === undefined) return [];

  const assertions: Assertion[] = [];
  if (authored.exact !== undefined) {
    assertions.push({ type: 'ok', block: [...authored.exact] });
  } else {
    for (const value of authored.contains ?? []) {
      assertions.push({ type: 'ok-contains', value });
    }
    for (const value of authored.notContains ?? []) {
      assertions.push({ type: 'ok-not-contains', value });
    }
  }
  for (const stateExpression of authored.states ?? []) {
    assertions.push({ type: 'state-assert', assertTrue: true, stateExpression });
  }
  for (const eventType of authored.events ?? []) {
    assertions.push({ type: 'event-assert', assertTrue: true, eventType });
  }
  for (const channel of authored.channels ?? []) {
    // A dotted document id (`info.title`) is a path INTO a structured
    // capture: base channel id + channelPath (ADR-300 D13), exactly as the
    // transcript grammar's `[CHANNEL: banner.title, …]` parses.
    const [channelId, ...channelPath] = channel.id.split('.');
    const pathPart = channelPath.length > 0 ? { channelPath } : {};
    if (channel.contains !== undefined) {
      for (const value of channel.contains) {
        assertions.push({ type: 'channel-contains', channelId, ...pathPart, value });
      }
    } else if (channel.is !== undefined) {
      assertions.push({
        type: 'channel-is',
        channelId,
        ...pathPart,
        channelExpected: channel.is,
      });
    }
  }

  if (assertions.length === 0 && authored.noDefaults === true) {
    return [{ type: 'skip', reason: 'defaults withheld (noDefaults)' }];
  }
  return assertions;
}

/**
 * Synthesize the line's in-memory transcript, and the map from command index
 * (the transcript's) back to card index (the line's) — needed to place an
 * execution error on the card it broke.
 *
 * No `filePath`, ever: that is what keeps the runner's policy write-back
 * from firing — defaults synthesize live and are never persisted (D2).
 */
function transcriptOfLine(line: TreeLine): {
  transcript: Transcript;
  cardIndexOfCommand: number[];
} {
  const items: TranscriptItem[] = [];
  const commands: TranscriptCommand[] = [];
  const cardIndexOfCommand: number[] = [];
  let opening: Assertion[] | undefined;

  line.cards.forEach((card, cardIndex) => {
    if (card.type === 'opening') {
      const assertions = assertionsOfCard(card);
      if (assertions.length > 0) opening = assertions;
      return;
    }
    const command: TranscriptCommand = {
      lineNumber: 0,
      input: commandOf(card)!,
      expectedOutput: [],
      assertions: assertionsOfCard(card),
    };
    commands.push(command);
    cardIndexOfCommand.push(cardIndex);
    items.push({ type: 'command', command });
  });

  return {
    transcript: {
      filePath: '',
      header: {},
      commands,
      items,
      comments: [],
      ...(opening !== undefined ? { opening } : {}),
    },
    cardIndexOfCommand,
  };
}

// ---------------------------------------------------------------------------
// Internal: blocking, labels, failure citation.
// ---------------------------------------------------------------------------

/**
 * The line id whose execution error blocks `line`, or undefined when it can
 * run. Transitive: a blocked parent passes its origin down. Direct: a parent
 * whose execution broke at or before this line's fork card never validly
 * produced the state the fork continues from.
 */
function blockOriginOf(
  line: TreeLine,
  tracked: ReadonlyMap<string, { outcome: TreeLineOutcome; execErrorIndex?: number }>,
): string | undefined {
  if (line.parentId === undefined) return undefined;
  const parent = tracked.get(line.parentId);
  if (parent === undefined) return undefined;
  if (parent.outcome.status === 'blocked') return parent.outcome.blockedBy;
  if (parent.outcome.status === 'error') return parent.outcome.id;
  if (parent.execErrorIndex !== undefined && line.forkIndex !== undefined) {
    if (line.forkIndex >= parent.execErrorIndex) return parent.outcome.id;
  }
  return undefined;
}

/**
 * The card index where execution broke, or undefined when every command
 * executed cleanly. Two ways to break: a command result carrying `error`
 * (engine error, blank output), and commands the run never reached (the
 * runner's loop broke early — a directive failure or the assertion
 * boundary). Assertion failures are not execution errors (D4).
 */
function execErrorCardIndexOf(
  executedRows: TranscriptResult['commands'],
  cardIndexOfCommand: number[],
  commandCount: number,
): number | undefined {
  const errorRow = executedRows.findIndex((row) => row.error !== undefined);
  if (errorRow !== -1) return cardIndexOfCommand[errorRow];
  if (executedRows.length < commandCount) return cardIndexOfCommand[executedRows.length];
  return undefined;
}

/**
 * The line's derived label (D2/Q-8), read off the live world at line start —
 * formatting shared with the Testing tab through `tree-document.ts`'s label
 * helpers. Nothing is persisted; a world that reports no location degrades
 * to a structural fallback rather than failing the run over a display string.
 */
function labelOf(line: TreeLine, game: TreeWalkerGame): string {
  const room = roomSlugOf(captureWorldSnapshot(game as never)?.location?.name);
  if (line.parentId === undefined) return mainLineLabelOf(room);
  return branchLineLabelOf(room, line.branchId!, line.firstCommand);
}

/** The label of a line that never ran — no world to read a room from. */
function blockedLabelOf(line: TreeLine): string {
  if (line.parentId === undefined) return 'opening';
  return branchLineLabelOf(undefined, line.branchId!, line.firstCommand);
}

/** The line's one-line failure citation: the first failed row's own message. */
function firstFailureOf(result: TranscriptResult | undefined): string | undefined {
  if (result === undefined) return undefined;
  for (const row of result.commands) {
    if (row.passed || row.skipped || row.expectedFailure) continue;
    const message =
      row.failure ?? row.error ?? row.assertionResults.find((a) => !a.passed)?.message;
    if (message !== undefined) return `${row.command.input}: ${message}`;
    return row.command.input;
  }
  return result.errorMessage;
}
