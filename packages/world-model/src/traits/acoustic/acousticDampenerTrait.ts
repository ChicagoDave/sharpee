// packages/world-model/src/traits/acoustic/acousticDampenerTrait.ts

/**
 * Acoustic dampener trait — obstructor-side sound-cost contribution
 * (ADR-172). Attaches to entities (tapestries, peepholes, foam panels,
 * heavy curtains) that, when referenced as a wall side's obstructor
 * (via `IWallSideData.obstructedBy` per ADR-173), modify the wall's
 * effective acoustic cost.
 *
 * Per ADR-173's generalized obstructor protocol, the wall does *not*
 * hardcode rules about what obstructors do; the obstructor's own
 * traits declare which capabilities it modifies. `AcousticDampenerTrait`
 * is the first capability-specific obstructor trait (ADR-172); future
 * capabilities (visual line-of-sight, olfactory, thermal) ship sibling
 * traits via the same protocol without changes to wall-substrate code.
 *
 * Sign convention:
 *   - **Positive** `contribution` adds to the wall's effective cost
 *     (dampens — tapestry, foam panel, heavy curtain).
 *   - **Negative** `contribution` subtracts from the wall's effective
 *     cost (more permeable — peephole, hole, vent opening).
 *
 * Phase 2 ships only the trait shape. The wall's effective acoustic
 * cost is computed by the propagation algorithm in `@sharpee/engine`
 * (Phase 3), which consults this trait via the obstructor-protocol
 * helpers shipped in ADR-173 Phase 5.
 *
 * Owner context: `@sharpee/world-model` — wall / spatial primitives.
 *
 * @see ADR-172 — Spatial Sound Propagation
 * @see ADR-173 — Wall Adjacency Primitive (obstructor protocol)
 */

import { ITrait } from '../trait.js';
import { TraitType } from '../trait-types.js';

/**
 * Acoustic dampener trait — attaches to obstructor entities (tapestry,
 * peephole, foam panel, heavy curtain).
 *
 * @example
 * const tapestry = author.createEntity('tapestry', EntityType.OBJECT);
 * tapestry.add(new AcousticDampenerTrait(2));   // +2 dampening
 * author.moveEntity(tapestry.id, parlor.id);
 *
 * world.createWall({
 *   between: [parlor, library],
 *   sides: {
 *     [parlor.id]: { adjective: 'oak', obstructedBy: tapestry.id },
 *     [library.id]: { adjective: 'brick' },
 *   },
 * });
 */
export class AcousticDampenerTrait implements ITrait {
  static readonly type = TraitType.ACOUSTIC_DAMPENER;
  /**
   * Per ADR-173 taxonomy. Documentation only — not enforced; obstructors
   * are referenced by the wall's per-side `obstructedBy` and located by
   * room at query time per the ADR-173 obstructor protocol.
   */
  static readonly slot = 'obstructor';
  readonly type = TraitType.ACOUSTIC_DAMPENER;

  constructor(public readonly contribution: number) {}
}
