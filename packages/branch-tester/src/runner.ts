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
 * Public interface: `runTranscript`, `goldenPathFor`. Owner context:
 * branch-tester (testing tooling).
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  SEED_DERIVATION_VERSION,
  getPoint,
  forceKey,
  RandomForceSpec,
  RandomForceStatus,
  RandomForceLoadError
} from '@sharpee/core';
import { SAVE_FORMAT_VERSION } from '@sharpee/engine';
import {
  Transcript,
  TranscriptCommand,
  Directive,
  Assertion,
  CommandResult,
  AssertionResult,
  TranscriptResult,
  TranscriptRunConfig,
  RunnerOptions,
  TestEventInfo,
  EntityTraitSnapshot,
  GoldenRecording,
  GoldenTurn,
  GoldenEvent
} from './types.js';
import { serializeGolden, parseGoldenFile, GoldenFormatError } from './golden.js';
import { checkChannelAssertion, channelsReferencedBy } from './channel-assert.js';

/**
 * Interface for the game engine wrapper the CLIs hand the runner.
 */
interface GameEngine {
  executeCommand(input: string): Promise<string> | string;
  getOutput?(): string;
  lastEvents?: Array<{ type: string; data?: any }>;
  /**
   * Declared channel captures for the last command (ADR-294 D15): flattened
   * lines per channel id. Populated by bootstrap's assembleGame when the
   * session declared any channels. The turn's composed prose is not among
   * them — it rides the command's return value (ADR-300 D8/D9).
   */
  lastChannels?: Record<string, string[]>;
  /**
   * The same emissions as `lastChannels`, kept as their STRUCTURED values
   * (ADR-300 D13). A dotted-path assertion (`banner.title`) reads these; a
   * golden recording reads the flattened lines. A flattened line cannot be
   * un-flattened, which is why both exist.
   */
  lastChannelValues?: Record<string, unknown[]>;
  world?: WorldModel;
  /**
   * The underlying platform engine. $save/$restore go through its real
   * save format (version, turn counter, RNG stream states — ADR-293 D7)
   * rather than a hand-rolled world snapshot; the tester owns only WHERE
   * the file lives, never WHAT is in it. Golden provenance reads the
   * session's master seed from here (ADR-294 D3).
   */
  engine?: {
    registerSaveRestoreHooks(hooks: {
      onSaveRequested(data: unknown): Promise<void>;
      onRestoreRequested(): Promise<unknown | null>;
    }): void;
    save(): Promise<boolean>;
    restore(): Promise<boolean>;
    getMasterSeed?(): number;
    /** ADR-293 Phase C: the per-point stream owner (forces, point-seed overrides). */
    getRandomService?(): PlatformRandomService;
    /** ADR-293 D16: per-draw trace onto the system-event channel; the runner opts in. */
    setRandomTraceEnabled?(enabled: boolean): void;
  };
}

/**
 * The slice of `EngineRandomService` the runner drives (ADR-293 D8/D9/D11).
 * Structural so the tester never imports the engine class itself.
 */
interface PlatformRandomService {
  loadForces(specs: readonly RandomForceSpec[]): void;
  clearForces(): void;
  getForceReport(): RandomForceStatus[];
  setPointSeedOverrides(overrides: Readonly<Record<string, number>>): void;
  /**
   * Drop the named points' stream continuity (ADR-302 D5/D8).
   *
   * A save carries the parent's stream states and `restore` adopts them, which
   * is what a save is for. A branch child wants the parent's WORLD without the
   * parent's luck, and this is how it says so: `save → restore → reseed`.
   * Without it, a child's `seed:` or `point-seed:` is silently inert for every
   * point that had already drawn — which is every point worth varying, since
   * you branch after the interesting thing has started.
   */
  reseedStreams(points: 'all' | readonly string[]): void;
}

/**
 * Minimal interface for world model state queries ([STATE:] assertions).
 */
interface WorldModel {
  getEntityById?(id: string): any;
  getEntity?(id: string): any;
  findEntityByName?(name: string): any;
  getAllEntities?(): any[];
  getLocation?(entityId: string): string | undefined;
  getContents?(containerId: string): any[];
  getPlayer?(): any;
}

/**
 * Every assertion a transcript makes — its opening claims and every command's.
 * The input to capture inference (ADR-300 D14).
 */
function allAssertionsOf(transcript: Transcript): Assertion[] {
  const assertions: Assertion[] = [...(transcript.opening ?? [])];
  for (const command of transcript.commands) {
    assertions.push(...command.assertions);
  }
  return assertions;
}

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
  // ADR-300 D14: the capture set is INFERRED from the assertions, not declared.
  // What a transcript asserts about is what gets captured, so a `channels:`
  // header cannot drift out of step with the assertions beneath it. A declared
  // list is still honoured — a golden recording may want a channel nothing
  // asserts on — so the two union rather than compete.
  const capturedChannelIds = [
    ...new Set([...config.channels, ...channelsReferencedBy(allAssertionsOf(transcript))]),
  ];

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
        results.push(directiveFailResult(item.directive!, error));
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
      results.push(goldenPassResult(command, output));
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
        results.push({
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
      results.push(goldenPassResult(command, output));
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
      results.push(forcesFailResult(transcript, unfired));
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
    checkAssertion(assertion, '', '', [], engine.world, engine.lastChannelValues)
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

// ============================================================================
// ADR-293 Phase C session instruments (forces / point-seed / trace)
// ============================================================================

/**
 * Configure the engine's session instruments from the transcript header:
 * reset then load forces (D8/D9), apply point-seed overrides (D11), and
 * enable trace — the runner is an opted-in surface (D16). Returns an error
 * message on failure, null on success. Always resets instruments even for a
 * transcript declaring none, so a chain member never inherits the previous
 * member's forces.
 */
function configureRandomInstruments(
  transcript: Transcript,
  engine: GameEngine
): string | null {
  const config = transcript.config;
  const forceSpecs = config?.forceSpecs ?? [];
  const pointSeeds = config?.pointSeeds ?? [];
  const platform = engine.engine;
  const service = platform?.getRandomService?.();
  const file = path.basename(transcript.filePath);

  platform?.setRandomTraceEnabled?.(true);

  if (forceSpecs.length === 0 && pointSeeds.length === 0) {
    service?.clearForces();
    service?.setPointSeedOverrides({});
    return null;
  }

  if (!service) {
    return (
      `${file}: forces:/point-seed: need the platform engine ` +
      `(engine.getRandomService) to load session instruments (ADR-293 Phase C)`
    );
  }

  // A point-seed naming an undeclared point would be silently inert — the
  // typo trap D2's "a name is either a declared point or it does not exist"
  // exists to close. Same named-rejection class as an unknown force point.
  for (const { point } of pointSeeds) {
    if (!getPoint(point)) {
      return (
        `${file}:${config?.pointSeedsLineNumber ?? '?'}: point-seed: names unknown point ` +
        `'${point}' — no such point is declared (ADR-293 D2)`
      );
    }
  }

  service.clearForces();
  try {
    service.loadForces(forceSpecs);
  } catch (e) {
    // Name-based fallback: a dual-loaded copy of core (CJS+ESM) would break
    // instanceof — the same hazard the catalog's Symbol.for anchor guards.
    const isLoadError =
      e instanceof RandomForceLoadError ||
      (e instanceof Error &&
        ['DuplicateForceKeyError', 'UnknownForcePointError', 'UndeclaredForceClassError'].includes(e.name));
    if (isLoadError) {
      return `${file}:${config?.forcesLineNumber ?? '?'}: ${(e as Error).message}`;
    }
    throw e;
  }
  service.setPointSeedOverrides(
    Object.fromEntries(pointSeeds.map((entry) => [entry.point, entry.seed]))
  );
  return null;
}

/**
 * The unfired-`once`-force check (D9 / AC-9): every transcript force is mode
 * `once` and must have fired by end of run. Returns the error message naming
 * each unfired force, or null when all fired (or none were declared).
 */
function unfiredForceError(transcript: Transcript, engine: GameEngine): string | null {
  const forceSpecs = transcript.config?.forceSpecs ?? [];
  if (forceSpecs.length === 0) return null;
  const service = engine.engine?.getRandomService?.();
  if (!service) return null;

  const unfired = service
    .getForceReport()
    .filter((status) => status.spec.mode === 'once' && status.fireCount === 0);
  if (unfired.length === 0) return null;

  const names = unfired
    .map((status) => `${forceKey(status.spec)}=${status.spec.cls}`)
    .join(', ');
  return (
    `unfired once force(s): ${names} — a force that has not fired by the end of the ` +
    `run is a hard error (ADR-293 D9)`
  );
}

/** A failed synthetic result for the unfired-force check (D9). */
function forcesFailResult(transcript: Transcript, error: string): CommandResult {
  return {
    command: {
      lineNumber: transcript.config?.forcesLineNumber ?? 0,
      input: 'forces:',
      expectedOutput: [],
      assertions: []
    },
    actualOutput: '',
    actualEvents: [],
    passed: false,
    expectedFailure: false,
    skipped: false,
    assertionResults: [],
    error
  };
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
  /** Opening assertions run once, after the first command flushes the opening. */
  let openingChecked = (transcript.opening?.length ?? 0) === 0;

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
        results.push(directiveFailResult(item.directive!, error));
        break;
      }
      continue;
    }

    const command = item.command!;

    // The tier boundary (D2): with no recording, a command must assert
    // something — a bare command list is bless material, not a passing test.
    if (command.assertions.length === 0) {
      results.push({
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

    const result = await runCommand(command, engine, options);
    options.coverage?.collectFrom(engine.lastEvents);

    // The banner and the prologue are said on the way to the first command, so
    // that is the turn whose capture carries them. Checked once, and reported
    // ahead of the command that flushed them because that is where they read.
    if (!openingChecked) {
      openingChecked = true;
      results.push(openingResult(transcript.opening!, engine));
    }

    results.push(result);

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
      results.push(forcesFailResult(transcript, unfired));
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
    duration: Date.now() - startTime,
    tier: 'assertion'
  };
}

// ============================================================================
// Directives ($save / $restore / ext-testing) — shared by both tiers
// ============================================================================

/**
 * Execute one directive. Returns an error message on failure, null on
 * success. GOAL markers are structural and always succeed.
 */
async function executeDirective(
  directive: Directive,
  engine: GameEngine,
  options: RunnerOptions
): Promise<string | null> {
  switch (directive.type) {
    case 'goal':
    case 'end_goal':
      return null;

    case 'save': {
      if (!engine.world || !directive.saveName) {
        return 'SAVE requires world model and save name';
      }
      if (!engine.engine) {
        return 'SAVE requires the platform engine (game.engine) — the tester no longer writes world snapshots';
      }
      try {
        const savesDir = options.savesDirectory || './saves';
        if (!fs.existsSync(savesDir)) {
          fs.mkdirSync(savesDir, { recursive: true });
        }
        // The engine owns the save contents (real format: version, turn
        // counter, RNG stream states, plugin states); the hook only persists.
        const savePath = path.join(savesDir, `${directive.saveName}.json`);
        engine.engine.registerSaveRestoreHooks({
          onSaveRequested: async (data) => {
            fs.writeFileSync(savePath, JSON.stringify(data), 'utf-8');
          },
          onRestoreRequested: async () => null
        });
        const saved = await engine.engine.save();
        if (!saved) {
          return `Failed to save "${directive.saveName}"`;
        }
        if (options.verbose) console.log(`[$save ${directive.saveName}] → ${savePath}`);
      } catch (e) {
        return `Failed to save "${directive.saveName}": ${e instanceof Error ? e.message : String(e)}`;
      }
      return null;
    }

    case 'restore': {
      if (!engine.world || !directive.saveName) {
        return 'RESTORE requires world model and save name';
      }
      if (!engine.engine) {
        return 'RESTORE requires the platform engine (game.engine) — the tester no longer loads world snapshots';
      }
      try {
        const savesDir = options.savesDirectory || './saves';
        const savePath = path.join(savesDir, `${directive.saveName}.json`);
        if (!fs.existsSync(savePath)) {
          return `Save file not found: ${savePath}`;
        }
        const parsed = JSON.parse(fs.readFileSync(savePath, 'utf-8'));
        if (parsed.worldState !== undefined || parsed.version === undefined) {
          // Pre-ADR-293 tester snapshot ({ worldState, pluginStates }) — no
          // version, no RNG stream states. Never silently restored: stale
          // saves would replay with wrong randomness. Chains regenerate.
          return `Save "${directive.saveName}" is a legacy tester snapshot — delete it and re-run the chain that creates it`;
        }
        // The engine owns the restore (world, turn counter, RNG stream
        // states, plugin states — the real version reader runs here).
        engine.engine.registerSaveRestoreHooks({
          onSaveRequested: async () => { /* not used by $restore */ },
          onRestoreRequested: async () => parsed
        });
        const restored = await engine.engine.restore();
        if (!restored) {
          return `Failed to restore "${directive.saveName}"`;
        }
        if (options.verbose) console.log(`[$restore ${directive.saveName}] ← ${savePath}`);
      } catch (e) {
        return `Failed to restore "${directive.saveName}": ${e instanceof Error ? e.message : String(e)}`;
      }
      return null;
    }

    case 'test-command': {
      if (!directive.testCommand) {
        return 'Test command missing';
      }
      if (!options.testingExtension) {
        // Skipping silently reports a green transcript whose setup never ran.
        return (
          `Test command "${directive.testCommand}" needs ext-testing, ` +
          `but no testing extension was supplied to the runner`
        );
      }
      if (!engine.world) {
        return 'World model not available for test command';
      }
      try {
        const result = options.testingExtension.executeTestCommand(directive.testCommand, engine.world);
        if (options.verbose) {
          for (const line of result.output) console.log(`  ${line}`);
        }
        if (!result.success) {
          return result.error || `Test command failed: ${directive.testCommand}`;
        }
      } catch (e) {
        return `Test command error: ${e instanceof Error ? e.message : String(e)}`;
      }
      return null;
    }
  }
}

/** A failed synthetic result for a directive (D5 — recorded, never swallowed). */
function directiveFailResult(directive: Directive, error: string): CommandResult {
  const label =
    directive.type === 'save' ? `$save ${directive.saveName}` :
    directive.type === 'restore' ? `$restore ${directive.saveName}` :
    directive.type === 'test-command' ? directive.testCommand! :
    `[${directive.type.toUpperCase()}]`;
  return {
    command: {
      lineNumber: directive.lineNumber,
      input: label,
      expectedOutput: [],
      assertions: []
    },
    actualOutput: '',
    actualEvents: [],
    passed: false,
    expectedFailure: false,
    skipped: false,
    assertionResults: [],
    error
  };
}

/** An error-status result: the transcript never (fully) ran. */
function errorResult(
  transcript: Transcript,
  startTime: number,
  message: string,
  tier?: 'golden' | 'assertion',
  goldenPath?: string
): TranscriptResult {
  return {
    transcript,
    commands: [],
    status: 'error',
    passed: 0,
    failed: 0,
    expectedFailures: 0,
    skipped: 0,
    duration: Date.now() - startTime,
    errorMessage: message,
    tier,
    goldenPath
  };
}

// ============================================================================
// Assertion-tier command execution
// ============================================================================

/**
 * Run a single command and check assertions
 */
async function runCommand(
  command: TranscriptCommand,
  engine: GameEngine,
  options: RunnerOptions
): Promise<CommandResult> {
  // [SKIP]/[TODO] commands still execute below — they advance world state
  // (ADR-294 D2: "output is deliberately not asserted", not "command is not
  // run"); only assertion evaluation is bypassed, after execution.
  const skipAssertion = command.assertions.find(a => a.type === 'skip' || a.type === 'todo');

  // Execute the command
  let actualOutput: string;
  let actualEvents: TestEventInfo[] = [];
  let error: string | undefined;

  try {
    const result = await engine.executeCommand(command.input);
    actualOutput = typeof result === 'string' ? result : (engine.getOutput?.() || '');

    // A stopped engine (player death ended the game) surfaces as this exact
    // captured output rather than a throw (the bootstrap layer catches it).
    if (actualOutput === 'Error: Engine is not running') {
      error = 'Engine is not running';
    }

    // Capture events from the engine (filter out system.* debug events)
    if (engine.lastEvents) {
      actualEvents = engine.lastEvents
        .filter(e => !e.type.startsWith('system.'))
        .map(e => {
          const eventInfo: TestEventInfo = {
            type: e.type,
            data: e.data || {}
          };
          if (options.emitTraits && engine.world) {
            const snapshots = captureEntityTraits(e.data || {}, engine.world);
            if (snapshots.length > 0) {
              eventInfo.entityTraits = snapshots;
            }
          }
          return eventInfo;
        });
    }
  } catch (e) {
    actualOutput = '';
    error = e instanceof Error ? e.message : String(e);
  }

  // [SKIP]/[TODO]: the command has executed and advanced state; no assertion
  // is evaluated. An engine error during the skipped turn still fails.
  if (skipAssertion) {
    if (error) {
      return {
        command,
        actualOutput,
        actualEvents,
        passed: false,
        expectedFailure: false,
        skipped: false,
        assertionResults: [{
          assertion: skipAssertion,
          passed: false,
          message: `Engine error during skipped command: ${error}`
        }],
        error
      };
    }
    return {
      command,
      actualOutput,
      actualEvents,
      passed: true,
      expectedFailure: false,
      skipped: true,
      assertionResults: [{
        assertion: skipAssertion,
        passed: true,
        message: skipAssertion.reason || 'Skipped'
      }]
    };
  }

  // Normalize output for comparison
  const normalizedActual = normalizeOutput(actualOutput);
  const normalizedExpected = normalizeOutput(command.expectedOutput.join('\n'));

  // Blank output is always a failure — every command should produce output
  if (!normalizedActual && !error) {
    return {
      command,
      actualOutput,
      actualEvents,
      passed: false,
      expectedFailure: false,
      skipped: false,
      assertionResults: [{
        assertion: { type: 'ok-contains' as const, value: '(any output)' },
        passed: false,
        message: 'Blank output — command produced no visible text'
      }],
      error: 'blank output'
    };
  }

  // Check all assertions
  const assertionResults: AssertionResult[] = [];
  let allPassed = true;

  for (const assertion of command.assertions) {
    const result = checkAssertion(assertion, normalizedActual, normalizedExpected, actualEvents, engine.world, engine.lastChannelValues);
    assertionResults.push(result);
    if (!result.passed) {
      allPassed = false;
    }
  }

  // Check for expected failure
  const failAssertion = command.assertions.find(a => a.type === 'fail');
  const expectedFailure = failAssertion !== undefined;

  // For [FAIL] assertions, invert the logic
  if (expectedFailure) {
    return {
      command,
      actualOutput,
      actualEvents,
      passed: !allPassed,  // Pass if assertions failed (as expected)
      expectedFailure: true,
      skipped: false,
      assertionResults,
      error
    };
  }

  return {
    command,
    actualOutput,
    actualEvents,
    passed: allPassed && !error,
    expectedFailure: false,
    skipped: false,
    assertionResults,
    error
  };
}

/**
 * Check a single assertion against actual output, events, and world state
 */
function checkAssertion(
  assertion: Assertion,
  actualOutput: string,
  expectedOutput: string,
  events: TestEventInfo[],
  world?: WorldModel,
  channels?: Record<string, unknown[]>
): AssertionResult {
  switch (assertion.type) {
    case 'ok': {
      // Exact match (after normalization). ADR-287 D1: when a text block is present
      // it supplies the expected text in place of the classic expected-output
      // block — the parser guarantees a command never carries both.
      const expected = assertion.block
        ? normalizeOutput(assertion.block.join("\n"))
        : expectedOutput;
      const matches = actualOutput === expected;
      return {
        assertion,
        passed: matches,
        message: matches ? undefined : `Output did not match expected`
      };
    }

    case 'ok-contains': {
      // ADR-287 D1: a block fragment may span lines, so it is normalized the
      // same way the actual output is. The INLINE form matches its raw value.
      const fragment = assertion.block
        ? normalizeOutput(assertion.block.join("\n"))
        : assertion.value!;
      const contains = actualOutput.toLowerCase().includes(fragment.toLowerCase());
      return {
        assertion,
        passed: contains,
        message: contains
          ? undefined
          : assertion.block
            ? "Output does not contain the text block fragment"
            : `Output does not contain "${assertion.value}"`
      };
    }

    case 'ok-not-contains': {
      const notContains = !actualOutput.toLowerCase().includes(assertion.value!.toLowerCase());
      return {
        assertion,
        passed: notContains,
        message: notContains ? undefined : `Output should not contain "${assertion.value}"`
      };
    }

    case 'channel-contains':
    case 'channel-not-contains':
    case 'channel-is':
    case 'channel-is-not':
    case 'channel-absent':
    case 'channel-present':
      // ADR-300 D13: dotted paths into records, list any-element matching,
      // typed comparison, and absence as a claim. Evaluated against the
      // STRUCTURED capture — a flattened line cannot answer `banner.title`.
      return checkChannelAssertion(assertion, channels);

    case 'fail':
      // This is handled at the command level
      return {
        assertion,
        passed: false,
        message: assertion.reason
      };

    case 'skip':
    case 'todo':
      return {
        assertion,
        passed: true,
        message: assertion.reason
      };

    case 'event-assert': {
      return checkEventAssertion(assertion, events);
    }

    case 'state-assert': {
      return checkStateAssertion(assertion, world);
    }

    default:
      return {
        assertion,
        passed: false,
        message: `Unknown assertion type: ${(assertion as Assertion).type}`
      };
  }
}

/**
 * Check an event assertion (assertTrue/assertFalse for event existence/properties)
 */
function checkEventAssertion(assertion: Assertion, events: TestEventInfo[]): AssertionResult {
  const { assertTrue, eventPosition, eventType, eventData } = assertion;

  const eventMatches = (event: TestEventInfo): boolean => {
    if (event.type !== eventType) return false;
    if (eventData) {
      for (const [key, value] of Object.entries(eventData)) {
        if (event.data[key] !== value) return false;
      }
    }
    return true;
  };

  let found = false;

  if (eventPosition !== undefined) {
    // Check specific position (1-based)
    const index = eventPosition - 1;
    if (index >= 0 && index < events.length) {
      found = eventMatches(events[index]);
    }
  } else {
    found = events.some(eventMatches);
  }

  const passed = assertTrue ? found : !found;

  let message: string | undefined;
  if (!passed) {
    if (assertTrue) {
      if (eventPosition !== undefined) {
        const actualAtPos = events[eventPosition - 1];
        if (actualAtPos) {
          message = `Event ${eventPosition}: expected ${eventType}, got ${actualAtPos.type}`;
          if (eventData) {
            message += `. Expected data: ${JSON.stringify(eventData)}, got: ${JSON.stringify(actualAtPos.data)}`;
          }
        } else {
          message = `Event ${eventPosition}: position out of range (${events.length} events total)`;
        }
      } else {
        message = `No event matching ${eventType}`;
        if (eventData) {
          message += ` with ${JSON.stringify(eventData)}`;
        }
        message += `. Events: ${events.map(e => e.type).join(', ')}`;
      }
    } else {
      message = `Event ${eventType} should not exist but was found`;
      if (eventData) {
        message += ` with matching data ${JSON.stringify(eventData)}`;
      }
    }
  }

  return { assertion, passed, message };
}

/**
 * Check a state assertion against the world model
 */
function checkStateAssertion(assertion: Assertion, world?: WorldModel): AssertionResult {
  const { assertTrue, stateExpression } = assertion;

  if (!world) {
    return {
      assertion,
      passed: false,
      message: 'World model not available for state assertions'
    };
  }

  if (!stateExpression) {
    return {
      assertion,
      passed: false,
      message: 'No state expression provided'
    };
  }

  try {
    const result = evaluateStateExpression(stateExpression, world);
    const passed = assertTrue ? result.matches : !result.matches;

    let message: string | undefined;
    if (!passed) {
      if (assertTrue) {
        message = `State assertion failed: ${stateExpression}. ${result.details || ''}`;
      } else {
        message = `State assertion should be false but was true: ${stateExpression}`;
      }
    }

    return { assertion, passed, message };
  } catch (e) {
    return {
      assertion,
      passed: false,
      message: `Error evaluating state expression: ${e instanceof Error ? e.message : String(e)}`
    };
  }
}

/**
 * Evaluate a state expression against the world model
 * Supports: entity.property = value, entity.property != value,
 *           collection contains item, collection not-contains item
 */
function evaluateStateExpression(
  expression: string,
  world: WorldModel
): { matches: boolean; details?: string } {
  // Parse "entity.property = value" or "entity.property != value"
  const equalityMatch = expression.match(/^(\w+)\.(\w+)\s*(=|!=)\s*(.+)$/);
  if (equalityMatch) {
    const [, entityName, property, operator, expectedValue] = equalityMatch;

    const entity = findEntity(entityName, world);
    if (!entity) {
      return { matches: false, details: `Entity "${entityName}" not found` };
    }

    const actualValue = getEntityProperty(entity, property, world);
    const expectedResolved = resolveValue(expectedValue.trim(), world);

    const isEqual = actualValue === expectedResolved ||
                    (actualValue?.id && actualValue.id === expectedResolved) ||
                    (typeof expectedResolved === 'string' && actualValue?.id === expectedResolved);

    if (operator === '=') {
      return {
        matches: isEqual,
        details: isEqual ? undefined : `${entityName}.${property} is "${actualValue?.id || actualValue}", expected "${expectedResolved}"`
      };
    } else {
      return {
        matches: !isEqual,
        details: !isEqual ? undefined : `${entityName}.${property} should not be "${expectedResolved}"`
      };
    }
  }

  // Parse "collection contains item" or "collection not-contains item"
  const containsMatch = expression.match(/^(\w+)\.(\w+)\s+(contains|not-contains)\s+(.+)$/);
  if (containsMatch) {
    const [, entityName, property, operator, itemName] = containsMatch;

    const entity = findEntity(entityName, world);
    if (!entity) {
      return { matches: false, details: `Entity "${entityName}" not found` };
    }

    const collection = getEntityProperty(entity, property, world);
    if (!Array.isArray(collection)) {
      return { matches: false, details: `${entityName}.${property} is not a collection` };
    }

    const item = findEntity(itemName.trim(), world);
    const itemId = item?.id || itemName.trim();
    const hasItem = collection.some((c: any) => c === itemId || c?.id === itemId);

    if (operator === 'contains') {
      return { matches: hasItem, details: hasItem ? undefined : `${entityName}.${property} does not contain "${itemName}"` };
    } else {
      return { matches: !hasItem, details: !hasItem ? undefined : `${entityName}.${property} should not contain "${itemName}"` };
    }
  }

  return { matches: false, details: `Could not parse expression: ${expression}` };
}

/**
 * Find an entity by name in the world model.
 *
 * `player` is a reserved word that always resolves to the player entity via
 * `world.getPlayer()`, regardless of what the story named it. Otherwise
 * entities match by name, by id, by their IdentityTrait name, or by any of
 * their IdentityTrait aliases.
 */
function findEntity(name: string, world: WorldModel): any {
  // Reserved word: the player, whatever the story named it.
  if (name === 'player' && world.getPlayer) {
    const player = world.getPlayer();
    if (player) return player;
  }

  if (world.findEntityByName) {
    const entity = world.findEntityByName(name);
    if (entity) return entity;
  }

  if (world.getEntity) {
    const entity = world.getEntity(name);
    if (entity) return entity;
  }
  if (world.getEntityById) {
    const entity = world.getEntityById(name);
    if (entity) return entity;
  }

  if (world.getAllEntities) {
    const entities = world.getAllEntities();
    for (const entity of entities) {
      if (entity.name === name || entity.id === name) return entity;
      const identity =
        entity.get?.('identity') ?? entity.traits?.get?.('identity') ?? entity.traits?.identity;
      if (identity) {
        if (identity.name === name) return entity;
        if (identity.aliases?.includes(name)) return entity;
      }
    }
  }

  return null;
}

/**
 * Get a property from an entity (world needed for spatial queries)
 */
function getEntityProperty(entity: any, property: string, world?: WorldModel): any {
  if (property === 'location') {
    if (world?.getLocation) {
      return world.getLocation(entity.id);
    }
    return entity.location || entity.containerId;
  }

  if (property === 'contents' || property === 'inventory') {
    if (world?.getContents) {
      return world.getContents(entity.id);
    }
    return entity.contents || entity.inventory || [];
  }

  if (property in entity) {
    return entity[property];
  }

  if (entity.traits && property in entity.traits) {
    return entity.traits[property];
  }

  return undefined;
}

/**
 * Resolve a value (could be entity name, literal, etc.)
 */
function resolveValue(value: string, world: WorldModel): any {
  const entity = findEntity(value, world);
  if (entity) {
    return entity.id;
  }

  if (value === 'null' || value === 'undefined' || value === 'nowhere') {
    return undefined;
  }
  if (value === 'true') return true;
  if (value === 'false') return false;

  return value;
}

/**
 * Recursively collect all string values from a data structure.
 */
function collectStrings(value: unknown, out: string[]): void {
  if (typeof value === 'string') {
    out.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out);
  } else if (value && typeof value === 'object') {
    for (const v of Object.values(value)) collectStrings(v, out);
  }
}

/**
 * Extract entity IDs from event data values and capture their trait snapshots.
 */
function captureEntityTraits(data: Record<string, any>, world: WorldModel): EntityTraitSnapshot[] {
  const candidates: string[] = [];
  collectStrings(data, candidates);

  const seen = new Set<string>();
  const snapshots: EntityTraitSnapshot[] = [];

  for (const value of candidates) {
    if (seen.has(value)) continue;
    seen.add(value);

    const entity = world.getEntity?.(value) ?? world.getEntityById?.(value);
    if (!entity) continue;

    const traits: Record<string, Record<string, any>> = {};

    const entityTraits = entity.getTraits?.() ?? (entity.traits instanceof Map ? Array.from(entity.traits.values()) : []);
    for (const trait of entityTraits) {
      const traitData: Record<string, any> = {};
      for (const [key, val] of Object.entries(trait)) {
        if (key === 'type') continue;
        traitData[key] = val;
      }
      traits[trait.type] = traitData;
    }

    if (Object.keys(traits).length > 0) {
      snapshots.push({ entityId: value, traits });
    }
  }

  return snapshots;
}

/**
 * Normalize output for assertion-tier comparison
 * - Trim whitespace
 * - Normalize line endings
 */
function normalizeOutput(output: string): string {
  return output
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    .trim();
}
