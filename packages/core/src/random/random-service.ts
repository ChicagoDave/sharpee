/**
 * RandomService — the handle-only draw interface (ADR-293 D2, D5; API per Implementation).
 *
 * Public interface: `RandomService`.
 * Owner context: @sharpee/core random substrate. Core owns the interface; engine owns
 * the sole implementation (stream derivation/cache, force lookup, trace, persistence).
 * Gameplay code draws exclusively through `ChoicePoint` handles — the one sanctioned
 * route to a bare `SeededRandom` is a point's own `sample` callback inside `resolve()`.
 */

import type { ChoicePoint } from './choice-point.js';
import type { SeededRandom } from './seeded-random.js';

/**
 * Draw API over declared points. Every draw is on the named point's own stream,
 * derived from the master seed and the point name (D3) — no draw exists without
 * a declaration (D2).
 */
export interface RandomService {
  /**
   * True with the given probability. One draw on `p`'s stream.
   * @param p - a yes/no choice point
   * @param probability - chance of `true`, in [0, 1]
   */
  chance(p: ChoicePoint<'yes' | 'no'>, probability: number): boolean;

  /**
   * Integer in [min, max] inclusive. One draw on `p`'s stream.
   */
  int(p: ChoicePoint, min: number, max: number): number;

  /**
   * Pick one element. One draw on `p`'s stream.
   * @param label - optional class label for the picked item (trace/coverage, Phase C)
   */
  pick<T>(p: ChoicePoint, items: readonly T[], label?: (t: T) => string): T;

  /**
   * Resolve a multi-draw point to a classed outcome.
   *
   * Real path: `sample` receives the point's own stream and performs its N internal
   * draws (the one sanctioned bare-`SeededRandom` route, D2). Forced path (Phase C):
   * `materialize` builds the outcome for a forced class with zero draws (D8) —
   * typed now per A1 ruling 5, unused until forcing lands.
   *
   * @param p - a class-bearing choice point
   * @param sample - draws from the point's stream and returns the classed outcome
   * @param materialize - builds the outcome for a forced class without drawing
   */
  resolve<C extends string, R>(
    p: ChoicePoint<C>,
    sample: (draw: SeededRandom) => { cls: C; value: R },
    materialize: (forced: C) => R
  ): { cls: C; value: R };
}
