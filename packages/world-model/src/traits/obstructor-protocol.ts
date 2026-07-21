// packages/world-model/src/traits/obstructor-protocol.ts

/**
 * Generalized obstructor-protocol query helpers (ADR-173).
 *
 * A wall side may declare an `obstructedBy` reference to another entity in
 * the same room. That obstructor's *own traits* declare the capabilities it
 * modifies — `AcousticDampenerTrait` for sound (ADR-172), future
 * `BreachBlockerTrait` for breaching, future `VisualConduitTrait` for
 * line-of-sight, and so on. The wall is the aggregator: capability consumers
 * call into this module to ask "is there a contribution from this side's
 * obstructor for this capability?", and the wall walks both sides for the
 * cross-side sum AC-9 + AC-10 in ADR-173 require.
 *
 * Per ADR-173 §"obstruction is automatically lifted when the obstructor
 * moves", the obstructor's *current* location is re-checked at query time —
 * the wall does not store an obstruction flag. Move the bookcase aside and
 * the obstruction lifts without explicit event handling. Authors who want
 * custom side-effects on movement use ADR-052 event handlers in the usual
 * way; the default protocol behavior is purely query-time.
 *
 * Public interface: `getCurrentObstructor`, `findTraitOnObstructor`,
 * `findTraitsOnObstructors`. The latter two implement the obstructor-trait
 * protocol; the first is the underlying location-aware lookup useful for
 * non-trait queries (e.g. a future BREACH action rendering "the bookcase
 * blocks your access" without consulting any trait).
 *
 * Owner context: `@sharpee/world-model` — wall / spatial primitives.
 */

import type { EntityId } from '@sharpee/core';
import type { IFEntity } from '../entities/if-entity.js';
import type { WallEntity } from '../entities/wall-entity.js';
import type { ITrait } from './trait.js';

/**
 * Narrow world-model surface required to evaluate obstructors. Implemented
 * by `WorldModel`; passed in by callers so the helper has no implicit
 * dependency on the full world API.
 */
export interface IObstructorQueryWorld {
  getEntity(id: string): IFEntity | undefined;
  getLocation(id: string): string | undefined;
}

/**
 * Returns the entity currently obstructing a wall side, or undefined when
 * no obstructor is in effect.
 *
 * Returns undefined when:
 *  - the side has no `obstructedBy` declared
 *  - the obstructor entity no longer exists in the world
 *  - the obstructor is not currently located in the side's room (it was
 *    moved aside, taken into inventory, etc.)
 *
 * The runtime location check is the load-bearing semantics: ADR-173 keeps
 * obstruction state implicit so that PUSH BOOKCASE / TAKE TAPESTRY lift
 * obstruction without further bookkeeping.
 */
export function getCurrentObstructor(
  wall: WallEntity,
  side: EntityId,
  world: IObstructorQueryWorld,
): IFEntity | undefined {
  const sideData = wall.getSide(side);
  if (!sideData?.obstructedBy) return undefined;

  const obstructor = world.getEntity(sideData.obstructedBy);
  if (!obstructor) return undefined;

  if (world.getLocation(obstructor.id) !== side) return undefined;

  return obstructor;
}

/**
 * Returns the capability-specific trait carried by the given side's current
 * obstructor, or undefined if no contribution applies.
 *
 * Returns undefined when:
 *  - no obstructor is currently present on this side
 *    (per `getCurrentObstructor`)
 *  - the obstructor lacks the requested trait
 *
 * AC-10 (ADR-173): an obstructor lacking the trait contributes zero to that
 * capability — callers that sum contributions treat undefined as 0.
 */
export function findTraitOnObstructor<T extends ITrait>(
  wall: WallEntity,
  side: EntityId,
  traitType: string,
  world: IObstructorQueryWorld,
): T | undefined {
  const obstructor = getCurrentObstructor(wall, side, world);
  if (!obstructor) return undefined;
  return obstructor.get<T>(traitType);
}

/**
 * Result of a cross-side obstructor-trait scan: one entry per side that has
 * a current obstructor carrying the requested trait. The `side` field is
 * the room id of the obstructed side (i.e. the room the obstructor sits
 * in); the `obstructor` is the resolved entity; `trait` is the matching
 * trait instance.
 */
export interface IObstructorTraitMatch<T extends ITrait> {
  side: EntityId;
  obstructor: IFEntity;
  trait: T;
}

/**
 * Walks both sides of the wall and returns the matching capability-specific
 * trait for each side that has one.
 *
 * Returns an empty array when neither side has an obstructor with the
 * requested trait — the AC-10 zero-contribution case for the cross-side
 * aggregation pattern.
 *
 * This is the helper ADR-172's acoustic-cost formula consults to sum
 * `AcousticDampenerTrait.acousticCostModifier` across both sides
 * (AC-9 in ADR-173, AC-7 in ADR-172). Future capabilities follow the same
 * shape — pass the trait type the capability declares, sum contributions
 * the way that capability cares about.
 */
export function findTraitsOnObstructors<T extends ITrait>(
  wall: WallEntity,
  traitType: string,
  world: IObstructorQueryWorld,
): IObstructorTraitMatch<T>[] {
  const matches: IObstructorTraitMatch<T>[] = [];
  for (const side of wall.between) {
    const obstructor = getCurrentObstructor(wall, side, world);
    if (!obstructor) continue;
    const trait = obstructor.get<T>(traitType);
    if (!trait) continue;
    matches.push({ side, obstructor, trait });
  }
  return matches;
}
