/**
 * runner.ts — the tree runner: one transcript, as the walker synthesized it
 * from a root-to-leaf path of the test tree, executed against a live engine
 * (ADR-307).
 *
 * This file owns the loop: which items run, how the opening is checked (the
 * story's opening routine runs before any command, and its row is checked
 * against what that routine sent, ahead of the first command; ADR-404
 * decision 12), and the run's shape. Everything one command
 * needs — session instruments, directives, executing a command and evaluating
 * its claims — is the assertion core in `@sharpee/transcript-tester`
 * (ADR-340 D1), imported here and never copied (D3). Any failed directive
 * fails the transcript unconditionally (ADR-294 D5) — `--stop-on-failure`
 * only ever controls whether the RUN continues to other transcripts.
 *
 * Public interface: `runTranscript`, `TreeRunnerOptions`,
 * `CHORD_STORY_STATE_KEYS`. Owner
 * context: branch-tester (testing tooling).
 *
 * References: ADR-307 (the tree model), ADR-340 D1/D3 (one assertion core),
 * ADR-294 D2/D5, GH #355 (the Chord-spelled state claim).
 */

import { CHORD_CLAUSE_OCCURRENCE_PREFIX, CHORD_GONE_PREFIX, CHORD_IR_ID_ATTRIBUTE, CHORD_STATE_PREFIX, CHORD_STORY_STATE_KEY, CHORD_TIMER_PREFIX } from '@sharpee/story-loader';
import {
  checkAssertion,
  configureRandomInstruments,
  directiveFailResult,
  errorResult,
  executeDirective,
  forcesFailResult,
  openNewGame,
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
 * evaluator needs to read `story.state = x`, `[the] name is state`
 * (GH #355), `is gone` and `<timer> has started|expired` claims. The
 * loader's own constants, never respelled.
 */
/**
 * Runner options plus the one seam the tree walker needs and the observer
 * cannot give it: a step the loop WAITS for. `afterCommand` is called once
 * per executed command, after its result is recorded and before the next
 * item runs, with the game exactly as that command left it. The observer's
 * `onCommandResult` is not awaited, so nothing asynchronous (capturing the
 * engine's save at a fork card) can be done from it.
 */
export type TreeRunnerOptions = RunnerOptions & {
  afterCommand?: (result: CommandResult) => Promise<void>;
};

export const CHORD_STORY_STATE_KEYS: StoryStateKeys = {
  storyState: CHORD_STORY_STATE_KEY,
  entityStatePrefix: CHORD_STATE_PREFIX,
  entityIdAttribute: CHORD_IR_ID_ATTRIBUTE,
  entityGonePrefix: CHORD_GONE_PREFIX,
  timerPrefix: CHORD_TIMER_PREFIX,
  clauseOccurrencePrefix: CHORD_CLAUSE_OCCURRENCE_PREFIX,
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
  options: TreeRunnerOptions = {}
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

  // A new game opens before its first command (ADR-404 decision 4): the
  // runner opens a game it finds pending and leaves any other alone, so a
  // line the walker already opened, or restored from a fork's save, is not
  // opened twice.
  const openingError = await openNewGame(engine);
  if (openingError) {
    return errorResult(transcript, startTime, openingError);
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
 * Prose forms read everything the opening routine printed, in the order the
 * story's opening states: packet by packet, the text of each captured
 * channel the packet carried (the banner and the prologue travel on their
 * own channels) and then the packet's composed prose, which for the first
 * look is the room. Channel forms read the opening's captures by channel id,
 * and event forms the events the opening emitted. Nothing a command said is
 * read: the opening is checked before the first command runs.
 *
 * A game with no recorded packets (a stub, or a game some other caller
 * opened without bootstrap) is read from its boot captures alone.
 */
function openingResult(
  opening: Assertion[],
  engine: GameEngine,
  openingCardId?: string
): CommandResult {
  // The row names the opening card (ADR-357 D9) so a consumer lands on it
  // without an index rule — this row is result 0 whenever it exists.
  const command: TranscriptCommand = {
    lineNumber: 0,
    input: '(opening)',
    expectedOutput: [],
    assertions: opening,
    ...(openingCardId !== undefined ? { cardId: openingCardId } : {})
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
  const textOfChannels = (channels: Record<string, unknown[]>): string[] =>
    Object.values(channels)
      .flatMap((values) => (values ?? []).flatMap(textOfValue))
      .map((text) => text.trim())
      .filter((text) => text.length > 0);
  const packets = engine.openingPackets ?? [];
  const openingOutput = (
    packets.length > 0
      ? packets.flatMap((packet) => [...textOfChannels(packet.channelValues), packet.output])
      : textOfChannels(engine.bootChannelValues ?? {})
  )
    .filter((text) => text.length > 0)
    .join('\n');

  const openingChannels = engine.bootChannelValues ?? {};
  // The assertion core's event shape always carries `data`; an engine event
  // may have none.
  const openingEvents = (engine.openingEvents ?? []).map((event) => ({ type: event.type, data: event.data ?? {} }));
  const assertionResults = opening.map((assertion) =>
    checkAssertion(assertion, openingOutput, '', openingEvents, engine.world, openingChannels, CHORD_STORY_STATE_KEYS)
  );
  const passed = assertionResults.every((r) => r.passed);
  const firstFailure = assertionResults.find((r) => !r.passed && r.message)?.message;

  // The opening's output IS what its claims read (GH #585): a failed
  // opening claim shows the opening it was checked against, in the tab and
  // the CLI alike, instead of an empty string.
  return {
    command,
    actualOutput: openingOutput,
    actualEvents: openingEvents,
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
 * The tree runner's loop: the opening checked once, ahead of every item and
 * whether or not the transcript has a command (authored claims, else the
 * policy's live defaults), then every item in order, then the unfired-force
 * check at the end.
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
  options: TreeRunnerOptions,
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
  /** Any command's assertions were policy-written this run → rewrite the file. */
  let policyWroteAssertions = false;

  // The opening's row. Authored claims win; with none, the opening's
  // DEFAULTS synthesize live from the opening's captures under a policy
  // (ADR-307 open question D: prologue, title, description) — each piece
  // self-gated on its channel having been captured, so sessions that never
  // declared them are unchanged. The opening ran before any command, so its
  // row is checked here, ahead of the loop: a tree of one opening card and
  // no turn is still checked.
  const openingClaims =
    (transcript.opening?.length ?? 0) > 0
      ? transcript.opening!
      : synthesizeOpeningAssertions(engine.autoAssertionPolicy, engine.bootChannelValues ?? {});
  if (openingClaims.length > 0) {
    record(openingResult(openingClaims, engine, transcript.openingCardId));
  }

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

    record(result);
    await options.afterCommand?.(result);

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
