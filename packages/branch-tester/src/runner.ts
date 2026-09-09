/**
 * runner.ts — the tree runner: one transcript, as the walker synthesized it
 * from a root-to-leaf path of the test tree, executed against a live engine
 * (ADR-307).
 *
 * This file owns the loop: which items run, how the opening is checked (the
 * banner and prologue are said on the way to the first command, so that
 * command's captures carry them), and the run's shape. Everything one command
 * needs — session instruments, directives, executing a command and evaluating
 * its claims — is the assertion core in `@sharpee/transcript-tester`
 * (ADR-340 D1), imported here and never copied (D3). Any failed directive
 * fails the transcript unconditionally (ADR-294 D5) — `--stop-on-failure`
 * only ever controls whether the RUN continues to other transcripts.
 *
 * Public interface: `runTranscript`, `CHORD_STORY_STATE_KEYS`. Owner
 * context: branch-tester (testing tooling).
 *
 * References: ADR-307 (the tree model), ADR-340 D1/D3 (one assertion core),
 * ADR-294 D2/D5, GH #355 (the Chord-spelled state claim).
 */

import { CHORD_IR_ID_ATTRIBUTE, CHORD_STATE_PREFIX, CHORD_STORY_STATE_KEY } from '@sharpee/story-loader';
import {
  checkAssertion,
  configureRandomInstruments,
  directiveFailResult,
  errorResult,
  executeDirective,
  forcesFailResult,
  proseTextLinesOf,
  runCommand,
  unfiredForceError,
  type GameEngine,
} from '@sharpee/transcript-tester';
import type {
  Transcript,
  TranscriptCommand,
  Assertion,
  CommandResult,
  TranscriptResult,
  RunnerOptions,
  StoryStateKeys,
} from './types.js';
import { synthesizeOpeningAssertions } from './auto-assertion.js';

/**
 * How Chord's loader keys declared states in world state — what the state
 * evaluator needs to read `story.state = x` and `[the] name is state`
 * claims (GH #355). The loader's own constants, never respelled.
 */
export const CHORD_STORY_STATE_KEYS: StoryStateKeys = {
  storyState: CHORD_STORY_STATE_KEY,
  entityStatePrefix: CHORD_STATE_PREFIX,
  entityIdAttribute: CHORD_IR_ID_ATTRIBUTE,
};

/**
 * Run a single transcript against an engine.
 *
 * Parse errors never execute (AC-4); everything else runs the assertion
 * tier — the only tier there is since ADR-306 retired author-world goldens.
 */
export async function runTranscript(
  transcript: Transcript,
  engine: GameEngine,
  options: RunnerOptions = {}
): Promise<TranscriptResult> {
  const startTime = Date.now();

  // Announced BEFORE any early return, so a transcript that fails validation is
  // still a start followed by an end rather than an error from nowhere. The
  // count comes from the parse, which has already happened.
  options.observer?.onTranscriptStart?.({
    file: transcript.filePath,
    commandCount: (transcript.items ?? []).filter((item) => item.type === 'command').length,
  });

  // AC-4: a transcript with parse errors executes nothing. The CLIs validate
  // up front too; this is the runner's own guarantee.
  if (transcript.parseErrors && transcript.parseErrors.length > 0) {
    const first = transcript.parseErrors[0];
    return errorResult(
      transcript,
      startTime,
      `${transcript.parseErrors.length} parse error(s) — first: line ${first.lineNumber}: ${first.message}`
    );
  }

  // ADR-293 Phase C session instruments: load forces, apply point-seed
  // overrides, enable trace. Per transcript — a chain member resets the
  // previous member's instruments (forces are session state scoped to the
  // transcript that declares them, D9).
  const instrumentError = configureRandomInstruments(transcript, engine);
  if (instrumentError) {
    return errorResult(transcript, startTime, instrumentError);
  }

  // The tree world's claims may be spelled the way Chord spells them
  // (GH #355); the evaluator reads them through the loader's keys.
  return runAssertion(transcript, engine, { ...options, storyStateKeys: CHORD_STORY_STATE_KEYS }, startTime);
}

/**
 * Result for the transcript's opening assertions (the banner, the prologue).
 *
 * Carries a synthetic command so it prints in sequence with the real ones; the
 * opening is not something anybody typed, and the label says so.
 *
 * Prose forms read everything the player saw through the first command: every
 * channel captured on it (the banner and the prologue travel on their own
 * channels) plus its main output. They used to check against the empty
 * string — a plain `[OK: contains]` opening claim could never pass, which
 * broke the testing surface's opening card (David, 2026-08-09). Channel
 * forms remain for per-channel precision.
 */
function openingResult(
  opening: Assertion[],
  engine: GameEngine,
  firstCommandOutput: string
): CommandResult {
  const command: TranscriptCommand = {
    lineNumber: 0,
    input: '(opening)',
    expectedOutput: [],
    assertions: opening
  };

  /** Every human-readable string a channel value carries: prose trees via
   *  the synthesis reader, plus banner-style JSON objects whose string
   *  properties ARE the rendered lines (title, storyVersion, credits — the
   *  client emits them verbatim, so a claim quotes them verbatim). */
  const textOfValue = (value: unknown): string[] => {
    if (typeof value === 'string') return [value];
    if (Array.isArray(value)) return value.flatMap(textOfValue);
    if (value !== null && typeof value === 'object') {
      if ('content' in (value as Record<string, unknown>)) {
        return proseTextLinesOf([value]);
      }
      return Object.values(value as Record<string, unknown>).flatMap(textOfValue);
    }
    return [];
  };
  const channelText = [
    ...Object.values(engine.bootChannelValues ?? {}),
    ...Object.values(engine.lastChannelValues ?? {}),
  ]
    .flatMap((values) => (values ?? []).flatMap(textOfValue))
    .map((text) => text.trim())
    .filter((text) => text.length > 0)
    .join('\n');
  const openingOutput = [channelText, firstCommandOutput]
    .filter((text) => text.length > 0)
    .join('\n');

  // Channel-form opening claims read the boot's captures first — the banner
  // and prologue channels flush at boot, not inside any command.
  const openingChannels = {
    ...(engine.lastChannelValues ?? {}),
    ...(engine.bootChannelValues ?? {}),
  };
  const assertionResults = opening.map((assertion) =>
    checkAssertion(assertion, openingOutput, '', [], engine.world, openingChannels, CHORD_STORY_STATE_KEYS)
  );
  const passed = assertionResults.every((r) => r.passed);
  const firstFailure = assertionResults.find((r) => !r.passed && r.message)?.message;

  return {
    command,
    actualOutput: '',
    actualEvents: [],
    passed,
    expectedFailure: false,
    skipped: false,
    assertionResults,
    ...(!passed && firstFailure !== undefined ? { failure: firstFailure } : {})
  };
}

// ============================================================================
// The loop
// ============================================================================

/**
 * The tree runner's loop: every item in order, the opening checked once on
 * the first command's captures (authored claims, else the policy's live
 * defaults), the unfired-force check at the end.
 *
 * @param transcript the transcript to run
 * @param engine the engine wrapper
 * @param options runner options, already carrying the Chord state keys
 * @param startTime when the run began
 * @returns the transcript's result
 */
async function runAssertion(
  transcript: Transcript,
  engine: GameEngine,
  options: RunnerOptions,
  startTime: number
): Promise<TranscriptResult> {
  const results: CommandResult[] = [];
  /**
   * Accumulate and announce in one step, so the observer's live sequence is
   * exactly `results` — no second ordering to keep in step with the first.
   */
  const record = (result: CommandResult): void => {
    results.push(result);
    options.observer?.onCommandResult?.(result);
  };
  /** Opening assertions run once, after the first command flushes the opening.
   *  Authored claims win; with none, the opening's DEFAULTS synthesize live
   *  from the boot captures under a policy (ADR-307 open question D: prologue,
   *  title, description) — each piece self-gated on its channel having been
   *  captured, so sessions that never declared them are unchanged. */
  let openingChecked = false;
  /** Any command's assertions were policy-written this run → rewrite the file. */
  let policyWroteAssertions = false;

  for (const item of transcript.items ?? []) {
    if (item.type === 'comment') {
      if (options.testingExtension?.addAnnotation && item.comment) {
        options.testingExtension.addAnnotation('comment', item.comment.text, engine.world);
      }
      continue;
    }

    if (item.type === 'directive') {
      const error = await executeDirective(item.directive!, engine, options);
      if (error) {
        // D5: a failed directive fails the transcript unconditionally and
        // stops it — everything after runs against the wrong world.
        record(directiveFailResult(item.directive!, error));
        break;
      }
      continue;
    }

    const command = item.command!;

    // The assertion boundary (D2): a command must assert something — a bare
    // command list is not a passing test. Under an `auto-assertion:` policy
    // (Phase 6e, #253) a bare command is instead the policy's trigger: its
    // first run writes the assertion. A deliberate [SKIP] is never bare, so
    // it is never trampled.
    const synthesize =
      command.assertions.length === 0 ? engine.autoAssertionPolicy : undefined;
    if (command.assertions.length === 0 && synthesize === undefined) {
      record({
        command,
        actualOutput: '',
        actualEvents: [],
        passed: false,
        expectedFailure: false,
        skipped: false,
        assertionResults: [],
        error:
          `command "${command.input}" has no assertion — ` +
          `add one, or declare an auto-assertion: policy (ADR-294 D2)`
      });
      break;
    }

    const result = await runCommand(command, engine, options, synthesize);
    if (result.autoAsserted) policyWroteAssertions = true;

    // The banner and the prologue are said on the way to the first command, so
    // that is the turn whose capture carries them. Checked once, and reported
    // ahead of the command that flushed them because that is where they read.
    if (!openingChecked) {
      openingChecked = true;
      // Same capture surface as `openingResult`: the banner/prologue/info
      // flush rides the FIRST command's captures on a real engine (the boot
      // snapshot is often empty) — merge both, boot values winning.
      const openingClaims =
        (transcript.opening?.length ?? 0) > 0
          ? transcript.opening!
          : synthesizeOpeningAssertions(engine.autoAssertionPolicy, {
              ...(engine.lastChannelValues ?? {}),
              ...(engine.bootChannelValues ?? {}),
            });
      if (openingClaims.length > 0) {
        record(openingResult(openingClaims, engine, result.actualOutput));
      }
    }

    record(result);

    if (options.testingExtension?.setCommandContext) {
      options.testingExtension.setCommandContext(result.command.input, result.actualOutput);
    }

    if (options.stopOnFailure && !result.passed && !result.expectedFailure && !result.skipped) {
      break;
    }
  }

  // Unfired `once` forces fail the run (D9 / AC-9) — checked only when the
  // transcript otherwise passed; an early failure legitimately leaves later
  // forces unreached.
  if (!results.some(r => !r.passed && !r.expectedFailure && !r.skipped)) {
    const unfired = unfiredForceError(transcript, engine);
    if (unfired) {
      record(forcesFailResult(transcript, unfired));
    }
  }

  const passed = results.filter(r => r.passed && !r.skipped).length;
  const failed = results.filter(r => !r.passed && !r.expectedFailure && !r.skipped).length;
  const expectedFailures = results.filter(r => r.expectedFailure).length;
  const skipped = results.filter(r => r.skipped).length;

  return {
    transcript,
    commands: results,
    status: failed > 0 ? 'failed' : 'passed',
    passed,
    failed,
    expectedFailures,
    skipped,
    duration: Date.now() - startTime
  };
}
