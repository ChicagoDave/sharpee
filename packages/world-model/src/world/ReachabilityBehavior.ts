// ReachabilityBehavior.ts - Physical reachability system for IF (ADR-273 D4)

import { Behavior } from '../behaviors/behavior.js';
import { IFEntity } from '../entities/if-entity.js';
import { WorldModel } from './WorldModel.js';
import { TraitType } from '../traits/trait-types.js';
import { OpenableTrait } from '../traits/openable/openableTrait.js';
import { VisibilityBehavior } from './VisibilityBehavior.js';

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
