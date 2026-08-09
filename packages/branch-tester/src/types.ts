/**
 * Transcript Testing Types
 *
 * Defines the structure of parsed transcripts and test results.
 */

import type { RandomForceSpec } from '@sharpee/core';
import type { CoverageTracker } from './coverage.js';

// ============================================================================
// Directive Types
// ============================================================================

/**
 * Directive kinds surviving ADR-294 D4. The control-flow/condition layer
 * (IF, WHILE, RETRY, DO/UNTIL, REQUIRES, ENSURES, NAVIGATE) is removed
 * grammar — the parser rejects those forms as named errors. GOAL survives
 * as pure structural annotation (a section label; nothing is evaluated).
 */
export type DirectiveType =
  | 'goal'        // [GOAL: name] — structural label only
  | 'end_goal'    // [END GOAL]
  | 'save'        // $save <name>
  | 'restore'     // $restore <name>
  | 'test-command'; // $teleport, $take, $kill, etc. (ext-testing)

/**
 * A directive in the transcript
 */
export interface Directive {
  type: DirectiveType;
  lineNumber: number;
  goalName?: string;    // For GOAL: the goal name
  saveName?: string;    // For SAVE/RESTORE: the checkpoint name
  testCommand?: string; // For test-command: the full $command input (e.g., "$teleport kitchen")
}

/**
 * A goal segment — a named section of the transcript (structural only;
 * ADR-294 D4 removed the REQUIRES/ENSURES condition layer).
 */
export interface GoalDefinition {
  name: string;
  lineNumber: number;
  startIndex: number;   // Index in items array where goal content starts
  endIndex: number;     // Index in items array where goal ends
}

/**
 * A comment annotation from the transcript (# lines)
 */
export interface TranscriptComment {
  lineNumber: number;
  text: string;
}

/**
 * A transcript item - either a command, directive, or comment
 */
export interface TranscriptItem {
  type: 'command' | 'directive' | 'comment';
  command?: TranscriptCommand;
  directive?: Directive;
  comment?: TranscriptComment;
}

// ============================================================================
// Original Types
// ============================================================================

/**
 * Header metadata from a transcript file
 */
export interface TranscriptHeader {
  title?: string;
  story?: string;
  /** Optional story sub-entry to load (e.g. `v16` → dist/v16.js). ADR-180. */
  entry?: string;
  author?: string;
  description?: string;
  /**
   * Parent transcript's filename stem (ADR-302 D1) — this transcript begins in
   * the state its parent ended in. Absent means a root: a fresh game.
   *
   * **A stem, not a path**: no `.transcript` extension, no directory
   * component, and no way to address a point *inside* the parent. There is no
   * `at <n>` form and never will be — a parent is always a whole file, which
   * is what makes D14's rename a mechanical operation rather than a
   * renumbering.
   */
  continues?: string;
  [key: string]: string | undefined;
}

// ============================================================================
// Run configuration (ADR-294)
// ============================================================================

/**
 * Parsed, validated run configuration from the transcript header (ADR-294 D3).
 *
 * The parser always attaches one to the transcript with defaults applied, so
 * consumers never re-derive defaults from the raw header map.
 */
export interface TranscriptRunConfig {
  /**
   * Pinned seeds: one entry from `seed: N`, several from `seeds: A, B`.
   * Empty when the transcript pins nothing.
   */
  seeds: number[];
  /** Channels the run scopes to (D15). Default: `[]` (ADR-300 D8). */
  channels: string[];
  /** Capture the event stream alongside prose (D6). Default: `false`. */
  events: boolean;
  /** Locale the transcript is bound to (D19). Absent = the story's primary. */
  locale?: string;
  /**
   * Declared outcome forces (ADR-293 D8/D9, surfaced per ADR-294 D13), as
   * canonical `point[#occurrence]=CLASS` strings — the provenance form.
   * Parsed and validated by the parser; the structured specs live in
   * `forceSpecs`.
   */
  forces: string[];
  /**
   * Structured force specs the runner loads into the engine (ADR-293 D8/D9).
   * Transcript forces are always mode `once` (D9's transcript default).
   * Present only when the transcript declares forces, so a force-less
   * transcript's config stays byte-identical to its pre-Phase-C parse.
   */
  forceSpecs?: RandomForceSpec[];
  /** Line the `forces:` header field appeared on, for load-error reporting. */
  forcesLineNumber?: number;
  /**
   * Per-point starting-seed overrides (ADR-293 D11), from the `point-seed:`
   * header field. Present only when the transcript declares overrides.
   */
  pointSeeds?: Array<{ point: string; seed: number }>;
  /** Line the `point-seed:` header field appeared on, for error reporting. */
  pointSeedsLineNumber?: number;
}

/**
 * A single assertion about command output, events, or state.
 *
 * The retained assertion-tier DSL (ADR-294 D2): exact match, contains,
 * not-contains, expected failure, skip/todo, and the event/state pins.
 * The fuzzy forms (`ok-any`, `contains_any`, `matches`) are removed
 * grammar — at a pinned seed there is exactly one output.
 */
export interface Assertion {
  type: 'ok' | 'ok-contains' | 'ok-not-contains'
      | 'fail' | 'skip' | 'todo'
      | 'event-assert' | 'state-assert'
      | 'channel-contains' | 'channel-not-contains'
      | 'channel-is' | 'channel-is-not' | 'channel-absent' | 'channel-present';
  value?: string;      // For contains/not-contains
  reason?: string;     // For fail/todo

  /**
   * Channel this assertion reads, for the `channel-*` forms.
   *
   * `[OK: contains "…"]` reads the main prose, which is where a command's
   * response goes. Everything else the story says — the banner, the prologue,
   * the status line — travels on its own channel, and naming one here is how a
   * transcript asserts on it. Must be declared in the transcript's `channels:`
   * header, or there is nothing captured to read.
   */
  channelId?: string;

  /**
   * Dotted path into a record channel's value (ADR-300 D13).
   *
   * `[CHANNEL: banner.title, …]` addresses the `title` member of the `banner`
   * channel's record, so a test names the piece it means instead of
   * substring-matching a flattened rendering of the whole thing. Empty for an
   * assertion about the channel's value as a whole.
   *
   * A path segment that lands on a LIST matches if any element matches — a
   * `credits` list has no useful index for a test to name, and asserting on
   * position would fail whenever an author adds a name.
   */
  channelPath?: string[];

  /**
   * Expected scalar for the `channel-is` / `channel-is-not` forms, already
   * typed: a number when the transcript wrote a bare number, a string when it
   * wrote a quoted one. The distinction is load-bearing — `is 5` against a
   * text channel carrying `"5"` is a wrong-type failure, not a match
   * (ADR-300 D13).
   */
  channelExpected?: string | number | boolean;

  // Event assertions
  assertTrue?: boolean;         // For event-assert and state-assert: true = must exist, false = must not exist
  eventPosition?: number;       // For event-assert: optional 1-based position (omit for "any position")
  eventType?: string;           // For event-assert: the event type to match
  eventData?: Record<string, any>; // For event-assert: data properties to match

  // State assertions
  stateExpression?: string;     // For state-assert: the expression to evaluate (e.g., "egg.location = thief")

  /**
   * Literal `text` block content (ADR-287 D1), one entry per line,
   * uninterpreted — brackets, `>`, `#`, quotes, blank lines and leading
   * whitespace all survive verbatim. Storage is byte-faithful even though
   * MATCHING normalizes; that distinction is why the block delimiter is a
   * keyword and not indentation.
   *
   * Set only on `ok` (exact match against the block) and payload-less
   * `ok-contains` (the block is the fragment). Stored separately from
   * `TranscriptCommand.expectedOutput` so D1's "a block or a classic block,
   * never both" stays checkable rather than conflated.
   */
  block?: string[];

  /**
   * Line of the assertion tag this block hangs off, for failure display.
   *
   * Deliberately set ONLY on block assertions: stamping every assertion would
   * change the parse of all 182 existing transcripts and break ADR-287 D2's
   * byte-identical guarantee (tests/parse-baseline.test.ts).
   */
  lineNumber?: number;
}

/**
 * A structural problem found while parsing, carrying the line it occurred on.
 *
 * These cannot be recovered from a finished AST — an unclosed block leaves no
 * trace once parsing has swallowed the rest of the file — so the parser records
 * them as it goes and `validateTranscript` merges them into its report.
 */
export interface ParseError {
  lineNumber: number;
  message: string;
}

/**
 * A single command with its expected output and assertions
 */
export interface TranscriptCommand {
  lineNumber: number;
  input: string;
  expectedOutput: string[];
  assertions: Assertion[];
}

/**
 * A fully parsed transcript file
 */
export interface Transcript {
  filePath: string;
  header: TranscriptHeader;
  commands: TranscriptCommand[];         // Legacy: just commands (for backwards compat)
  items?: TranscriptItem[];              // New: commands + directives in order

  /**
   * Assertions about the game's opening, written above the first command.
   *
   * The banner and the prologue happen before anything is typed, so an
   * assertion about them has no command to hang off. These run once, against
   * what the story emitted on the way up. Absent when the transcript makes no
   * claim about the opening, which is nearly all of them.
   */
  opening?: Assertion[];
  goals?: GoalDefinition[];              // Parsed goal segments
  comments: string[];

  /**
   * Structural parse failures (ADR-287 AC4), surfaced via `validateTranscript`.
   *
   * Absent — not an empty array — when the file parsed cleanly, so a clean
   * transcript's AST is byte-identical to its pre-block parse (ADR-287 D2).
   */
  parseErrors?: ParseError[];

  /**
   * Config header keys this transcript DECLARED, in declaration order
   * (ADR-302 D8).
   *
   * Needed because `config` always carries defaults, so a field's value cannot
   * say whether the author wrote it: `channels: []` means both "declared
   * empty" and "not declared". Inheritance has to distinguish them — a child
   * that says nothing takes its parent's, a child that says something takes
   * its own — so the declaration itself is recorded rather than inferred.
   */
  declaredConfigKeys?: string[];

  /**
   * Master seed pinned by the `seed:` header field (ADR-293 D14 as amended by
   * ADR-294 D3 — the body-positional `[SEED:]` directive is a parse error).
   * Set only by the singular `seed:` form; a `seeds:` matrix (D8) lives in
   * `config.seeds` and is threaded per-recording by the runner. In a chain,
   * only the first transcript's seed is honored — the CLI rejects a pin on a
   * later chain member as a loud error.
   */
  seed?: number;
  /** Line the `seed:` header field appeared on, for chain-rule error reporting. */
  seedLineNumber?: number;

  /**
   * Validated run configuration from the header (ADR-294 D3), defaults
   * applied. Always set by the parser; optional only so hand-built
   * transcript literals in older tests keep compiling.
   */
  config?: TranscriptRunConfig;
}

/**
 * Snapshot of an entity's traits at the time of event capture.
 * Used by --emit-traits to show trait state for entities referenced in events.
 */
export interface EntityTraitSnapshot {
  entityId: string;
  traits: Record<string, Record<string, any>>;
}

/**
 * Simplified event info for test results
 */
export interface TestEventInfo {
  type: string;
  data: Record<string, any>;
  /** Trait snapshots for entities referenced in event data. Only populated with --emit-traits. */
  entityTraits?: EntityTraitSnapshot[];
}

/**
 * Result of running a single command
 */
export interface CommandResult {
  command: TranscriptCommand;
  actualOutput: string;
  actualEvents: TestEventInfo[];
  passed: boolean;
  expectedFailure: boolean;  // Was marked [FAIL]
  skipped: boolean;          // Was marked [SKIP] or [TODO]
  assertionResults: AssertionResult[];
  error?: string;

  /**
   * The engine turn this command executed as (1-based, the engine's own
   * counter via `lastTurnResult`). Engine knowledge the transcript text
   * cannot supply: meta commands do not advance the counter, a refused
   * action does. Absent when nothing executed (a synthesized error result,
   * an engine seam that does not report turns).
   */
  turn?: number;

  /**
   * The story ended during this command — the engine emitted `game.ended`
   * with a real ending (`victory`/`defeat`/`quit`) on this turn. What lets
   * the IDE mark a file terminal when its LAST command ends the story
   * cleanly (R9): such a command leaves no dead tail behind it to observe.
   * `restart` never sets this (the harness reboots in place — the story
   * continues); `abort` never sets it (a runtime failure, carried as
   * `error`, not an ending).
   */
  ending?: 'victory' | 'defeat' | 'quit';

  /**
   * The first failed assertion's message, verbatim (`Output does not
   * contain "…"`). Present exactly when an assertion failed this command —
   * the one-line answer a minimal consumer (the testing surface's run
   * column) shows without re-deriving it from `assertionResults`, which
   * never crosses the wire. Runtime throws keep riding `error` instead.
   */
  failure?: string;

  /**
   * The world AFTER this command (R3), captured under `captureWorld`:
   * player location and inventory, each named with a display name and the
   * single token a `[STATE:]` expression resolves back to the entity.
   * Deliberately only the two facts the state evaluator can provably check.
   * (Own copy of the wire shape, like the rest of this type — ADR-302 D15.)
   */
  world?: WorldSnapshot;

  /**
   * The auto-assertion policy wrote this command's assertions on THIS run
   * (Phase 6e, #253): the command arrived bare, the story declares
   * `auto-assertion:`, and the runner synthesized + evaluated the policy's
   * assertions from the turn's real output, then rewrote the transcript
   * file. A consumer shows "assertion written" rather than a plain pass.
   */
  autoAsserted?: boolean;
}

/**
 * The story's `auto-assertion:` policy as the runner consumes it (Phase 6e,
 * #253). Matches the `.story` header's closed value set; the loaded game
 * carries it (`GameEngine.autoAssertionPolicy`). Absent = "let me decide" —
 * a bare command keeps the ADR-294 D2 tier-boundary failure.
 */
export type AutoAssertionPolicy =
  | 'all-emitted-text'
  | 'room-description'
  | 'room-name-and-description';

/** One entity as a {@link WorldSnapshot} names it (R3). */
export interface WorldEntityRef {
  /** Display name — what a surface shows. */
  name: string;
  /** The single whitespace-free token `[STATE:]`'s evaluator resolves back. */
  token: string;
}

/**
 * A compact world snapshot: where the player is and what they carry (R3/R5).
 * A consumer derives "what changed" by comparing consecutive snapshots.
 */
export interface WorldSnapshot {
  /** The player's location. Absent when the seam could not name one. */
  location?: WorldEntityRef;
  /** What the player carries, in world order. */
  inventory: WorldEntityRef[];
}

/**
 * Result of a single assertion check
 */
export interface AssertionResult {
  assertion: Assertion;
  passed: boolean;
  message?: string;
}

/**
 * Result of running an entire transcript
 */
export interface TranscriptResult {
  transcript: Transcript;
  commands: CommandResult[];
  /**
   * Per-transcript outcome (ADR-277 D1). `error` = the transcript never ran
   * (validation or story-load failure) — it still gets a result record
   * instead of vanishing from the run.
   */
  status: 'passed' | 'failed' | 'error';
  passed: number;
  failed: number;
  expectedFailures: number;
  skipped: number;
  duration: number;  // milliseconds
  /** Present exactly when `status` is `'error'`: why the transcript never ran. */
  errorMessage?: string;

}

/**
 * Result of running multiple transcripts
 */
export interface TestRunResult {
  transcripts: TranscriptResult[];
  totalPassed: number;
  totalFailed: number;
  totalExpectedFailures: number;
  totalSkipped: number;
  /** Count of transcripts with `status: 'error'` (ADR-277 D1). */
  totalErrors: number;
  totalDuration: number;
}

/**
 * Options for the test runner
 */
/**
 * Interface for ext-testing extension (optional)
 */
export interface TestingExtensionInterface {
  executeTestCommand(input: string, world: any): { success: boolean; output: string[]; error?: string };
  /** Set context for annotation commands (called after each command execution) */
  setCommandContext?(command: string, response: string): void;
  /** Add an annotation directly (for # comments) */
  addAnnotation?(type: string, text: string, world: any): any;
}

/**
 * Watches a transcript execute, as it executes.
 *
 * The runner otherwise reports only by returning a finished `TranscriptResult`,
 * which forces every consumer — the terminal reporter, the `--json` stream — to
 * wait for the whole file. A transcript takes about half a second and a tree or
 * an explorer run takes minutes, so "wait for the whole thing" is the difference
 * between a progress bar and watching the story play.
 *
 * Deliberately domain-shaped, not wire-shaped: no schema version, no sequence
 * number, no envelope. The runner reports what happened; translating that into
 * the ADR-277 event stream is the CLI's job, which keeps `@sharpee/ide-protocol`
 * out of the execution path.
 *
 * Every method is optional and every implementation must be non-throwing —
 * observation must not be able to fail a test. Callbacks are synchronous and run
 * inline, so a slow observer slows the run.
 */
export interface RunObserver {
  /**
   * A transcript is about to run — fired before its first command, and before
   * any early validation failure, so a transcript that never executes is still
   * announced rather than appearing from nowhere at its own error.
   *
   * @param info `commandCount` is the transcript's command total, known from the
   *   parse that precedes execution.
   */
  onTranscriptStart?(info: { file: string; commandCount: number }): void;
  /**
   * One command finished, in execution order. Fires for every result the run
   * accumulates — including the synthesized opening-assertion result and
   * directive failures, so the live sequence matches the returned
   * `TranscriptResult.commands` exactly.
   */
  onCommandResult?(result: CommandResult): void;
}

export interface RunnerOptions {
  verbose?: boolean;
  emitTraits?: boolean;  // Include trait snapshots for entities referenced in events
  /** Continue the RUN after a failed transcript. Never suppresses a failure (ADR-294 D5). */
  stopOnFailure?: boolean;
  savesDirectory?: string;  // Directory for $save/$restore checkpoints
  testingExtension?: TestingExtensionInterface;  // Optional ext-testing integration

  /**
   * The transcript's EFFECTIVE config when it runs as a tree node (ADR-302
   * D8): seeds, channels, events, forces as inherited root-to-here.
   * Declared-keyed behaviour (session instruments, reseeds) deliberately
   * does NOT read this: declaring an instrument is an instruction,
   * inheriting one is not (D8/D9). Absent for flat and chain runs, where
   * declared IS effective.
   */
  resolvedConfig?: TranscriptRunConfig;
  /**
   * This transcript runs as a chain member (one session across transcripts).
   * Later members legally pin no seed and run at the session's.
   */
  chain?: boolean;
  /**
   * The channels the session's game was assembled with (ADR-294 D15) — the
   * capability profile and capture set are fixed at assembly, so a
   * transcript declaring a different channels: set is a named failure.
   * Absent (unit stubs, legacy callers) → the check is skipped.
   */
  assembledChannels?: string[];
  /**
   * Capture a {@link WorldSnapshot} after every executed command (R3), and
   * at each tree node's entry (R5's inherited-state header). Off by default:
   * the IDE's runs always ask for it; a CLI consumer's green stream stays
   * exactly as small as it was.
   */
  captureWorld?: boolean;
  /**
   * Run-scoped coverage accumulator (ADR-293 D15). One tracker per run —
   * the CLI owns it so a chain's members fold into one report; the runner
   * feeds it each command's `system.draw` trace events.
   */
  coverage?: CoverageTracker;
  /**
   * Watches execution as it happens (live terminal output, the `--json` event
   * stream). Absent → the runner behaves exactly as it did before observers
   * existed.
   */
  observer?: RunObserver;
}

/**
 * Story loader function type
 */
export type StoryLoader = (storyPath: string) => Promise<{
  engine: any;  // GameEngine
  story: any;   // Story instance
}>;
