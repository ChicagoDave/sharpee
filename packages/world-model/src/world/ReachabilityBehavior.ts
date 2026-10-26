// ReachabilityBehavior.ts - Physical reachability system for IF (ADR-273 D4)

import { Behavior } from '../behaviors/behavior.js';
import { IFEntity } from '../entities/if-entity.js';
import { WorldModel } from './WorldModel.js';
import { TraitType } from '../traits/trait-types.js';
import { OpenableTrait } from '../traits/openable/openableTrait.js';
import { VisibilityBehavior } from './VisibilityBehavior.js';
import { holderOf, placeOf } from './ExpansePlaceBehavior.js';
import { lookoutOf } from './SightBehavior.js';
import { sameCell } from '../traits/expanse/expanseTrait.js';
import { getVehicleAboard } from '../traits/vehicle/vehicleBehavior.js';

/**
 * The platform's ONE definition of physical reachability — the sibling of
 * VisibilityBehavior (ADR-273 D4). The rule set is ported unchanged from
 * stdlib's `ScopeResolver.canReach`, which now delegates here (as its
 * `canSee` has always delegated to VisibilityBehavior):
 *
 * - sight precondition: an entity you cannot see is not reachable
 *   (today's platform stance — darkness blocks reach; changing that is a
 *   one-place change here, taking parse gate and validate phase together)
 * - carried items are reachable
 * - same immediate location (e.g. both on a table) is reachable
 * - another actor's inventory is blocked unless the actor carries
 *   OpenInventoryTrait (you can see the thief's knife, not grab it)
 * - on a supporter: reachable
 * - in a container: reachable only while the container is open
 *   (closed blocks, transparent or not — you can see through glass,
 *   you cannot reach through it)
 * - default: same room and visible → reachable
 *
 * Public interface: canReach(observer, target, world),
 * getReachable(observer, world). Consumed by WorldModel.canReach /
 * WorldModel.getReachable; parse-time `.where()` scope gating reads it
 * through those (ADR-273 D2), stdlib's validate phase through its
 * delegating ScopeResolver.
 *
 * Owner context: world-model behavior layer (world/), beside
 * VisibilityBehavior.
 */
export class ReachabilityBehavior extends Behavior {
  static requiredTraits = [];

  /**
   * Determines if an observer can physically reach a target entity.
   *
   * @param observer - The entity doing the reaching
   * @param target - The entity being reached for
   * @param world - The world model
   * @returns true if the target is physically reachable
   */
  static canReach(observer: IFEntity, target: IFEntity, world: WorldModel): boolean {
    // Sight precondition (ported unchanged): must be visible first
    if (!VisibilityBehavior.canSee(observer, target, world)) {
      return false;
    }

    // Carried items are always reachable
    if (world.getLocation(target.id) === observer.id) {
      return true;
    }

    // In an expanse (ADR-376 D10): a thing positioned in it, or held in
    // one, is within reach only from its own cell — aboard a vehicle there,
    // or out of the vehicle at that cell. Sight reached thirty units; hands
    // do not.
    if (!this.reachableAcrossExpanse(observer, target, world)) {
      return false;
    }

    // In same immediate location (e.g., both on a table)
    const observerLocation = world.getLocation(observer.id);
    const targetLocation = world.getLocation(target.id);
    if (observerLocation === targetLocation) {
      return true;
    }

    // Check what the target is in/on
    const targetContainer = targetLocation ? world.getEntity(targetLocation) : undefined;
    if (targetContainer) {
      // Another actor's inventory: visible but not reachable by default.
      // Like a closed transparent container — you can see the thief's knife
      // but can't grab it. Authors add OpenInventoryTrait for accessible
      // actors (e.g., a horse with saddlebags, a dead NPC).
      if (targetContainer.hasTrait(TraitType.ACTOR) && targetContainer.id !== observer.id) {
        return targetContainer.hasTrait(TraitType.OPEN_INVENTORY);
      }

      // On a supporter — reachable if we can see it
      if (targetContainer.hasTrait(TraitType.SUPPORTER)) {
        return true;
      }

      // In a container — must be open (closed blocks, transparent or not)
      if (targetContainer.hasTrait(TraitType.CONTAINER)) {
        if (targetContainer.hasTrait(TraitType.OPENABLE)) {
          const openable = targetContainer.getTrait(OpenableTrait);
          if (openable && !openable.isOpen) {
            return false;
          }
        }
        return true;
      }
    }

    // Default: reachable if in same room and visible
    return true;
  }

  /** False when the target's positioned holder lies in the observer's expanse at another cell. */
  private static reachableAcrossExpanse(observer: IFEntity, target: IFEntity, world: WorldModel): boolean {
    const holder = holderOf(world, target);
    if (!holder) return true;
    // A landmark room is within reach only from inside it: seen across the
    // expanse, it and what it holds are out of reach.
    if (holder.hasTrait(TraitType.ROOM)) return world.getContainingRoom(observer.id)?.id === holder.id;
    const own = getVehicleAboard(world, observer.id)?.id ?? observer.id;
    if (holder.id === own) return true;
    const lookout = lookoutOf(world, observer);
    const place = placeOf(world, holder);
    if (!lookout || !place || place.expanse.id !== lookout.expanse.id) return true;
    return sameCell(place.cell, lookout.cell);
  }

  /**
   * Gets all entities the observer can physically reach.
   *
   * Reachable is a subset of visible (the sight precondition), so the
   * candidate pool is VisibilityBehavior.getVisible, filtered by canReach.
   *
   * @param observer - The entity doing the reaching
   * @param world - The world model
   * @returns Array of entities that are physically reachable
   */
  static getReachable(observer: IFEntity, world: WorldModel): IFEntity[] {
    return VisibilityBehavior.getVisible(observer, world).filter((target) =>
      this.canReach(observer, target, world),
    );
  }
}
