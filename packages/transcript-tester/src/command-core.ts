/**
 * command-core.ts — per-command execution shared by both testing runtimes
 * (ADR-340 D1).
 *
 * The transcript runner and the tree runner each own their loop (which
 * commands run, in what order, how the opening is checked) and share
 * everything one command needs: session instruments from the header
 * (ADR-293 Phase C), directives (`$save`/`$restore`/test commands), running a
 * command and evaluating its claims through `assertion-core`, and the
 * synthetic results a failure produces. Node-bound: `$save`/`$restore` write
 * files, so this module is reached through the package barrel, never from
 * the browser.
 *
 * Public interface: `runCommand`, `executeDirective`,
 * `configureRandomInstruments`, `unfiredForceError`, `forcesFailResult`,
 * `directiveFailResult`, `errorResult`, `endingFrom`, `worldEntityRef`,
 * `captureWorldSnapshot`; the `GameEngine` and `PlatformRandomService`
 * seams.
 * Owner context: transcript-tester (testing tooling) — the home of the
 * assertion core; branch-tester imports it and carries no copy (D3).
 *
 * References: ADR-340 D1/D3, ADR-293 Phase C (instruments), ADR-294 D2/D5
 * (the assertion boundary, failed directives), ADR-307 R3/R4/R9 (the tree
 * world's turn, ending, and world snapshot).
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
import type {
  Transcript,
  TranscriptCommand,
  Directive,
  AutoAssertionPolicy,
  CommandResult,
  AssertionResult,
  TranscriptResult,
  RunnerOptions,
  TestEventInfo,
  WorldEntityRef,
  WorldSnapshot
} from './types.js';
import {
  captureEntityTraits,
  checkAssertion,
  normalizeOutput,
  synthesizePolicyAssertions,
  type WorldModel,
} from './assertion-core.js';

/**
 * Interface for the game engine wrapper the CLIs hand the runner.
 */
export interface GameEngine {
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
   * the file lives, never WHAT is in it. Golden provenance reads the
   * session's master seed from here (ADR-294 D3).
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
export interface PlatformRandomService {
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
 *
 * @param transcript the transcript whose header declares the instruments
 * @param engine the engine wrapper; its platform engine owns the streams
 * @returns an error message, or null on success
 */
export function configureRandomInstruments(
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
 *
 * @param transcript the transcript that declared the forces
 * @param engine the engine wrapper whose platform engine reports them
 * @returns the error message, or null
 */
export function unfiredForceError(transcript: Transcript, engine: GameEngine): string | null {
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

/**
 * A failed synthetic result for the unfired-force check (D9).
 *
 * @param transcript the transcript, for the `forces:` line number
 * @param error the unfired-force message
 * @returns a command result carrying the error, never passed
 */
export function forcesFailResult(transcript: Transcript, error: string): CommandResult {
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
// Directives ($save / $restore / ext-testing)
// ============================================================================

/**
 * Execute one directive. GOAL markers are structural and always succeed;
 * `$save`/`$restore` go through the platform engine's real save format
 * (ADR-293 D7); `test-command` needs ext-testing.
 *
 * @param directive the parsed directive
 * @param engine the engine wrapper
 * @param options saves directory, testing extension, verbosity
 * @returns an error message on failure, null on success
 */
export async function executeDirective(
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

/**
 * A failed synthetic result for a directive (D5 — recorded, never swallowed).
 *
 * @param directive the directive that failed
 * @param error its error message
 * @returns a command result labelled with the directive, never passed
 */
export function directiveFailResult(directive: Directive, error: string): CommandResult {
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

/**
 * An error-status result: the transcript never (fully) ran.
 *
 * @param transcript the transcript
 * @param startTime when the run began, for the duration
 * @param message what stopped it
 * @param tier the golden tier's tier, when it is the caller (ADR-294 D2)
 * @param goldenPath the recording path, when the golden tier is the caller
 * @returns a `status: 'error'` result with zero counts
 */
export function errorResult(
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
    ...(tier !== undefined ? { tier } : {}),
    ...(goldenPath !== undefined ? { goldenPath } : {})
  };
}

// ============================================================================
// Command execution
// ============================================================================

/**
 * Run one command against the engine and evaluate its assertions.
 *
 * `[SKIP]`/`[TODO]` commands still execute (ADR-294 D2: output not asserted,
 * command still run). The turn number, the story ending, and — under
 * `captureWorld` — a world snapshot ride the result for the tree world
 * (ADR-307 R3/R4/R9); a transcript-world caller never reads them.
 *
 * @param command the command to run
 * @param engine the engine wrapper
 * @param options runner options; `storyStateKeys` reaches the state evaluator
 * @param synthesize the auto-assertion policy, when the command arrived bare
 * @returns the command's result
 */
export async function runCommand(
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
    // The structured capture is the evaluator's input (ADR-300 D13). A seam
    // that captured only flattened lines passes those as the values — the
    // two legacy `contains` kinds evaluate identically over strings.
    const result = checkAssertion(
      assertion, normalizedActual, normalizedExpected, actualEvents, engine.world,
      engine.lastChannelValues ?? engine.lastChannels, options.storyStateKeys
    );
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
 * The story ending the engine announced during the command that just executed,
 * read off the same per-command event capture both tiers already consume.
 *
 * Exactly ONE place maps `game.ended` to `CommandResult.ending` (R9), so the
 * exclusions live here and nowhere else: `restart` is not an ending — the
 * engine stops but the harness reboots the story within the same command;
 * `abort` is not an ending — it is a runtime failure the result already
 * carries as `error`. Returns undefined when the story did not end this turn
 * or the engine seam does not expose events.
 *
 * @param engine the engine wrapper, after a command ran
 * @returns the ending, or undefined
 */
export function endingFrom(engine: GameEngine): CommandResult['ending'] {
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
 *
 * @param entity a world entity
 * @returns its display name and its round-trippable token
 */
export function worldEntityRef(entity: any): WorldEntityRef {
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
 *
 * @param engine anything with a `world` seam
 * @returns the snapshot, or undefined
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
