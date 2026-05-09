// packages/world-model/src/traits/acoustic/acousticTrait.ts

/**
 * Acoustic trait — wall-intrinsic sound-cost data (ADR-172).
 *
 * Per ADR-173's whole-wall-vs-per-side trait taxonomy, a wall's *base*
 * acoustic cost (the contribution of its material — plaster vs masonry
 * vs soundproof panel) is symmetric from both sides. It lives in the
 * whole-wall slot: attached to the wall entity itself, not to either
 * side's per-side data.
 *
 * Per-side dampening (a tapestry covering one face, a peephole drilled
 * through one face) lives on the *obstructor* entity and uses
 * `AcousticDampenerTrait` (the per-side capability-specific obstructor
 * trait per ADR-173's generalized obstructor protocol).
 *
 * Phase 2 ships only the trait shape and its tier→cost table. The
 * propagation algorithm in `@sharpee/engine` (Phase 3) consumes
 * `ACOUSTIC_TIER_COSTS`.
 *
 * Owner context: `@sharpee/world-model` — wall / spatial primitives.
 *
 * @see ADR-172 — Spatial Sound Propagation
 * @see ADR-173 — Wall Adjacency Primitive (taxonomy)
 */

import { ITrait } from '../trait';
import { TraitType } from '../trait-types';

/**
 * The four discrete acoustic tiers a wall material may have. Authored
 * qualitatively at world-load time; the propagation algorithm reads the
 * cost via `ACOUSTIC_TIER_COSTS`.
 */
export type AcousticTier = 'thin' | 'default' | 'thick' | 'soundproof';

/**
 * Platform-default acoustic costs per wall tier, in path-cost units
 * (ADR-172). Walls without an explicit `AcousticTrait` resolve to
 * `default`.
 *
 * `Infinity` for `soundproof` collapses to `silent` audibility through
 * the standard clarity formula (`clarity = budget − cost`) without the
 * propagation algorithm needing a special case.
 */
export const ACOUSTIC_TIER_COSTS: Readonly<Record<AcousticTier, number>> = Object.freeze({
  thin: 2,
  default: 4,
  thick: 6,
  soundproof: Number.POSITIVE_INFINITY,
});

/**
 * Acoustic trait — attaches to wall entities to declare their intrinsic
 * acoustic cost tier. Whole-wall (symmetric) per ADR-173 taxonomy.
 *
 * @example
 * world.createWall({
 *   between: [parlor, library],
 *   whole: [new AcousticTrait('thick')],
 *   sides: { ... }
 * });
 */
export class AcousticTrait implements ITrait {
  static readonly type = TraitType.ACOUSTIC;
  /**
   * Per ADR-173 taxonomy. Documentation only — not enforced; the wall
   * creation API simply attaches whole-wall traits via `wall.add()`
   * and per-side data via `wall.sides`.
   */
  static readonly slot = 'whole-wall';
  readonly type = TraitType.ACOUSTIC;

  constructor(public readonly tier: AcousticTier) {}
}
