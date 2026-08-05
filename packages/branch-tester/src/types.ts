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
// Run configuration and golden recordings (ADR-294)
// ============================================================================

/**
 * Parsed, validated run configuration from the transcript header (ADR-294 D3).
 *
 * The parser always attaches one to the transcript with defaults applied, so
 * consumers never re-derive defaults from the raw header map.
 */
export interface TranscriptRunConfig {
  /**
   * Pinned seeds: one entry from `seed: N`, several from `seeds: A, B` (D8 —
   * each seed gets its own recording). Empty when the transcript pins nothing
   * (legal in the assertion tier; a golden transcript must pin at least one).
   */
  seeds: number[];
  /** Channels the recording scopes to (D15). Default: `[]` (ADR-300 D8). */
  channels: string[];
  /** Record the event stream alongside prose (D6). Default: `false`. */
  events: boolean;
  /** Locale the recording is bound to (D19). Absent = the story's primary. */
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
 * Provenance header of a `.golden` recording (ADR-294 D3/D7).
 *
 * A replay whose runtime disagrees with any of these fails with the named
 * "stale recording — re-bless" error, never a raw content diff.
 */
export interface GoldenProvenance {
  /** Source transcript filename the recording was made from. */
  transcript: string;
  /** Story name the recording was made against. */
  story: string;
  /** The seed the session was pinned to. One recording per seed (D8). */
  seed: number;
  /** `SEED_DERIVATION_VERSION` at record time (ADR-293). */
  derivation: number;
  /** Save-format version at record time (e.g. `3.0.0`). */
  saveFormat: string;
  /** Channels captured by this recording (D15). */
  channels: string[];
  /** Whether the recording includes event lines (D6). */
  events: boolean;
  /** Locale the recorded prose is bound to (D19). */
  locale: string;
  /** Forces the recording was made under (D13). Serialized as `(none)` when empty. */
  forces: string[];
  /**
   * Point-seed overrides the recording was made under (ADR-293 D11), as
   * `point=seed` strings. OPTIONAL in the format: the `point-seeds:` line is
   * written only when non-empty, so pre-Phase-C recordings stay valid, and
   * absence parses as empty.
   */
  pointSeeds?: string[];
}

/**
 * One recorded event line (`• type {json}`) inside a golden turn.
 *
 * The JSON payload is kept as its raw string so a parse → serialize round
 * trip is byte-faithful (re-stringifying could reorder keys or reformat
 * numbers, which would show up as phantom recording diffs).
 */
export interface GoldenEvent {
  type: string;
  json: string;
}

/** One recorded turn: the command and its output, verbatim (ADR-294 D7). */
export interface GoldenTurn {
  /** The command as typed, without the `> ` prefix. */
  command: string;
  /** Recorded output lines, verbatim — blank lines and indentation preserved. */
  output: string[];
  /** Present only when the recording's provenance says `events: true`. */
  events?: GoldenEvent[];
  /**
   * Declared non-`main` channel captures (ADR-294 D15): flattened lines per
   * channel id, in emission order. Present only when the provenance declares
   * channels beyond `main` AND the channel emitted this turn — a declared
   * channel that emitted nothing has no key (sparse; absence is diffed).
   */
  channels?: Record<string, string[]>;
}

/** A parsed `.golden` recording: provenance plus the recorded turns. */
export interface GoldenRecording {
  provenance: GoldenProvenance;
  turns: GoldenTurn[];
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
      | 'channel-contains' | 'channel-not-contains';
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
   * Golden replay divergence (ADR-294 D1): the recorded output and the
   * actual output for this turn, verbatim. Present exactly when a golden
   * diff failed this command; the reporter renders the line diff.
   */
  diff?: { recorded: string[]; actual: string[] };
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

  /**
   * Which tier ran (ADR-294 D2): `golden` when a recording exists (or was
   * being created), `assertion` otherwise. Absent on `error` results that
   * never reached tier selection.
   */
  tier?: 'golden' | 'assertion';
  /** Path of the `.golden` recording this run diffed against or created. */
  goldenPath?: string;
  /** True when this run created or overwrote the recording (`--bless`). */
  blessed?: boolean;
  /**
   * Path of the divergence save written on a failed golden replay (ADR-294
   * D18): a real save (world, turn counter, RNG stream states) captured at
   * the last matching turn. Working artifact, never committed.
   */
  divergenceSavePath?: string;
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

export interface RunnerOptions {
  verbose?: boolean;
  emitTraits?: boolean;  // Include trait snapshots for entities referenced in events
  /** Continue the RUN after a failed transcript. Never suppresses a failure (ADR-294 D5). */
  stopOnFailure?: boolean;
  savesDirectory?: string;  // Directory for $save/$restore checkpoints
  testingExtension?: TestingExtensionInterface;  // Optional ext-testing integration

  /** Create/overwrite the recording instead of diffing against it (ADR-294 D1). */
  bless?: boolean;
  /** Recording path override; defaults to the transcript's `.golden` sibling (D7). */
  goldenPath?: string;
  /**
   * This transcript runs as a chain member (one session across transcripts).
   * Later members legally pin no seed; their recordings carry the session
   * seed, and replaying one standalone is refused (D7).
   */
  chain?: boolean;
  /**
   * The channels the session's game was assembled with (ADR-294 D15) — the
   * capability profile and capture set are fixed at assembly, so a
   * transcript declaring a different channels: set is a named failure.
   * Absent (unit stubs, legacy callers) → the check is skipped.
   */
  assembledChannels?: string[];
  /** Story name for recording provenance; falls back to the `story:` header. */
  storyName?: string;
  /** Locale for recording provenance when the transcript declares none (D19). */
  locale?: string;
  /**
   * Run-scoped coverage accumulator (ADR-293 D15). One tracker per run —
   * the CLI owns it so a chain's members fold into one report; the runner
   * feeds it each command's `system.draw` trace events.
   */
  coverage?: CoverageTracker;
}

/**
 * Story loader function type
 */
export type StoryLoader = (storyPath: string) => Promise<{
  engine: any;  // GameEngine
  story: any;   // Story instance
}>;
