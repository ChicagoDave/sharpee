/**
 * @file The location heading, projected per turn (ADR-349 D3, D11, D16a).
 *
 * The heading a player reads above a room description, and the one the status
 * line shows, are the same fact. This is the single function that computes it,
 * and both surfaces call it — the room block in the engine's prose pipeline and
 * the `location` channel producer in stdlib — so there is no second derivation
 * for them to disagree with (D3). It lives here because `world-model` is the one
 * package both can reach: engine depends on stdlib and not the reverse, and
 * `getDescribableLocation`, whose answer this builds on, is already next door.
 *
 * It returns *parts*, never a joined string. Who joins them, and with what
 * punctuation, is the locale's authority (D13 — the English Assembler), and a
 * projection that pre-joined them would take that from the component the platform
 * names as its owner.
 *
 * Public interface: `LocationHeadingBehavior.resolve`, `HeadingPart`.
 * Owner context: `@sharpee/world-model` — world / projections.
 */

import type { HeadingPart } from '@sharpee/if-domain';
import { IFEntity } from '../entities/if-entity.js';
import { WorldModel } from './WorldModel.js';
import { TraitType } from '../traits/trait-types.js';
import { RoomTrait } from '../traits/room/roomTrait.js';
import { RegionTrait } from '../traits/region/regionTrait.js';
import { VisibilityBehavior } from './VisibilityBehavior.js';
import { lookupLocationName } from '../location-heading-registry.js';

/**
 * One contributor's text for the current heading. A heading is an ordered list
 * of these; an empty list means no contributor spoke (D16a), which is the
 * consumer's signal to render what it renders today.
 *
 * Declared in `@sharpee/if-domain` and re-exported here, not re-declared: it is
 * both this projection's return shape and the `location` channel's wire payload,
 * and those two sit in packages that cannot import each other. A mirrored
 * interface would let the projection and the wire drift apart silently.
 */
export type { HeadingPart };

/** Guards the region walk against a `parentRegionId` cycle an author can write. */
const MAX_REGION_DEPTH = 64;

/**
 * The first arm whose condition holds, or undefined when the entity registered
 * none and when every arm's condition fails. An arm with no `holds` is the
 * unconditional one and always wins where it is reached; the analyzer puts it
 * last, so reaching it means every conditional arm before it failed.
 *
 * @param entityId the contributor being asked
 * @returns the winning arm's text, or undefined if this contributor is silent
 */
function winningText(entityId: string): string | undefined {
  const arms = lookupLocationName(entityId);
  if (!arms) return undefined;
  for (const arm of arms) {
    if (arm.holds === undefined || arm.holds()) return arm.text;
  }
  return undefined;
}

/**
 * Append a contributor's part, if it has one to give.
 *
 * @param parts the list being built, mutated in place
 * @param ownerId the contributing entity
 * @param role which contributor kind this is
 */
function contribute(parts: HeadingPart[], ownerId: string, role: HeadingPart['role']): void {
  const text = winningText(ownerId);
  if (text !== undefined) parts.push({ ownerId, text, role });
}

/**
 * The location heading, as the ordered parts its contributors supplied.
 *
 * INVARIANT: the place is resolved through `getDescribableLocation` and never
 * through `getContainingRoom` (D4a) — the latter walks past an opaque vehicle to
 * the room around it, which is the divergence between the heading and the status
 * line that this projection exists to end (GH #468).
 */
export class LocationHeadingBehavior {
  /**
   * Compute the observer's location heading for this turn.
   *
   * Contributors, in the order their parts are emitted (D16a): the place, then
   * at most one enclosure, then the place's regions innermost-to-outermost. A
   * contributor with no registered `room name`, or whose arms all fail, supplies
   * nothing and is simply absent from the result.
   *
   * @param observer the entity whose location is being named — the player
   * @param world the world to read the observer's location and regions from
   * @returns the parts in emission order; empty when no contributor spoke, which
   *   under D16a is when the consumer falls back to the entity's own name
   */
  static resolve(observer: IFEntity, world: WorldModel): ReadonlyArray<HeadingPart> {
    const { location, immediateContainer } = VisibilityBehavior.getDescribableLocation(
      observer,
      world
    );

    const parts: HeadingPart[] = [];
    contribute(parts, location.id, 'place');
    if (immediateContainer) contribute(parts, immediateContainer.id, 'enclosure');

    // Regions contribute only where the place is a room — an opaque vehicle
    // occupies the place slot and composes with nothing (D4a).
    let regionId = location.get<RoomTrait>(TraitType.ROOM)?.regionId;
    for (let depth = 0; regionId && depth < MAX_REGION_DEPTH; depth++) {
      const region = world.getEntity(regionId);
      if (!region) break;
      contribute(parts, region.id, 'region');
      regionId = region.get<RegionTrait>(TraitType.REGION)?.parentRegionId;
    }

    return parts;
  }
}
