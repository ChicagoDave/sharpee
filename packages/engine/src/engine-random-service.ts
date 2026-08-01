/**
 * EngineRandomService — the engine's sole `RandomService` implementation (ADR-293 D5).
 *
 * Public interface: {@link EngineRandomService} class (`chance`/`int`/`pick`/`resolve`
 * draw API plus `serializeStreamStates`/`restoreStreamStates` persistence and
 * `getMasterSeed`), {@link ACTION_STREAM_POINT_NAME}.
 * Owner context: `@sharpee/engine` runtime. Core owns the interface and catalog;
 * this class owns stream derivation, the per-point stream cache, and stream-state
 * persistence (D3, D7). Force-table lookup and trace land in Phase C.
 *
 * Invariants:
 * - A point's stream depends only on (masterSeed, point name) — never on
 *   registration or draw order (D3).
 * - No draw leaves this class's streams except through a `ChoicePoint` handle;
 *   the one bare-`SeededRandom` exit is `resolve()`'s `sample` callback (D2).
 * - Restore never reads the clock: unknown or missing names reseed by derivation
 *   from the master seed (D7).
 */

import {
  ChoicePoint,
  RandomService,
  SeededRandom,
  createSeededRandom,
  deriveStreamSeed
} from '@sharpee/core';

/**
 * Point name the pre-ADR-293 unified action stream (`IEngineState.actionRngSeed`)
 * maps onto when a `2.0.0` save is read (D7's version reader). The action surface
 * itself moves onto this service when `ActionContext.random` is retyped
 * (ADR-293 Phase A, stdlib flip).
 */
export const ACTION_STREAM_POINT_NAME = 'engine.action';

/**
 * Per-point stream owner. One instance per engine per session; all stream state
 * lives here (never at module scope — D6) and rides the save as
 * `{ pointName → streamState }` (D7).
 */
export class EngineRandomService implements RandomService {
  /** Streams that have drawn this session, keyed by point name. */
  private streams = new Map<string, SeededRandom>();
  /** Restored stream states not yet re-materialized into a live stream. */
  private restoredStates = new Map<string, number>();

  constructor(private readonly masterSeed: number) {}

  /** The session's master seed, for seed reporting (D14). */
  getMasterSeed(): number {
    return this.masterSeed;
  }

  /**
   * True with the given probability, drawn on `p`'s own stream.
   */
  chance(p: ChoicePoint<'yes' | 'no'>, probability: number): boolean {
    return this.streamFor(p.name).chance(probability);
  }

  /**
   * Integer in [min, max] inclusive, drawn on `p`'s own stream.
   */
  int(p: ChoicePoint, min: number, max: number): number {
    return this.streamFor(p.name).int(min, max);
  }

  /**
   * Pick one element, drawn on `p`'s own stream.
   * `label` participates in trace/coverage (Phase C); it draws nothing.
   */
  pick<T>(p: ChoicePoint, items: readonly T[], label?: (t: T) => string): T {
    void label;
    return this.streamFor(p.name).pick([...items]);
  }

  /**
   * Resolve a class-bearing point to a classed outcome (D8).
   *
   * Force-table lookup is a pass-through until forcing lands (Phase C): the
   * real path always runs, so `materialize` is accepted and never called.
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
    void materialize;
    if (!p.classes || p.classes.length === 0) {
      throw new Error(
        `resolve: '${p.name}' declares no outcome classes — a plain draw cannot resolve to a class (ADR-293 D4/D8)`
      );
    }
    const outcome = sample(this.streamFor(p.name));
    if (!p.classes.includes(outcome.cls)) {
      throw new Error(
        `resolve: '${p.name}' sampled undeclared class '${outcome.cls}' ` +
          `(declared: ${p.classes.join(', ')})`
      );
    }
    return outcome;
  }

  /**
   * Current stream state of every point that has drawn — live streams plus
   * restored states whose points have not redrawn since restore (D7: the save
   * carries only points that have drawn).
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
   * the map reseed lazily by derivation from the master seed — never from the
   * clock (D7).
   */
  restoreStreamStates(states: Record<string, number>): void {
    this.streams.clear();
    this.restoredStates = new Map(Object.entries(states));
  }

  /**
   * The point's live stream: cached, else re-materialized from a restored
   * state, else derived lazily from (masterSeed, name) per D3.
   */
  private streamFor(name: string): SeededRandom {
    const existing = this.streams.get(name);
    if (existing) return existing;

    const restored = this.restoredStates.get(name);
    const stream = createSeededRandom(
      restored ?? deriveStreamSeed(this.masterSeed, name)
    );
    this.restoredStates.delete(name);
    this.streams.set(name, stream);
    return stream;
  }
}
