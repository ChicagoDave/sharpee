/**
 * EngineRandomService — the engine's sole `RandomService` implementation (ADR-293 D5).
 *
 * Public interface: {@link EngineRandomService} class (`chance`/`int`/`pick`/`resolve`
 * draw API; `loadForces`/`clearForces`/`getForceReport` forcing surface;
 * `setPointSeedOverrides` (D11); `setTraceSink` (D16);
 * `serializeStreamStates`/`restoreStreamStates` persistence; `getMasterSeed`),
 * {@link ACTION_STREAM_POINT_NAME}, {@link TURN_STREAM_POINT_NAME}.
 * Owner context: `@sharpee/engine` runtime. Core owns the interface, catalog, and
 * force/trace types; this class owns stream derivation, the per-point stream cache,
 * the force table, occurrence counters, trace emission, and stream-state
 * persistence (D3, D7, D8, D9, D16).
 *
 * Invariants:
 * - A point's stream depends only on (masterSeed, point name) — never on
 *   registration or draw order (D3). A point-seed override (D11) replaces where
 *   that one name's stream starts; every other derivation is untouched.
 * - No draw leaves this class's streams except through a `ChoicePoint` handle;
 *   the one bare-`SeededRandom` exit is `resolve()`'s `sample` callback (D2).
 * - A forced firing consumes zero draws: it never touches the point's stream (D8).
 * - Forces and occurrence counters are session state, never save state (D9):
 *   `serializeStreamStates` carries stream states only.
 * - Restore never reads the clock: unknown or missing names reseed by derivation
 *   from the master seed (D7).
 * - No trace record is built unless a sink is installed (D16: off by default,
 *   silent in a published game).
 */

import {
  type ChoicePoint,
  type RandomService,
  type SeededRandom,
  createSeededRandom,
  deriveStreamSeed,
  getPoint,
  type RandomForceSpec,
  type RandomForceStatus,
  type RandomForceMode,
  forceKey,
  DuplicateForceKeyError,
  UnknownForcePointError,
  UndeclaredForceClassError,
  type IRandomTraceData,
  type RandomTraceSink
} from '@sharpee/core';

/**
 * Point name the pre-ADR-293 unified action stream (`IEngineState.actionRngSeed`)
 * maps onto when a `2.0.0` save is read (D7's version reader). The action surface
 * itself moves onto this service when `ActionContext.random` is retyped
 * (ADR-293 Phase A, stdlib flip).
 */
export const ACTION_STREAM_POINT_NAME = 'engine.action';

/**
 * Point name the engine's turn-plugin stream (`GameEngine.random`) derives its
 * interim seed from (ADR-293 Phase A, re-cut Phase 3). The stream stays
 * `SeededRandom`-typed until the turn-plugin surface moves onto points in the
 * Phase 4–6 arc; deriving its seed from (masterSeed, this name) makes
 * turn-plugin and deadly-room draws seed-reproducible in the meantime.
 */
export const TURN_STREAM_POINT_NAME = 'engine.turn';

/** A loaded force plus its session fire count. */
interface ForceEntry {
  readonly spec: RandomForceSpec;
  fireCount: number;
}

/**
 * Per-point stream owner. One instance per engine per session; all stream state
 * lives here (never at module scope — D6) and rides the save as
 * `{ pointName → streamState }` (D7). Forces, point-seed overrides, occurrence
 * counters, and the trace sink are session-scoped and never serialized (D9).
 */
export class EngineRandomService implements RandomService {
  /** Streams that have drawn this session, keyed by point name. */
  private streams = new Map<string, SeededRandom>();
  /** Restored stream states not yet re-materialized into a live stream. */
  private restoredStates = new Map<string, number>();
  /** Loaded forces, keyed by `forceKey(spec)` (D9's key identity). */
  private forceTable = new Map<string, ForceEntry>();
  /** 1-based firing count per point this session (D9's occurrence index). */
  private occurrences = new Map<string, number>();
  /** Per-point starting-seed overrides (D11); consulted only at stream derivation. */
  private pointSeedOverrides = new Map<string, number>();
  /** Trace receiver (D16); records are built only while one is installed. */
  private traceSink: RandomTraceSink | undefined;

  constructor(
    private readonly masterSeed: number,
    options?: {
      pointSeedOverrides?: Readonly<Record<string, number>>;
      traceSink?: RandomTraceSink;
    }
  ) {
    if (options?.pointSeedOverrides) {
      this.pointSeedOverrides = new Map(Object.entries(options.pointSeedOverrides));
    }
    this.traceSink = options?.traceSink;
  }

  /** The session's master seed, for seed reporting (D14). */
  getMasterSeed(): number {
    return this.masterSeed;
  }

  /**
   * Load forces into the session's force table, validating each against the
   * catalog (D8, D9). Additive across calls; duplicate detection spans all
   * loaded forces.
   *
   * @param specs - forces to load
   * @throws UnknownForcePointError if a spec names an undeclared point (D2)
   * @throws UndeclaredForceClassError if a spec names a class its point does
   *   not declare, or targets a plain draw (D4)
   * @throws DuplicateForceKeyError if a `point[#occurrence]` key is already
   *   loaded (D9: a load error, not last-wins)
   * @throws Error if a spec's occurrence index is not a positive integer
   */
  loadForces(specs: readonly RandomForceSpec[]): void {
    for (const spec of specs) {
      const point = getPoint(spec.point);
      if (!point) {
        throw new UnknownForcePointError(spec.point);
      }
      const declared = point.classes ?? [];
      if (!declared.includes(spec.cls)) {
        throw new UndeclaredForceClassError(spec.point, spec.cls, declared);
      }
      if (
        spec.occurrence !== undefined &&
        (!Number.isInteger(spec.occurrence) || spec.occurrence < 1)
      ) {
        throw new Error(
          `loadForces: '${spec.point}' has invalid occurrence index ${spec.occurrence} — must be a positive integer (ADR-293 D9)`
        );
      }
      const key = forceKey(spec);
      if (this.forceTable.has(key)) {
        throw new DuplicateForceKeyError(key);
      }
      this.forceTable.set(key, { spec, fireCount: 0 });
    }
  }

  /** Drop every loaded force and its fire counts (session-state reset). */
  clearForces(): void {
    this.forceTable.clear();
  }

  /**
   * Session status of every loaded force, as data for the consumer's report
   * (D9): an unfired `once` force has `fireCount` 0 — a hard error in
   * transcript runs, a report line in play; `sticky` counts are informational.
   */
  getForceReport(): RandomForceStatus[] {
    return [...this.forceTable.values()].map(({ spec, fireCount }) => ({
      spec,
      fireCount
    }));
  }

  /**
   * Replace the per-point starting-seed override map (D11). An override wins
   * over master-seed derivation for that name only, and only when the point's
   * stream has not yet materialized (a live or restored stream keeps its state).
   */
  setPointSeedOverrides(overrides: Readonly<Record<string, number>>): void {
    this.pointSeedOverrides = new Map(Object.entries(overrides));
  }

  /**
   * Install or remove the trace receiver (D16). While absent — the default —
   * no trace record is built at all, which is what keeps a published game
   * silent (AC-14).
   */
  setTraceSink(sink: RandomTraceSink | undefined): void {
    this.traceSink = sink;
  }

  /**
   * True with the given probability, drawn on `p`'s own stream — unless a
   * matching force substitutes the outcome via the fixed yes/no ⟷ boolean
   * bijection, consuming zero draws (D8).
   */
  chance(p: ChoicePoint<'yes' | 'no'>, probability: number): boolean {
    const occurrence = this.nextOccurrence(p.name);
    const forced = this.matchForce(p.name, occurrence);
    if (forced) {
      const result = forced.spec.cls === 'yes';
      this.emitTrace(p.name, occurrence, forced.spec.cls, result, forced, 0);
      return result;
    }
    const result = this.streamFor(p.name).chance(probability);
    this.emitTrace(p.name, occurrence, result ? 'yes' : 'no', result, undefined, 1);
    return result;
  }

  /**
   * Integer in [min, max] inclusive, drawn on `p`'s own stream. Class-less
   * draw: never consults the force table (Phase C ruling 2(a) — a forceable
   * outcome space is expressed via `resolve()`).
   */
  int(p: ChoicePoint, min: number, max: number): number {
    const occurrence = this.nextOccurrence(p.name);
    const result = this.streamFor(p.name).int(min, max);
    this.emitTrace(p.name, occurrence, undefined, result, undefined, 1);
    return result;
  }

  /**
   * Pick one element, drawn on `p`'s own stream. Class-less draw: never
   * consults the force table (ruling 2(a)). `label` names the picked item in
   * trace; it draws nothing.
   */
  pick<T>(p: ChoicePoint, items: readonly T[], label?: (t: T) => string): T {
    const occurrence = this.nextOccurrence(p.name);
    const picked = this.streamFor(p.name).pick([...items]);
    this.emitTrace(
      p.name,
      occurrence,
      undefined,
      label ? label(picked) : picked,
      undefined,
      1
    );
    return picked;
  }

  /**
   * Resolve a class-bearing point to a classed outcome (D8).
   *
   * Forced path: a matching force substitutes the declared class and builds
   * its value via `materialize`, consuming zero draws — the point's stream is
   * never touched, so cross-point desynchronization is impossible (D3, D8).
   * Real path: `sample` runs against the point's own stream (any number of
   * internal draws).
   *
   * @throws Error if `p` declares no outcome classes (plain draws have no
   *   classed outcome to resolve), or if `sample` returns a class the point
   *   does not declare (an undeclared class would corrupt coverage and make
   *   forcing unsound).
   */
  resolve<C extends string, R>(
    p: ChoicePoint<C>,
    sample: (draw: SeededRandom) => { cls: C; value: R },
    materialize: (forced: C) => R
  ): { cls: C; value: R } {
    if (!p.classes || p.classes.length === 0) {
      throw new Error(
        `resolve: '${p.name}' declares no outcome classes — a plain draw cannot resolve to a class (ADR-293 D4/D8)`
      );
    }
    const occurrence = this.nextOccurrence(p.name);
    const forced = this.matchForce(p.name, occurrence);
    if (forced) {
      const cls = forced.spec.cls as C;
      const outcome = { cls, value: materialize(cls) };
      this.emitTrace(p.name, occurrence, cls, outcome.value, forced, 0);
      return outcome;
    }

    const stream = this.streamFor(p.name);
    let outcome: { cls: C; value: R };
    let drawsConsumed: number;
    if (this.traceSink) {
      const counted = countDraws(stream);
      outcome = sample(counted.stream);
      drawsConsumed = counted.count();
    } else {
      outcome = sample(stream);
      drawsConsumed = 0; // unreported — no sink, no record
    }
    if (!p.classes.includes(outcome.cls)) {
      throw new Error(
        `resolve: '${p.name}' sampled undeclared class '${outcome.cls}' ` +
          `(declared: ${p.classes.join(', ')})`
      );
    }
    this.emitTrace(p.name, occurrence, outcome.cls, outcome.value, undefined, drawsConsumed);
    return outcome;
  }

  /**
   * Current stream state of every point that has drawn — live streams plus
   * restored states whose points have not redrawn since restore (D7: the save
   * carries only points that have drawn). Forces and occurrence counters are
   * deliberately absent — session state, never save state (D9).
   */
  serializeStreamStates(): Record<string, number> {
    const states: Record<string, number> = {};
    for (const [name, state] of this.restoredStates) {
      states[name] = state;
    }
    for (const [name, stream] of this.streams) {
      states[name] = stream.getSeed();
    }
    return states;
  }

  /**
   * Replace all stream state with a saved `{ pointName → streamState }` map.
   * Named points continue exactly where the save left them; names absent from
   * the map reseed lazily — from a point-seed override if one is active (D11
   * is session state and survives a within-session restore), else by
   * derivation from the master seed — never from the clock (D7). The session's
   * force table is kept: a restore within a live session keeps session
   * instruments (D9).
   */
  restoreStreamStates(states: Record<string, number>): void {
    this.streams.clear();
    this.restoredStates = new Map(Object.entries(states));
  }

  /**
   * Drop the named points' stream continuity, so their next draw starts a
   * fresh stream (ADR-302 D5/D8 — branching, as opposed to resuming).
   *
   * **Why this is a separate operation and not a mode on restore.** A save
   * carries `{ pointName → streamState }` for every point that has drawn, and
   * `restoreStreamStates` adopts it — which is right, and is what a save is
   * FOR: a restore continues where it left off (D7). But a test harness that
   * starts a *new run* from a saved state wants the world without the luck,
   * and before this existed it had no way to say so. The measured consequence
   * (2026-08-05): a restored stream outranks both seed instruments in
   * `streamFor`, so a master `seed:` override AND a `point-seed:` override
   * were silently **inert** for any point that had already drawn — which is
   * every point you would actually want to vary, since you branch after the
   * interesting thing has started.
   *
   * Leaving `restore` alone and naming this separately keeps D7 true as
   * written. Reseeding is the same species as forces and point-seed
   * overrides: session state, deliberately never serialized (D9).
   *
   * After the drop, the point's next draw re-derives through the ordinary
   * chain — its point-seed override if one is active, else
   * `deriveStreamSeed(masterSeed, name)` — so a caller sets the instruments it
   * wants and then reseeds.
   *
   * **Occurrence counters are deliberately untouched.** They index a point's
   * firings across the session, and a branch child is a continuation of the
   * same game in every respect except the luck it is asking to re-roll. A
   * `forces: p#2=X` written against the parent's numbering keeps meaning what
   * it said.
   *
   * Idempotent, and silent on names that never drew — a point with no stream
   * to drop ends in the state dropping it would have produced.
   *
   * @param points the point names to reseed, or `'all'` for every stream.
   *   `'all'` re-derives the whole schedule from the master seed, which is the
   *   blunt instrument ADR-293 warns about; prefer naming points.
   */
  reseedStreams(points: 'all' | readonly string[]): void {
    if (points === 'all') {
      this.streams.clear();
      this.restoredStates.clear();
      return;
    }
    for (const name of points) {
      this.streams.delete(name);
      this.restoredStates.delete(name);
    }
  }

  /**
   * The point's live stream: cached, else re-materialized from a restored
   * state, else started from a point-seed override (D11), else derived lazily
   * from (masterSeed, name) per D3.
   */
  private streamFor(name: string): SeededRandom {
    const existing = this.streams.get(name);
    if (existing) return existing;

    const restored = this.restoredStates.get(name);
    const stream = createSeededRandom(
      restored ??
        this.pointSeedOverrides.get(name) ??
        deriveStreamSeed(this.masterSeed, name)
    );
    this.restoredStates.delete(name);
    this.streams.set(name, stream);
    return stream;
  }

  /** Increment and return the point's 1-based firing index (D9's occurrence). */
  private nextOccurrence(name: string): number {
    const n = (this.occurrences.get(name) ?? 0) + 1;
    this.occurrences.set(name, n);
    return n;
  }

  /**
   * The force applying to this firing, if any: an occurrence-indexed key
   * (`point#N`) wins over the unindexed key; a `once` force is eligible only
   * while unfired (D9). Matching increments the entry's fire count.
   */
  private matchForce(name: string, occurrence: number): ForceEntry | undefined {
    const indexed = this.forceTable.get(`${name}#${occurrence}`);
    const entry =
      indexed && this.eligible(indexed)
        ? indexed
        : this.eligibleUnindexed(this.forceTable.get(name));
    if (entry) {
      entry.fireCount++;
    }
    return entry;
  }

  private eligible(entry: ForceEntry): boolean {
    return entry.spec.mode === 'sticky' || entry.fireCount === 0;
  }

  private eligibleUnindexed(entry: ForceEntry | undefined): ForceEntry | undefined {
    return entry && this.eligible(entry) ? entry : undefined;
  }

  /** Build and emit a trace record — only while a sink is installed (D16). */
  private emitTrace(
    point: string,
    occurrence: number,
    cls: string | undefined,
    value: unknown,
    forced: ForceEntry | undefined,
    drawsConsumed: number
  ): void {
    if (!this.traceSink) return;
    const record: IRandomTraceData = {
      point,
      occurrence,
      ...(cls !== undefined ? { cls } : {}),
      value,
      provenance: forced ? 'forced' : 'drawn',
      drawsConsumed,
      ...(forced
        ? {
            forceMode: forced.spec.mode as RandomForceMode,
            ...(forced.spec.occurrence !== undefined
              ? { forceOccurrence: forced.spec.occurrence }
              : {})
          }
        : {})
    };
    this.traceSink(record);
  }
}

/**
 * Wrap a stream so API-level draws are counted for trace (`drawsConsumed`),
 * delegating every call to the live stream. Built only while a trace sink is
 * installed — the no-sink path passes the stream through untouched.
 */
function countDraws(stream: SeededRandom): {
  stream: SeededRandom;
  count: () => number;
} {
  let n = 0;
  return {
    stream: {
      next: () => (n++, stream.next()),
      int: (min, max) => (n++, stream.int(min, max)),
      chance: (probability) => (n++, stream.chance(probability)),
      pick: (array) => (n++, stream.pick(array)),
      shuffle: (array) => (n++, stream.shuffle(array)),
      getSeed: () => stream.getSeed(),
      setSeed: (seed) => stream.setSeed(seed)
    },
    count: () => n
  };
}
