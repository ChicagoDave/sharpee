/**
 * Transcript Runner — golden replay/record and assertion-tier execution
 * (ADR-294).
 *
 * Two tiers, one source grammar (D2): a transcript with a `.golden` sibling
 * replays against the recording (the recording IS the assertion); `--bless`
 * creates or overwrites the recording; a transcript with no recording runs
 * the retained per-command assertion DSL. Any failed directive fails the
 * transcript unconditionally (D5) — `--stop-on-failure` only ever controls
 * whether the RUN continues to other transcripts.
 *
 * The per-command machinery both tiers share — instruments, directives,
 * running a command and evaluating its claims — is the assertion core
 * (`assertion-core.ts`, `command-core.ts`, ADR-340 D1); this file owns the
 * two loops and the golden tier.
 *
 * Public interface: `runTranscript`, `goldenPathFor`, `divergencePathFor`.
 * Owner context: transcript-tester (testing tooling).
 */

import * as fs from 'fs';
import * as path from 'path';
import { SEED_DERIVATION_VERSION } from '@sharpee/core';
import { SAVE_FORMAT_VERSION } from '@sharpee/engine';
import {
  Transcript,
  TranscriptCommand,
  Assertion,
  CommandResult,
  TranscriptResult,
  TranscriptRunConfig,
  RunnerOptions,
  GoldenRecording,
  GoldenTurn,
  GoldenEvent
} from './types.js';
import { serializeTranscript } from './serializer.js';
import { serializeGolden, parseGoldenFile, GoldenFormatError } from './golden.js';
import { checkAssertion } from './assertion-core.js';
import {
  configureRandomInstruments,
  unfiredForceError,
  forcesFailResult,
  executeDirective,
  directiveFailResult,
  errorResult,
  runCommand,
  type GameEngine,
} from './command-core.js';

/** Locale stamped into provenance when neither transcript nor caller declares one (D19). */
const DEFAULT_LOCALE = 'en-US';

/**
 * Name for the turn's composed prose when a divergence has to say which
 * surface moved. It is not a channel id: after ADR-300 D8 the prose is
 * composed from seven channels in `preferred-layout` order, so the thing
 * that diverged is the composition, not any one of them. Reported as
 * `(prose)`, matching how the opening reports as `(opening)`.
 */
const PROSE_SURFACE = '(prose)';

/**
 * The one story-output line excluded from golden diffs (ADR-294 D6): the
 * banner's build-date line. Both sides are masked before comparison — the
 * recording keeps the real line, so nothing else is normalized. Growing
 * this exclusion requires amending ADR-294.
 */
const BUILD_DATE_LINE = /^Story v\S+ \(built [^)]+\)$/;

/**
 * Recording path for a transcript (D7/D8). A single-seed transcript records
 * to its `.golden` sibling; a `seeds:` matrix records one file per seed as
 * `<name>.<seed>.golden` — each replay diffs only against its own seed's
 * recording.
 */
export function goldenPathFor(transcriptPath: string, matrixSeed?: number): string {
  const suffix = matrixSeed === undefined ? '.golden' : `.${matrixSeed}.golden`;
  return transcriptPath.replace(/\.transcript$/, suffix);
}

/** Divergence-save path for a transcript (D18). Working artifact, never committed. */
export function divergencePathFor(transcriptPath: string): string {
  return transcriptPath.replace(/\.transcript$/, '.divergence.json');
}

/**
 * Run a single transcript against an engine.
 *
 * Tier selection (D2): `--bless` records; an existing recording replays;
 * otherwise the assertion tier runs. Parse errors never execute (AC-4).
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

  // A seeds: matrix records per-seed siblings (D8); the session's live seed
  // selects which recording this run belongs to.
  const seeds = transcript.config?.seeds ?? [];
  const matrixSeed = seeds.length > 1 ? engine.engine?.getMasterSeed?.() : undefined;
  const goldenPath = options.goldenPath ?? goldenPathFor(transcript.filePath, matrixSeed);

  if (options.bless) {
    return runGolden(transcript, engine, options, goldenPath, 'record', startTime);
  }
  if (fs.existsSync(goldenPath)) {
    return runGolden(transcript, engine, options, goldenPath, 'replay', startTime);
  }
  return runAssertion(transcript, engine, options, startTime);
}

// ============================================================================
// Golden tier (D1/D3/D6/D7)
// ============================================================================

async function runGolden(
  transcript: Transcript,
  engine: GameEngine,
  options: RunnerOptions,
  goldenPath: string,
  mode: 'record' | 'replay',
  startTime: number
): Promise<TranscriptResult> {
  const config: TranscriptRunConfig =
    transcript.config ?? { seeds: [], channels: [], events: false, forces: [] };

  // ADR-294 D15: the capability profile and capture set are fixed at game
  // assembly, so a transcript whose channels: disagrees with the session it
  // runs in is a named failure, never a silent partial capture. Bites chains
  // whose members declare different channels (one session, one profile).
  if (
    options.assembledChannels &&
    (options.assembledChannels.length !== config.channels.length ||
      !options.assembledChannels.every((id, i) => id === config.channels[i]))
  ) {
    return errorResult(transcript, startTime,
      `transcript declares channels: ${config.channels.join(', ') || '(none)'} but the session was assembled with ` +
      `channels: ${options.assembledChannels.join(', ') || '(none)'} — chain members must declare identical channels (ADR-294 D15)`,
      'golden', goldenPath);
  }
  const capturedChannelIds = config.channels;

  // A golden transcript must pin a seed (D3). The exception is a chain
  // member after the first: the chain is one session and its recording
  // carries the session seed — which is also why replaying one standalone
  // is refused (D7).
  if (config.seeds.length === 0 && !options.chain) {
    return errorResult(transcript, startTime,
      mode === 'record'
        ? 'a golden transcript must pin a seed — declare seed: N in the header (ADR-294 D3)'
        : `${path.basename(goldenPath)} is a chain-member recording (its transcript pins no seed) — replay it with --chain (ADR-294 D7)`,
      'golden', goldenPath);
  }

  const sessionSeed = engine.engine?.getMasterSeed?.();
  if (sessionSeed === undefined) {
    return errorResult(transcript, startTime,
      'golden runs need the platform engine (engine.getMasterSeed) to stamp and verify the seed (ADR-294 D3)',
      'golden', goldenPath);
  }
  if (config.seeds.length === 1 && sessionSeed !== config.seeds[0]) {
    return errorResult(transcript, startTime,
      `session seed ${sessionSeed} disagrees with the transcript's pin ${config.seeds[0]} — ` +
      `run at the pinned seed (drop --seed/--vary)`, 'golden', goldenPath);
  }
  if (config.seeds.length > 1 && !config.seeds.includes(sessionSeed)) {
    return errorResult(transcript, startTime,
      `session seed ${sessionSeed} is not in the transcript's seeds: matrix (${config.seeds.join(', ')}) — ` +
      `run at one of the declared seeds (ADR-294 D8)`, 'golden', goldenPath);
  }

  const storyName = transcript.header.story ?? options.storyName;
  const locale = config.locale ?? options.locale ?? DEFAULT_LOCALE;

  let recording: GoldenRecording | null = null;
  if (mode === 'replay') {
    try {
      recording = parseGoldenFile(goldenPath);
    } catch (e) {
      if (e instanceof GoldenFormatError) {
        return errorResult(transcript, startTime, e.message, 'golden', goldenPath);
      }
      throw e;
    }

    // Provenance staleness (D3): every mismatch is named; a stale recording
    // NEVER presents as a content diff.
    const stale = staleProvenanceFields(recording, transcript, config, sessionSeed, storyName, locale);
    if (stale.length > 0) {
      return errorResult(transcript, startTime,
        `stale recording — re-bless (${goldenPath}): ${stale.join('; ')}`, 'golden', goldenPath);
    }

    // Command-list drift is the same stale class: the SOURCE changed since
    // the bless. Checked statically before anything executes.
    const drift = commandListDrift(transcript, recording);
    if (drift) {
      return errorResult(transcript, startTime,
        `stale recording — re-bless (${goldenPath}): ${drift}`, 'golden', goldenPath);
    }
  }

  const results: CommandResult[] = [];
  /**
   * Accumulate and announce in one step, so the observer's live sequence is
   * exactly `results` — no second ordering to keep in step with the first.
   */
  const record = (result: CommandResult): void => {
    results.push(result);
    options.observer?.onCommandResult?.(result);
  };
  const turns: GoldenTurn[] = [];
  let turnIndex = 0;
  let failed = false;
  let divergenceSavePath: string | undefined;

  for (const item of transcript.items ?? []) {
    if (item.type === 'comment') continue;

    if (item.type === 'directive') {
      const error = await executeDirective(item.directive!, engine, options);
      if (error) {
        // D5: a failed directive fails the transcript, unconditionally.
        // In record mode no .golden is written — a recording made past a
        // failed directive would enshrine a broken session.
        record(directiveFailResult(item.directive!, error));
        failed = true;
        break;
      }
      continue;
    }

    const command = item.command!;

    // D18: capture a real save BEFORE the command runs, so a divergence can
    // drop the author at the last matching turn with RNG streams positioned
    // faithfully. In-memory until a divergence actually happens.
    const preTurnSave = mode === 'replay' ? await captureEngineSave(engine) : null;

    const { output, events, channels } = await executeForGolden(
      command, engine, config.events, capturedChannelIds);
    options.coverage?.collectFrom(engine.lastEvents);
    const actualLines = output.split('\n');

    if (mode === 'record') {
      const turn: GoldenTurn = { command: command.input, output: actualLines };
      if (config.events && events.length > 0) turn.events = events;
      if (channels && Object.keys(channels).length > 0) turn.channels = channels;
      turns.push(turn);
      record(goldenPassResult(command, output));
    } else {
      const turn = recording!.turns[turnIndex];
      const divergence = diffTurn(turn, actualLines, events, config.events,
        capturedChannelIds, channels);
      if (divergence) {
        // D15: name the surface that moved — the composed prose, or a
        // declared channel.
        let error = divergence.channel && divergence.channel !== PROSE_SURFACE
          ? `channel '${divergence.channel}' diverged from the recording (${path.basename(goldenPath)})`
          : `output diverged from the recording (${path.basename(goldenPath)})`;
        if (preTurnSave !== null) {
          divergenceSavePath = divergencePathFor(transcript.filePath);
          fs.writeFileSync(divergenceSavePath, JSON.stringify(preTurnSave), 'utf-8');
          error +=
            `; divergence save written: ${divergenceSavePath} — ` +
            `restore one command before the divergence with --restore ${divergenceSavePath} --seed ${sessionSeed}, ` +
            `then replay: ${command.input}`;
        }
        record({
          command,
          actualOutput: output,
          actualEvents: [],
          passed: false,
          expectedFailure: false,
          skipped: false,
          assertionResults: [],
          error,
          diff: divergence
        });
        failed = true;
        break;
      }
      record(goldenPassResult(command, output));
    }
    turnIndex++;
  }

  // An unfired `once` force is a hard failure of the same severity as any
  // other failed run (ADR-293 D9 / AC-9) — checked only when the run
  // otherwise passed, since an early failure legitimately leaves later
  // forces unreached. In record mode this also blocks the bless: a recording
  // made under a force that never fired would enshrine a lie.
  if (!failed) {
    const unfired = unfiredForceError(transcript, engine);
    if (unfired) {
      record(forcesFailResult(transcript, unfired));
      failed = true;
    }
  }

  // A green replay clears any divergence save a previous failing run left
  // behind — it describes a divergence that no longer exists.
  if (mode === 'replay' && !failed) {
    fs.rmSync(divergencePathFor(transcript.filePath), { force: true });
  }

  if (mode === 'record' && !failed) {
    const recording: GoldenRecording = {
      provenance: {
        transcript: path.basename(transcript.filePath),
        story: storyName ?? 'unknown',
        seed: sessionSeed,
        derivation: SEED_DERIVATION_VERSION,
        saveFormat: SAVE_FORMAT_VERSION,
        channels: config.channels,
        events: config.events,
        locale,
        forces: config.forces,
        ...(config.pointSeeds && config.pointSeeds.length > 0
          ? { pointSeeds: config.pointSeeds.map((p) => `${p.point}=${p.seed}`) }
          : {})
      },
      turns
    };
    fs.writeFileSync(goldenPath, serializeGolden(recording), 'utf-8');
  }

  const passed = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;
  return {
    transcript,
    commands: results,
    status: failedCount > 0 ? 'failed' : 'passed',
    passed,
    failed: failedCount,
    expectedFailures: 0,
    skipped: 0,
    duration: Date.now() - startTime,
    tier: 'golden',
    goldenPath,
    blessed: mode === 'record' && !failed,
    ...(divergenceSavePath !== undefined ? { divergenceSavePath } : {})
  };
}

/**
 * Capture the engine's current save payload in memory (D18). Returns null
 * when the platform engine is unavailable or the save fails — divergence
 * saves degrade to absent, never to a run failure.
 */
async function captureEngineSave(engine: GameEngine): Promise<unknown | null> {
  const platform = engine.engine;
  if (!platform) return null;
  try {
    let captured: unknown = null;
    platform.registerSaveRestoreHooks({
      onSaveRequested: async (data) => { captured = data; },
      onRestoreRequested: async () => null
    });
    const saved = await platform.save();
    return saved ? captured : null;
  } catch {
    return null;
  }
}

/** Execute one command for the golden tier, capturing verbatim output and events. */
async function executeForGolden(
  command: TranscriptCommand,
  engine: GameEngine,
  captureEvents: boolean,
  capturedChannelIds: string[] = []
): Promise<{ output: string; events: GoldenEvent[]; channels?: Record<string, string[]> }> {
  let output: string;
  try {
    const result = await engine.executeCommand(command.input);
    output = typeof result === 'string' ? result : (engine.getOutput?.() || '');
  } catch (e) {
    // A throw still produces a turn — its "output" is the error text, which
    // will never match a recording and shows up in the diff.
    output = `Error: ${e instanceof Error ? e.message : String(e)}`;
  }

  const events: GoldenEvent[] = [];
  if (captureEvents && engine.lastEvents) {
    for (const event of engine.lastEvents) {
      if (event.type.startsWith('system.')) continue;
      events.push({ type: event.type, json: JSON.stringify(event.data ?? {}) });
    }
  }

  // ADR-294 D15: pull the declared channels' captures for this command.
  // Filtered to the declared set so a stub or over-eager capture can never
  // smuggle an undeclared channel into a recording.
  let channels: Record<string, string[]> | undefined;
  if (capturedChannelIds.length > 0 && engine.lastChannels) {
    for (const id of capturedChannelIds) {
      const lines = engine.lastChannels[id];
      if (lines && lines.length > 0) {
        (channels ??= {})[id] = [...lines];
      }
    }
  }
  return { output, events, channels };
}

/**
 * Result for the transcript's opening assertions (the banner, the prologue).
 *
 * Carries a synthetic command so it prints in sequence with the real ones; the
 * opening is not something anybody typed, and the label says so.
 */
function openingResult(
  opening: Assertion[],
  engine: GameEngine
): CommandResult {
  const command: TranscriptCommand = {
    lineNumber: 0,
    input: '(opening)',
    expectedOutput: [],
    assertions: opening
  };

  const assertionResults = opening.map((assertion) =>
    checkAssertion(assertion, '', '', [], engine.world, engine.lastChannelValues ?? engine.lastChannels)
  );

  return {
    command,
    actualOutput: '',
    actualEvents: [],
    passed: assertionResults.every((r) => r.passed),
    expectedFailure: false,
    skipped: false,
    assertionResults
  };
}

/** A passing golden-tier command result. */
function goldenPassResult(command: TranscriptCommand, output: string): CommandResult {
  return {
    command,
    actualOutput: output,
    actualEvents: [],
    passed: true,
    expectedFailure: false,
    skipped: false,
    assertionResults: []
  };
}

/** List every provenance field that disagrees with the runtime (D3). */
function staleProvenanceFields(
  recording: GoldenRecording,
  transcript: Transcript,
  config: TranscriptRunConfig,
  sessionSeed: number,
  storyName: string | undefined,
  locale: string
): string[] {
  const p = recording.provenance;
  const stale: string[] = [];
  const check = (field: string, recorded: string, runtime: string) => {
    if (recorded !== runtime) stale.push(`${field} recorded ${recorded}, runtime ${runtime}`);
  };

  check('transcript', p.transcript, path.basename(transcript.filePath));
  if (storyName !== undefined) check('story', p.story, storyName);
  check('seed', String(p.seed), String(sessionSeed));
  check('derivation', String(p.derivation), String(SEED_DERIVATION_VERSION));
  check('save-format', p.saveFormat, SAVE_FORMAT_VERSION);
  check('channels', p.channels.join(', ') || '(none)', config.channels.join(', ') || '(none)');
  check('events', String(p.events), String(config.events));
  check('locale', p.locale, locale);
  check('forces', p.forces.join(', ') || '(none)', config.forces.join(', ') || '(none)');
  check(
    'point-seeds',
    (p.pointSeeds ?? []).join(', ') || '(none)',
    (config.pointSeeds ?? []).map((entry) => `${entry.point}=${entry.seed}`).join(', ') || '(none)'
  );
  return stale;
}

/** Compare the transcript's command list against the recording's turns. */
function commandListDrift(transcript: Transcript, recording: GoldenRecording): string | null {
  const commands = transcript.commands;
  const turns = recording.turns;
  const shared = Math.min(commands.length, turns.length);
  for (let i = 0; i < shared; i++) {
    if (commands[i].input !== turns[i].command) {
      return `command ${i + 1} is "${commands[i].input}" in the transcript but "${turns[i].command}" in the recording`;
    }
  }
  if (commands.length !== turns.length) {
    return `the transcript has ${commands.length} command(s) but the recording has ${turns.length} turn(s)`;
  }
  return null;
}

/**
 * Diff one replayed turn against its recording. Returns the divergence, or
 * null when they match. The build-date banner line is masked on both sides
 * (D6); nothing else is normalized. Declared channels (ADR-294 D15)
 * are compared in their serialized `◦ <id> <line>` form, appended after
 * output/events in declaration order — absence is meaningful (a cue that
 * stops firing diverges). The returned `channel` names the surface the first
 * mismatch lies in (`PROSE_SURFACE` for prose/events).
 */
function diffTurn(
  turn: GoldenTurn,
  actualLines: string[],
  actualEvents: GoldenEvent[],
  compareEvents: boolean,
  capturedChannelIds: string[] = [],
  actualChannels?: Record<string, string[]>
): { recorded: string[]; actual: string[]; channel?: string } | null {
  const channelLines = (source?: Record<string, string[]>) =>
    capturedChannelIds.flatMap((id) =>
      (source?.[id] ?? []).map((line) => (line === '' ? `◦ ${id}` : `◦ ${id} ${line}`)));

  const recordedFull = [
    ...(compareEvents
      ? [...turn.output, ...(turn.events ?? []).map(e => `• ${e.type} ${e.json}`)]
      : turn.output),
    ...channelLines(turn.channels)
  ];
  const actualFull = [
    ...(compareEvents
      ? [...actualLines, ...actualEvents.map(e => `• ${e.type} ${e.json}`)]
      : actualLines),
    ...channelLines(actualChannels)
  ];

  const mask = (line: string) => (BUILD_DATE_LINE.test(line) ? '<build-date>' : line);
  const same =
    recordedFull.length === actualFull.length &&
    recordedFull.every((line, i) => mask(line) === mask(actualFull[i]));
  if (same) return null;

  // Name the first mismatched surface: walk to the first differing index and
  // classify whichever side has a line there (length mismatches included).
  let channel: string | undefined;
  const limit = Math.max(recordedFull.length, actualFull.length);
  for (let i = 0; i < limit; i++) {
    const a = recordedFull[i];
    const b = actualFull[i];
    if (a !== undefined && b !== undefined && mask(a) === mask(b)) continue;
    const line = a ?? b ?? '';
    const m = /^◦ (\S+)/.exec(line);
    channel = m ? m[1] : PROSE_SURFACE;
    break;
  }

  return { recorded: recordedFull, actual: actualFull, channel };
}

// ============================================================================
// Assertion tier (D2)
// ============================================================================

async function runAssertion(
  transcript: Transcript,
  engine: GameEngine,
  options: RunnerOptions,
  startTime: number
): Promise<TranscriptResult> {
  const results: CommandResult[] = [];
  /** See `runGolden`: accumulate and announce together, one ordering only. */
  const record = (result: CommandResult): void => {
    results.push(result);
    options.observer?.onCommandResult?.(result);
  };
  /** Opening assertions run once, after the first command flushes the opening. */
  let openingChecked = (transcript.opening?.length ?? 0) === 0;
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

    // The tier boundary (D2): with no recording, a command must assert
    // something — a bare command list is bless material, not a passing test.
    // Under an `auto-assertion:` policy (Phase 6e, #253) a bare command is
    // instead the policy's trigger: its first run writes the assertion. A
    // deliberate [SKIP] is never bare, so it is never trampled.
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
          `command "${command.input}" has no assertion and no recording exists — ` +
          `record the transcript with --bless or add an assertion (ADR-294 D2)`
      });
      break;
    }

    const result = await runCommand(command, engine, options, synthesize);
    if (result.autoAsserted) policyWroteAssertions = true;
    options.coverage?.collectFrom(engine.lastEvents);

    // The banner and the prologue are said on the way to the first command, so
    // that is the turn whose capture carries them. Checked once, and reported
    // ahead of the command that flushed them because that is where they read.
    if (!openingChecked) {
      openingChecked = true;
      record(openingResult(transcript.opening!, engine));
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

  // Phase 6e (#253): the policy's writes land in the FILE, in `--bless`'s
  // spirit — the runner mutated the parsed transcript in memory (assertions
  // pushed onto bare commands); one serialize makes disk agree. The
  // serializer round-trips comments and formatting, so untouched content
  // survives byte-for-byte.
  if (policyWroteAssertions && transcript.filePath) {
    fs.writeFileSync(transcript.filePath, serializeTranscript(transcript));
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
    duration: Date.now() - startTime,
    tier: 'assertion'
  };
}
