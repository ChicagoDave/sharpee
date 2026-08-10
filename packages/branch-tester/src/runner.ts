/**
 * Transcript Runner — assertion-tier execution (ADR-294, golden tier
 * retired by ADR-306: the author world's regression baseline is the tree
 * passing, with byte-strength claims per-turn via `[OK]` blocks).
 *
 * Every transcript runs the per-command assertion DSL. Any failed directive
 * fails the transcript unconditionally (D5) — `--stop-on-failure` only ever
 * controls whether the RUN continues to other transcripts.
 *
 * Public interface: `runTranscript`. Owner context: branch-tester
 * (testing tooling).
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  getPoint,
  forceKey,
  type RandomForceSpec,
  type RandomForceStatus,
  RandomForceLoadError
} from '@sharpee/core';
import {
  Transcript,
  TranscriptCommand,
  Directive,
  Assertion,
  AutoAssertionPolicy,
  CommandResult,
  AssertionResult,
  TranscriptResult,
  RunnerOptions,
  TestEventInfo,
  EntityTraitSnapshot,
  WorldEntityRef,
  WorldSnapshot
} from './types.js';
import {
  proseTextLinesOf,
  synthesizeOpeningAssertions,
  synthesizePolicyAssertions,
} from './auto-assertion.js';
import { serializeTranscript } from './serializer.js';
import { checkChannelAssertion, channelsReferencedBy } from './channel-assert.js';

/**
 * Interface for the game engine wrapper the CLIs hand the runner.
 */
interface GameEngine {
  executeCommand(input: string): Promise<string> | string;
  getOutput?(): string;
  lastEvents?: Array<{ type: string; data?: any }>;
  /**
   * The engine's own record of the last executed turn — bootstrap's
   * `LoadedGame` sets it after every `executeCommand`. The runner reads only
   * `turn`: the 1-based counter the command executed as, which is engine
   * knowledge (meta commands share a turn, refused actions consume one) and
   * rides each `CommandResult` for the IDE's turn-budget view (R4).
   */
  lastTurnResult?: { turn: number } | null;
  /**
   * The story's `auto-assertion:` policy (Phase 6e, #253), read off the
   * loaded game — bootstrap sets it from `story.config.autoAssertion`.
   * Consulted only at the assertion tier's D2 boundary; absent = "let me
   * decide" (the boundary failure stands).
   */
  autoAssertionPolicy?: AutoAssertionPolicy;
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
   * flattened-line consumer reads `lastChannels`. A flattened line cannot
   * be un-flattened, which is why both exist.
   */
  lastChannelValues?: Record<string, unknown[]>;
  /** Channel values captured during BOOT (banner, prologue) — the opening's
   *  claims read these; per-command resets never see them (bootstrap D-note,
   *  David 2026-08-09). */
  bootChannelValues?: Record<string, unknown[]>;
  world?: WorldModel;
  /**
   * The underlying platform engine. $save/$restore go through its real
   * save format (version, turn counter, RNG stream states — ADR-293 D7)
   * rather than a hand-rolled world snapshot; the tester owns only WHERE
   * the file lives, never WHAT is in it.
   */
  engine?: {
    /**
     * Registration MERGES on the real engine and every hook is optional
     * (issue #229), so this declares the loosest shape that still says what
     * the tester uses. It compiles either way here — this seam passes through
     * a cast — but the declaration was making a claim about the engine that
     * stopped being true, and v1 broke on exactly that.
     */
    registerSaveRestoreHooks(hooks: {
      onSaveRequested?(data: any): Promise<void>;
      onRestoreRequested?(): Promise<any>;
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

  return runAssertion(transcript, engine, options, startTime);
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
    checkAssertion(assertion, openingOutput, '', [], engine.world, openingChannels)
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

/**
 * The story ending the engine announced during the command that just executed,
 * read off the same per-command event capture both tiers already consume.
 *
 * Exactly ONE place maps `game.ended` to `CommandResult.ending` (R9), so the
 * exclusions live here and nowhere else: `restart` is not an ending — the
 * engine stops but the harness reboots the story within the same command;
 * `abort` is not an ending — it is a runtime failure the result already
 * carries as `error`. Returns undefined when the story did not end this turn
 * or the engine seam does not expose events.
 */
function endingFrom(engine: GameEngine): CommandResult['ending'] {
  const ended = engine.lastEvents?.find((e) => e.type === 'game.ended');
  const type = (ended?.data as { ending?: { type?: string } } | undefined)?.ending?.type;
  return type === 'victory' || type === 'defeat' || type === 'quit' ? type : undefined;
}

/**
 * One entity as a snapshot names it (R3): the display name, and the single
 * whitespace-free token the `[STATE:]` evaluator's own `findEntity` resolves
 * back to this entity — an alias when one qualifies, the identity name or the
 * entity's own name when they are single tokens, else the id (which always
 * resolves). The runner picks the token because only the runner can vouch for
 * the round-trip; a consumer that emitted `name` instead would trip the
 * single-token parse rule R3 exists to bury.
 */
function worldEntityRef(entity: any): WorldEntityRef {
  const identity =
    entity.get?.('identity') ?? entity.traits?.get?.('identity') ?? entity.traits?.identity;
  const name: string = identity?.name ?? entity.name ?? entity.id;
  const singleToken = (value: unknown): value is string =>
    typeof value === 'string' && value.length > 0 && !/\s/.test(value);
  const aliasToken = (identity?.aliases as unknown[] | undefined)?.find(singleToken);
  const token = aliasToken ?? (singleToken(name) ? name : entity.id);
  return { name, token };
}

/**
 * The world as it stands right now (R3/R5): player location and inventory,
 * through the same structural seam the `[STATE:]` evaluator reads. Undefined
 * when the seam has no world or no player — absent, never guessed, like every
 * other optional fact on the wire.
 */
export function captureWorldSnapshot(engine: { world?: WorldModel }): WorldSnapshot | undefined {
  const world = engine.world;
  const player = world?.getPlayer?.();
  if (!world || !player) return undefined;
  const locationId = world.getLocation?.(player.id);
  const location = locationId
    ? (world.getEntity?.(locationId) ?? world.getEntityById?.(locationId))
    : undefined;
  const inventory = (world.getContents?.(player.id) ?? []).map(worldEntityRef);
  return {
    ...(location ? { location: worldEntityRef(location) } : {}),
    inventory,
  };
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
    options.coverage?.collectFrom(engine.lastEvents);

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

  // Phase 6e (#253): the policy's writes land in the FILE — the runner
  // mutated the parsed transcript in memory (assertions pushed onto bare
  // commands); one serialize makes disk agree. The serializer round-trips
  // comments and formatting, so untouched content survives byte-for-byte.
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
    duration: Date.now() - startTime
  };
}

// ============================================================================
// Directives ($save / $restore / ext-testing)
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
  message: string
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
    errorMessage: message
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
  options: RunnerOptions,
  /**
   * Phase 6e (#253): the command arrived bare and the story declares this
   * `auto-assertion:` policy — after execution, synthesize the policy's
   * assertions from the turn's REAL output, push them onto the command, and
   * evaluate them through the normal loop.
   */
  synthesize?: AutoAssertionPolicy
): Promise<CommandResult> {
  // [SKIP]/[TODO] commands still execute below — they advance world state
  // (ADR-294 D2: "output is deliberately not asserted", not "command is not
  // run"); only assertion evaluation is bypassed, after execution.
  let skipAssertion = command.assertions.find(a => a.type === 'skip' || a.type === 'todo');

  // Execute the command
  let actualOutput: string;
  let actualEvents: TestEventInfo[] = [];
  let error: string | undefined;
  let turn: number | undefined;
  let ending: CommandResult['ending'];
  let world: WorldSnapshot | undefined;

  try {
    const result = await engine.executeCommand(command.input);
    // The turn this command executed as, read off the engine's own record of
    // the turn it just ran (R4). Meta commands legitimately repeat the number.
    // Read HERE, not after the catch: production `executeCommand` never
    // throws (bootstrap catches internally and nulls `lastTurnResult`), but a
    // wrapper that DID throw would leave the previous command's record in
    // place — and a stale turn on a crashed command is a lie.
    turn = engine.lastTurnResult?.turn;
    // Same staleness argument for the ending: read inside the try, so a
    // throwing wrapper can never pin a previous command's ending here.
    ending = endingFrom(engine);
    // The world AFTER the command (R3), only when asked for. Inside the try
    // for the same reason: a crashed command gets no snapshot, not a stale one.
    if (options.captureWorld) world = captureWorldSnapshot(engine);
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

  // Phase 6e (#253): write the policy's assertions from what the turn really
  // said. Skipped on an engine error or blank output — both are failures in
  // their own right below, and a policy must never enshrine them as the
  // expected assertion. A policy with nothing to assert (a room policy on a
  // turn that emitted neither room channel) writes [SKIP]: "which emissions
  // get asserted — these; this command emitted none of them" is a deliberate
  // skip, distinguishable in the file from a command still awaiting its run.
  let autoAsserted = false;
  if (synthesize && !error && normalizeOutput(actualOutput)) {
    command.assertions.push(...synthesizePolicyAssertions(synthesize, actualOutput, engine.lastChannelValues));
    autoAsserted = true;
    skipAssertion = command.assertions.find(a => a.type === 'skip' || a.type === 'todo');
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
        error,
        ...(turn !== undefined ? { turn } : {}),
        ...(ending !== undefined ? { ending } : {}),
        ...(world !== undefined ? { world } : {})
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
      }],
      ...(autoAsserted ? { autoAsserted: true } : {}),
      ...(turn !== undefined ? { turn } : {}),
      ...(ending !== undefined ? { ending } : {}),
      ...(world !== undefined ? { world } : {})
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
      error: 'blank output',
      ...(turn !== undefined ? { turn } : {}),
      ...(ending !== undefined ? { ending } : {}),
      ...(world !== undefined ? { world } : {})
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
      error,
      ...(turn !== undefined ? { turn } : {}),
      ...(ending !== undefined ? { ending } : {}),
      ...(world !== undefined ? { world } : {})
    };
  }

  // The one-line answer a minimal consumer shows for this command: the
  // first failed assertion's own message, never re-derived downstream.
  const firstFailure = assertionResults.find(r => !r.passed && r.message)?.message;

  return {
    command,
    actualOutput,
    actualEvents,
    passed: allPassed && !error,
    expectedFailure: false,
    skipped: false,
    assertionResults,
    error,
    ...(!allPassed && firstFailure !== undefined ? { failure: firstFailure } : {}),
    ...(autoAsserted ? { autoAsserted: true } : {}),
    ...(turn !== undefined ? { turn } : {}),
    ...(ending !== undefined ? { ending } : {}),
    ...(world !== undefined ? { world } : {})
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
