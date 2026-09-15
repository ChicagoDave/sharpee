/**
 * @file Registered location-heading arms (ADR-349 D16 contract 2).
 *
 * A `room name` block's arms are predicates plus prose. The predicate is a
 * closure only the runtime that loaded the story can evaluate, so it is
 * registered here per entity rather than stored on the entity: `IFEntity.toJSON`
 * spreads every trait (`entities/if-entity.ts:433`) and `JSON.stringify` drops
 * function-valued fields, while the trait rehydrator restores prototypes for
 * registered core types and cannot reconstruct a per-instance closure. Arms on a
 * trait would therefore come back from a save with every condition gone, leaving
 * the first arm winning permanently — a serialization failure that reads as a
 * story bug.
 *
 * Public interface: `registerLocationName`, `clearLocationNames` (loader and test
 * lifecycle), `lookupLocationName` (the projection's read side), `LocationNameArm`.
 *
 * Owner context: `@sharpee/world-model` — the projection in
 * `world/LocationHeadingBehavior.ts` is its one consumer. Modeled on the shape
 * `state-clauses.ts` and stdlib's snippet-gate registry already use: Map-based,
 * keyed, idempotent last-wins.
 *
 * LIFECYCLE CONTRACT: nothing here is serialized — an arm is a live closure and
 * never touches a save file. The loader re-registers on every story load, so a
 * fresh process's load rebuilds the registry and an in-game RESTORE reuses the
 * registrations already in place. A story switch inside one process clears first.
 */

/**
 * One arm of an entity's `room name` block: the prose, and the condition it
 * renders under. A thunk, not a world-taking predicate — the registering runtime
 * closes over its own world access and condition evaluator, so this package
 * never learns what a story-language condition is.
 */
export interface LocationNameArm {
  /** Absent on the unconditional fallback arm, which always holds. */
  readonly holds?: () => boolean;
  /** The arm's resolved prose, pre-decoration. */
  readonly text: string;
}

/** entity id → its arms, in declaration order. */
const arms = new Map<string, ReadonlyArray<LocationNameArm>>();

/**
 * Register (or replace) one entity's location-heading arms. Idempotent — the
 * latest registration wins, so a loader re-registering on a fresh load replaces
 * rather than stacking.
 *
 * @param entityId the room, enclosure, or region the arms belong to
 * @param entityArms the arms in declaration order; the first whose condition
 *   holds is the one that renders
 */
export function registerLocationName(
  entityId: string,
  entityArms: ReadonlyArray<LocationNameArm>
): void {
  arms.set(entityId, entityArms);
}

/**
 * The projection's read side: one entity's registered arms, if any.
 *
 * @param entityId the entity being resolved
 * @returns the arms, or undefined when the entity declared no `room name`
 *   (the common case — most entities have none)
 */
export function lookupLocationName(
  entityId: string
): ReadonlyArray<LocationNameArm> | undefined {
  return arms.get(entityId);
}

/**
 * Drop every registration. Called on a story switch inside one process, and
 * between tests; never on an in-game RESTORE, which reuses what is registered.
 */
export function clearLocationNames(): void {
  arms.clear();
}
