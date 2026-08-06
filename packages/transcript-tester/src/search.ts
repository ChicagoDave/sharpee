/**
 * search.ts — first-firing outcome search with a measured budget (ADR-293 D12).
 *
 * Purpose: find a point-seed override (D11) under which a target point's first
 *   *drawn* firing produces a desired class, by forking the engine's real save
 *   state per candidate — never a subprocess (ruled Decision 5(a)), never a
 *   model of the engine (D12: "search executes the real engine").
 * Mechanics: the tool varies the TARGET POINT'S OWN STREAM, not the master
 *   seed — master-seed variation changes every stream and with it the firing
 *   schedule, which is exactly the degradation D12 warns about. A base pass
 *   replays the driver transcript's commands to locate the first drawn firing
 *   and capture the engine save just before its turn; each try restores that
 *   save, applies the candidate override, re-executes the one firing turn,
 *   and reads the trace. Force-prefix composition (D12) falls out of
 *   zero-draw forcing: a forced prefix never materializes the target stream,
 *   so the candidate override governs the first drawn firing. Limitation: a
 *   force prefix must complete in turns BEFORE the searched firing's turn —
 *   occurrence counters are session state and are not rolled back by restore.
 * Budget: 10 × declared class count by default (uniform prior — D12's ~10×
 *   inverse probability with p ≈ 1/classCount), caller-overridable per use;
 *   measured per use, never declared on the point.
 * Public interface: `searchOutcome`, `SearchTarget`, `SearchResult`.
 * Owner context: @sharpee/transcript-tester (testing tooling).
 */

import {
  getPoint,
  deriveStreamSeed,
  type IRandomTraceData,
  type RandomForceSpec
} from '@sharpee/core';
import type { Transcript } from './types.js';

/** The searched-for outcome: a declared point and one of its declared classes. */
export interface SearchTarget {
  point: string;
  cls: string;
}

/** Outcome of one search run (D12: tries-spent on success, named exhaustion on failure). */
export interface SearchResult {
  found: boolean;
  /** Attempts consumed, including the base pass as try 1. */
  tries: number;
  /** The budget the search ran under. */
  budget: number;
  /** The session's master seed — half of the reproducible artifact. */
  masterSeed: number;
  /**
   * On success: the `point-seed:` override that reproduces the outcome —
   * absent when the base pass already drew the target class naturally (the
   * natural derivation needs no override).
   */
  pointSeed?: number;
  /** 0-based index of the driver command whose turn fires the point. */
  firingCommandIndex?: number;
  /** On failure: why — 'budget-exhausted', 'never-fires', or a validation message. */
  reason?: string;
}

/** The engine-wrapper slice the search drives (same shape the runner uses). */
interface SearchEngine {
  executeCommand(input: string): Promise<string> | string;
  lastEvents?: Array<{ type: string; data?: unknown }>;
  engine?: {
    registerSaveRestoreHooks(hooks: {
      onSaveRequested(data: unknown): Promise<void>;
      onRestoreRequested(): Promise<unknown | null>;
    }): void;
    save(): Promise<boolean>;
    restore(): Promise<boolean>;
    getMasterSeed?(): number;
    getRandomService?(): {
      loadForces(specs: readonly RandomForceSpec[]): void;
      clearForces(): void;
      setPointSeedOverrides(overrides: Readonly<Record<string, number>>): void;
    };
    setRandomTraceEnabled?(enabled: boolean): void;
  };
}

/** Multiplier over the uniform-prior inverse probability (D12's "~ten times"). */
const BUDGET_MULTIPLIER = 10;

/**
 * Search the target point's stream for a candidate start under which its
 * first drawn firing produces `target.cls`, driving the world with the
 * transcript's commands.
 *
 * The driver transcript's own `forces:`/`point-seed:` instruments are
 * honored (D12's force-prefix-then-search-last composition); the candidate
 * override wins over a transcript `point-seed:` on the target itself.
 *
 * @param transcript - the parsed driver transcript (its commands walk the
 *   world to the firing; assertions and goldens are ignored)
 * @param engine - the loaded game (the REAL engine — D12)
 * @param target - point name and desired declared class
 * @param options - `budget` overrides the 10 × class-count default
 * @returns the search result; validation problems return `found: false` with
 *   a named `reason`, never a throw
 */
export async function searchOutcome(
  transcript: Transcript,
  engine: SearchEngine,
  target: SearchTarget,
  options: { budget?: number } = {}
): Promise<SearchResult> {
  const platform = engine.engine;
  const masterSeed = platform?.getMasterSeed?.() ?? -1;
  const service = platform?.getRandomService?.();

  const fail = (reason: string, tries = 0, budget = 0): SearchResult => ({
    found: false, tries, budget, masterSeed, reason
  });

  if (!platform || !service || !platform.setRandomTraceEnabled) {
    return fail('search needs the platform engine (getRandomService, setRandomTraceEnabled, save/restore)');
  }
  const point = getPoint(target.point);
  if (!point) {
    return fail(`unknown point '${target.point}' — no such point is declared (ADR-293 D2)`);
  }
  if (!point.classes || point.classes.length === 0) {
    return fail(`'${target.point}' is a plain draw — it declares no classes to search for (ADR-293 D4)`);
  }
  if (!point.classes.includes(target.cls)) {
    return fail(
      `'${target.point}' does not declare class '${target.cls}' (declared: ${point.classes.join(', ')})`
    );
  }

  const budget = options.budget ?? BUDGET_MULTIPLIER * point.classes.length;
  const commands = transcript.commands.map((c) => c.input);
  if (commands.length === 0) {
    return fail('the driver transcript has no commands');
  }

  // Session instruments from the driver's own header (composition, D12).
  const transcriptOverrides = Object.fromEntries(
    (transcript.config?.pointSeeds ?? []).map((entry) => [entry.point, entry.seed])
  );
  platform.setRandomTraceEnabled(true);
  service.clearForces();
  service.loadForces(transcript.config?.forceSpecs ?? []);
  service.setPointSeedOverrides(transcriptOverrides);

  /** Trace records of the target point from the last executed command. */
  const targetFirings = (): IRandomTraceData[] =>
    (engine.lastEvents ?? [])
      .filter((e) => e.type === 'system.draw')
      .map((e) => e.data as IRandomTraceData)
      .filter((d) => d && d.point === target.point);

  // ── Base pass: locate the first DRAWN firing, capturing the engine save
  // just before its turn. Counts as try 1 — the natural draw is an attempt.
  let preFiringSave: unknown = null;
  let firingCommandIndex = -1;
  for (let index = 0; index < commands.length; index++) {
    const save = await captureSave(platform);
    try {
      await engine.executeCommand(commands[index]);
    } catch (e) {
      return fail(
        `driver command "${commands[index]}" threw: ${e instanceof Error ? e.message : String(e)}`,
        1,
        budget
      );
    }
    const drawnFiring = targetFirings().find((d) => d.provenance === 'drawn');
    if (drawnFiring) {
      if (drawnFiring.cls === target.cls) {
        return { found: true, tries: 1, budget, masterSeed, firingCommandIndex: index };
      }
      preFiringSave = save;
      firingCommandIndex = index;
      break;
    }
  }
  if (firingCommandIndex === -1) {
    return fail(
      `'${target.point}' never fires (drawn) under this command sequence — ` +
        `the schedule, not the stream, decides whether a point is reached (D12)`,
      1,
      budget
    );
  }
  if (preFiringSave === null) {
    return fail('could not capture the pre-firing engine save', 1, budget);
  }

  // ── Candidate loop: fork the real save per try (Decision 5(a) — in-process,
  // ~ms per try), override only the target's stream, re-execute the one
  // firing turn. Candidates derive from the frozen mix — deterministic and
  // clock-free, so a search is itself reproducible.
  for (let attempt = 2; attempt <= budget; attempt++) {
    const candidate = deriveStreamSeed(masterSeed, `${target.point}#search:${attempt}`);
    const restored = await restoreSave(platform, preFiringSave);
    if (!restored) {
      return fail('engine restore failed during the candidate loop', attempt, budget);
    }
    service.setPointSeedOverrides({ ...transcriptOverrides, [target.point]: candidate });
    await engine.executeCommand(commands[firingCommandIndex]);
    const drawnFiring = targetFirings().find((d) => d.provenance === 'drawn');
    if (drawnFiring?.cls === target.cls) {
      return {
        found: true,
        tries: attempt,
        budget,
        masterSeed,
        pointSeed: candidate,
        firingCommandIndex
      };
    }
  }

  return {
    found: false,
    tries: budget,
    budget,
    masterSeed,
    firingCommandIndex,
    reason: 'budget-exhausted'
  };
}

/** Capture the engine's current save payload in memory (the runner's D18 pattern). */
async function captureSave(platform: NonNullable<SearchEngine['engine']>): Promise<unknown> {
  let captured: unknown = null;
  platform.registerSaveRestoreHooks({
    onSaveRequested: async (data) => { captured = data; },
    onRestoreRequested: async () => null
  });
  const saved = await platform.save();
  return saved ? captured : null;
}

/** Restore the engine from an in-memory save payload. */
async function restoreSave(
  platform: NonNullable<SearchEngine['engine']>,
  payload: unknown
): Promise<boolean> {
  platform.registerSaveRestoreHooks({
    onSaveRequested: async () => { /* unused */ },
    onRestoreRequested: async () => payload
  });
  return platform.restore();
}
