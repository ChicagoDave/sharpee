// VisibilityBehavior.ts - Visibility system for IF

import { Behavior } from '../behaviors/behavior.js';
import { IFEntity } from '../entities/if-entity.js';
import { WorldModel } from './WorldModel.js';
import { TraitType } from '../traits/trait-types.js';
import { LightSourceBehavior } from '../traits/light-source/lightSourceBehavior.js';
import { EnterableTrait } from '../traits/enterable/enterableTrait.js';
import { RoomTrait } from '../traits/room/roomTrait.js';
import { ContainerTrait } from '../traits/container/containerTrait.js';
import { OpenableTrait } from '../traits/openable/openableTrait.js';
import { SceneryTrait } from '../traits/scenery/sceneryTrait.js';
import { IdentityTrait } from '../traits/identity/identityTrait.js';
import { PresenceBehavior } from './PresenceBehavior.js';
import { findTraitWithCapability } from '../capabilities/index.js';
import { holderOf } from './ExpansePlaceBehavior.js';
import { lookoutOf, sightingOf, sightings } from './SightBehavior.js';
import { getVehicleAboard } from '../traits/vehicle/vehicleBehavior.js';

/**
 * Standard capability ID for visibility control.
 * Entities can claim this capability to control their own visibility.
 */
export const VISIBILITY_CAPABILITY = 'if.scope.visible';

/**
 * ADR-240 evaluator key for a room's derived darkness (`dark.<roomId>`).
 * Owned by this read point; registrars (e.g. the story-loader's
 * `dark while` conditions) build the key with this function, never by
 * hand — the string is constructed in exactly two places, both pinned.
 */
export function darkKey(roomId: string): string {
  return `dark.${roomId}`;
}

export class VisibilityBehavior extends Behavior {
  static requiredTraits = [];

  /**
   * The live answer to "does this room require light?" (ADR-240): a
   * registered `dark.<roomId>` evaluator is authoritative (point-of-use
   * truth, never stale); with nothing registered, the stamped trait
   * fact applies unchanged (static `dark`, hand-written TS stories).
   */
  private static roomRequiresLight(room: IFEntity, world: WorldModel): boolean {
    const derived = world.evaluate(darkKey(room.id));
    if (typeof derived === 'boolean') return derived;
    const roomTrait = room.getTrait(RoomTrait);
    return Boolean(roomTrait && roomTrait.requiresLight);
  }

  /** Whether the observer sees without light — carries `NightVisionTrait`. */
  private static seesInDark(observer: IFEntity): boolean {
    return observer.hasTrait(TraitType.NIGHT_VISION);
  }

  /**
   * Whether a room is dark to this observer: dark, and the observer does
   * not see in the dark (ADR-374 D5). Looking and the perception filter
   * ask this; `isDark` stays the room's own fact.
   *
   * @param observer - The one looking
   * @param room - The room it is in
   * @param world - The world model
   * @returns true when the observer cannot see the room
   */
  static isDarkFor(observer: IFEntity, room: IFEntity, world: WorldModel): boolean {
    return !this.seesInDark(observer) && this.isDark(room, world);
  }

  /**
   * Determines if a room is effectively dark (no usable light sources).
   * This is the single source of truth for darkness checking; whether it
   * is dark to a given observer is `isDarkFor`.
   *
   * A room is dark if:
   * 1. It has RoomTrait with requiresLight = true
   * 2. There are no accessible, active light sources
   *
   * @param room - The room entity to check
   * @param world - The world model
   * @returns true if the room is dark and has no accessible light sources
   */
  static isDark(room: IFEntity, world: WorldModel): boolean {
    if (!this.roomRequiresLight(room, world)) {
      return false; // Room isn't dark (live evaluator or static trait fact)
    }
    return !this.hasLightSource(room, world);
  }

  /**
   * Whether an entity is still concealed (hidden until SEARCH or a game event
   * reveals it). This is the SINGLE shared definition of item concealment for
   * visibility: scope resolution, LOOK, and EXAMINE must all consult it (here
   * or via canSee/getVisible/getVisibleContents), never re-derive it.
   *
   * @param entity - The entity to check (safe on entities without IdentityTrait)
   * @returns true if the entity carries IdentityTrait with concealed === true
   */
  static isConcealed(entity: IFEntity): boolean {
    return entity.getTrait(IdentityTrait)?.concealed === true;
  }

  /**
   * The single per-entity listing filter shared by every visibility path
   * (room contents, container/supporter contents): excludes still-concealed
   * entities, scenery marked invisible, and entities whose visibility
   * capability vetoes being seen.
   *
   * @param entity - The candidate entity
   * @param world - The world model
   * @param observerId - The observer (or container proxy) id passed to a
   *                     visibility-capability behavior's validate
   * @returns true if the entity may appear in a visible-entity listing
   */
  private static isListable(entity: IFEntity, world: WorldModel, observerId: string): boolean {
    // Concealed entities are hidden everywhere until revealed
    if (this.isConcealed(entity)) {
      return false;
    }

    // Check if entity is invisible via SceneryTrait
    const scenery = entity.getTrait(SceneryTrait);
    if (scenery && scenery.visible === false) {
      return false;
    }

    // Check if entity has visibility capability that blocks being seen
    const visibilityTrait = findTraitWithCapability(entity, VISIBILITY_CAPABILITY);
    if (visibilityTrait) {
      const behavior = world.getBehaviorForCapability(visibilityTrait, VISIBILITY_CAPABILITY);
      if (behavior) {
        const result = behavior.validate(entity, world, observerId, {});
        if (!result.valid) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Determines if an observer can see a target entity
   */
  static canSee(observer: IFEntity, target: IFEntity, world: WorldModel): boolean {
    // Can always see self
    if (observer.id === target.id) return true;

    // Concealed entities are hidden from sight until revealed (same rule as
    // getVisible/getVisibleContents — one definition of "visible")
    if (this.isConcealed(target)) {
      return false;
    }

    // Check if target is invisible via SceneryTrait
    const targetScenery = target.getTrait(SceneryTrait);
    if (targetScenery && targetScenery.visible === false) {
      return false;
    }

    // Check if target has visibility capability that blocks being seen
    const visibilityTrait = findTraitWithCapability(target, VISIBILITY_CAPABILITY);
    if (visibilityTrait) {
      const behavior = world.getBehaviorForCapability(visibilityTrait, VISIBILITY_CAPABILITY);
      if (behavior) {
        const result = behavior.validate(target, world, observer.id, {});
        if (!result.valid) {
          return false; // Entity blocks visibility via capability
        }
      }
    }

    // In an expanse, scope is sight (ADR-376 D6): a positioned thing — an
    // open vehicle, a floating thing, a landmark room — or anything held in
    // one is seen only within the looker's sight. Answered here, before the
    // room rule, so two ships thirty units apart in one room do not see
    // each other; undefined means the ordinary rules decide.
    const expanseAnswer = this.seenAcrossExpanse(observer, target, world);
    if (expanseAnswer !== undefined) return expanseAnswer;

    // Get rooms
    const observerRoom = world.getContainingRoom(observer.id);
    const targetRoom = world.getContainingRoom(target.id);

    // Must be in same room (or target is the room)
    if (target.hasTrait(TraitType.ROOM)) {
      // Check if we're in the target room
      if (observerRoom?.id === target.id) {
        // Always know what room you're in, even in darkness
        return true;
      }
      return false;
    }

    // A door is present at both of its rooms (David's ruling 2026-07-18),
    // a backdrop at every room of its list (ADR-374 D1): visible from each.
    // Only the thing itself is present — the far room and its contents
    // stay unseen.
    const presentHere = !!observerRoom && PresenceBehavior.roomsBeyondHome(target).includes(observerRoom.id);

    if (!observerRoom || (!presentHere && observerRoom.id !== targetRoom?.id)) {
      return false;
    }

    // Dark to this observer (ADR-240, ADR-328 D5): only a light giving
    // light, and what you carry (by feel), are seen.
    if (this.isDarkFor(observer, observerRoom, world)) {
      if (target.hasTrait(TraitType.LIGHT_SOURCE) && LightSourceBehavior.givesLight(target, world)) {
        return true;
      }
      return world.getLocation(target.id) === observer.id;
    }

    // A far-side door sits at the room boundary, and a backdrop away from
    // its home room stands in the open — container occlusion cannot apply.
    if (presentHere && observerRoom.id !== targetRoom?.id) {
      return true;
    }

    // Check line of sight through containers
    const hasLineOfSight = this.hasLineOfSight(observer.id, target.id, world);
    return hasLineOfSight;
  }

  /**
   * The expanse's answer for a target positioned in the observer's expanse
   * (ADR-376 D6), or undefined when the ordinary rules apply: the observer
   * has no lookout, the target and everything holding it is unpositioned,
   * or the target rides the observer's own holder (their vehicle, or
   * themself out of it).
   *
   * A positioned thing itself is visible iff in sight; something held in
   * one is unseen out of sight and otherwise left to the room and
   * line-of-sight rules, so a distant ship's cabin stays dark.
   */
  private static seenAcrossExpanse(observer: IFEntity, target: IFEntity, world: WorldModel): boolean | undefined {
    const holder = holderOf(world, target);
    if (!holder) return undefined;
    const own = getVehicleAboard(world, observer.id)?.id ?? observer.id;
    if (holder.id === own) return undefined;
    const lookout = lookoutOf(world, observer);
    if (!lookout) return undefined;
    if (holder.hasTrait(TraitType.ROOM) && world.getContainingRoom(observer.id)?.id === holder.id) return undefined;
    const seen = sightingOf(world, lookout, holder) !== undefined;
    if (holder.id === target.id) return seen;
    return seen ? undefined : false;
  }

  /**
   * Gets all entities visible to an observer
   */
  static getVisible(observer: IFEntity, world: WorldModel): IFEntity[] {
    const visible: IFEntity[] = [];
    const seen = new Set<string>(); // Track what we've already added
    const observerRoom = world.getContainingRoom(observer.id);
    
    if (!observerRoom) return visible;

    // Add the room itself if visible
    if (this.canSee(observer, observerRoom, world)) {
      visible.push(observerRoom);
      seen.add(observerRoom.id);
    }

    // Dark to this observer (ADR-240, ADR-328 D5): only specific things
    if (this.isDarkFor(observer, observerRoom, world)) {
      // Can always see what you're carrying (by feel)
      const carried = world.getContents(observer.id);
      for (const entity of carried) {
        if (!seen.has(entity.id)) {
          visible.push(entity);
          seen.add(entity.id);
        }
      }
      
      // Add any light in the room that is giving light (ADR-374 D10)
      const roomContents = world.getAllContents(observerRoom.id, { recursive: true });
      for (const entity of roomContents) {
        if (entity.hasTrait(TraitType.LIGHT_SOURCE) && LightSourceBehavior.givesLight(entity, world) && !seen.has(entity.id)) {
          visible.push(entity);
          seen.add(entity.id);
        }
      }
      return visible;
    }

    // Get contents of the room
    const roomContents = world.getContents(observerRoom.id);
    
    // Add visible entities in the room (shared per-entity filter: concealed,
    // invisible scenery, capability veto)
    for (const entity of roomContents) {
      if (entity.id !== observer.id && !seen.has(entity.id)) {
        if (!this.isListable(entity, world, observer.id)) {
          continue;
        }

        visible.push(entity);
        seen.add(entity.id);
        
        // Check contents of this entity if it's a container/supporter/actor
        if (entity.hasTrait(TraitType.CONTAINER) || 
            entity.hasTrait(TraitType.SUPPORTER) || 
            entity.hasTrait(TraitType.ACTOR)) {
          this.addVisibleContents(entity, visible, seen, world);
        }
      }
    }
    
    // Doors and backdrops present here though their home is elsewhere
    // (David's ruling 2026-07-18; ADR-374 D1).
    for (const present of PresenceBehavior.presentAt(observerRoom.id, world)) {
      if (seen.has(present.id)) continue;
      if (this.canSee(observer, present, world)) {
        visible.push(present);
        seen.add(present.id);
      }
    }

    // In an expanse (ADR-376 D6): the landmark rooms, open vehicles and
    // floating things within sight, wherever the looker stands — a
    // landmark room's outlook reaches things in the expanse room, and a
    // ship's lookout reaches the landmark rooms.
    const lookout = lookoutOf(world, observer);
    if (lookout) {
      const own = getVehicleAboard(world, observer.id)?.id ?? observer.id;
      for (const sighting of sightings(world, lookout, undefined, own)) {
        if (seen.has(sighting.thing.id)) continue;
        if (this.canSee(observer, sighting.thing, world)) {
          visible.push(sighting.thing);
          seen.add(sighting.thing.id);
        }
      }
    }

    // Add carried items
    const carried = world.getContents(observer.id);
    for (const entity of carried) {
      if (!seen.has(entity.id)) {
        visible.push(entity);
        seen.add(entity.id);

        // Check contents of carried containers
        if (entity.hasTrait(TraitType.CONTAINER) || entity.hasTrait(TraitType.SUPPORTER)) {
          this.addVisibleContents(entity, visible, seen, world);
        }
      }
    }

    return visible;
  }

  /**
   * The direct contents of a container/supporter/actor that could appear in a
   * visible listing: applies the same per-entity filter as getVisible
   * (concealed, invisible scenery, visibility-capability veto) to
   * `getContents(id)` (worn items included by default, ADR-247).
   *
   * Does NOT check whether the container's inside is exposed (closed opaque
   * container) — callers listing contents have already established that, and
   * addVisibleContents keeps that gate itself.
   *
   * This is the shared read for LOOK's and EXAMINE's contents listings — a
   * still-concealed item stays out of both until SEARCH reveals it, by the
   * same definition scope resolution uses.
   *
   * @param container - The container/supporter/actor whose contents to list
   * @param world - The world model
   * @returns the listable direct contents
   */
  static getVisibleContents(container: IFEntity, world: WorldModel): IFEntity[] {
    // Note: no direct observer here — the container's id is the proxy passed
    // to visibility-capability behaviors, matching addVisibleContents.
    return world
      .getContents(container.id)  // ADR-247: worn items included by default
      .filter(entity => this.isListable(entity, world, container.id));
  }

  /**
   * Recursively adds visible contents of a container/supporter/actor
   */
  private static addVisibleContents(
    container: IFEntity,
    visible: IFEntity[],
    seen: Set<string>,
    world: WorldModel
  ): void {
    // Can't see inside a closed opaque container
    if (this.blocksSight(container)) {
      return;
    }

    // Contents that pass the shared per-entity filter (concealed, invisible
    // scenery, capability veto — one definition with getVisible)
    for (const entity of this.getVisibleContents(container, world)) {
      if (!seen.has(entity.id)) {
        visible.push(entity);
        seen.add(entity.id);

        // Recurse into nested containers
        if (entity.hasTrait(TraitType.CONTAINER) ||
            entity.hasTrait(TraitType.SUPPORTER) ||
            entity.hasTrait(TraitType.ACTOR)) {
          this.addVisibleContents(entity, visible, seen, world);
        }
      }
    }
  }



  /**
   * Checks if a room has any accessible, active light sources.
   * Handles nested containers, worn items, and various light source types.
   */
  private static hasLightSource(room: IFEntity, world: WorldModel): boolean {
    // Check all entities in the room, including worn items (ADR-247: default)
    const contents = world.getAllContents(room.id, { recursive: true });

    for (const entity of contents) {
      if (!entity.hasTrait(TraitType.LIGHT_SOURCE)) continue;

      // Is it giving light — lit, switched on, powered (ADR-374 D10)
      if (!LightSourceBehavior.givesLight(entity, world)) continue;

      // Check if the light is accessible (not in a closed container)
      if (!this.isAccessible(entity.id, room.id, world)) continue;

      return true;
    }

    return false;
  }

  /**
   * Walks the containment chain from an entity upward, checking whether any
   * closed opaque container blocks the path.
   *
   * This is the single implementation of the container-walk algorithm used by
   * `isAccessible`, `hasLineOfSight`, and `isVisible`.
   *
   * At each hop:
   * - Actors are transparent (carried/worn items are always reachable)
   * - Opaque closed containers block
   * - Transparent containers, open containers, and non-openable opaque containers pass
   *
   * @param entityId - Starting entity to walk upward from
   * @param world - The world model
   * @param stopAtId - Stop when this ancestor is reached (e.g., the room).
   *                   If omitted, walks until reaching a room or the top of the tree.
   * @returns true if no closed opaque container blocks the path
   */
  private static isContainmentPathClear(
    entityId: string,
    world: WorldModel,
    stopAtId?: string
  ): boolean {
    let current = entityId;

    while (true) {
      if (stopAtId !== undefined && current === stopAtId) return true;

      const parentId = world.getLocation(current);
      if (!parentId) return true;

      const container = world.getEntity(parentId);
      if (!container) return true;

      // Actors don't block access/visibility of their contents
      if (container.hasTrait(TraitType.ACTOR)) {
        current = parentId;
        continue;
      }

      // Opaque + closed containers block the path
      if (this.blocksSight(container)) {
        return false;
      }

      // Stop at rooms (natural top of containment)
      if (container.hasTrait(TraitType.ROOM)) return true;

      current = parentId;
    }
  }

  /**
   * Checks if an entity is accessible from a room (not blocked by closed containers)
   */
  private static isAccessible(entityId: string, roomId: string, world: WorldModel): boolean {
    return this.isContainmentPathClear(entityId, world, roomId);
  }

  /**
   * Checks if there's a line of sight between observer and target.
   * Walks the target's containment chain to verify no closed opaque container
   * blocks visibility.
   */
  private static hasLineOfSight(observerId: string, targetId: string, world: WorldModel): boolean {
    return this.isContainmentPathClear(targetId, world);
  }

  /**
   * Checks if an entity is visible in its current context
   * (used for filtering queries)
   */
  static isVisible(entity: IFEntity, world: WorldModel): boolean {
    // Concealed entities are hidden until revealed (shared definition)
    if (this.isConcealed(entity)) {
      return false;
    }

    // Check if explicitly invisible via SceneryTrait
    const scenery = entity.getTrait(SceneryTrait);
    if (scenery && scenery.visible === false) {
      return false;
    }

    // Check if entity has visibility capability that blocks being seen
    // Note: For isVisible we don't have an observer, so we pass empty string
    const visibilityTrait = findTraitWithCapability(entity, VISIBILITY_CAPABILITY);
    if (visibilityTrait) {
      const behavior = world.getBehaviorForCapability(visibilityTrait, VISIBILITY_CAPABILITY);
      if (behavior) {
        const result = behavior.validate(entity, world, '', {});
        if (!result.valid) {
          return false; // Entity blocks visibility via capability
        }
      }
    }

    // Check containment path for closed opaque containers
    return this.isContainmentPathClear(entity.id, world);
  }

  /**
   * Gets the location that should be described when an observer looks around.
   * One rule over any enclosure (container, supporter, vehicle):
   * - In or on an enclosure that does not block sight → describe the room
   * - In a closed, opaque, openable container → describe the container
   * - In a room → describe the room
   *
   * @returns The entity to describe and optionally the immediate container
   */
  static getDescribableLocation(
    observer: IFEntity,
    world: WorldModel
  ): { location: IFEntity; immediateContainer: IFEntity | null } {
    const immediateLocationId = world.getLocation(observer.id);
    if (!immediateLocationId) {
      // Observer is not in anything - unusual but handle it
      return { location: observer, immediateContainer: null };
    }

    const immediateLocation = world.getEntity(immediateLocationId);
    if (!immediateLocation) {
      return { location: observer, immediateContainer: null };
    }

    // If immediate location is a room, we're done
    if (immediateLocation.hasTrait(TraitType.ROOM)) {
      return { location: immediateLocation, immediateContainer: null };
    }

    // One rule for any enclosure the observer is in (ADR-366 D3): they see
    // out unless it blocks sight, and then the enclosure is the place.
    if (this.isEnclosure(immediateLocation) && !this.blocksSight(immediateLocation)) {
      const room = world.getContainingRoom(observer.id);
      if (room) {
        return { location: room, immediateContainer: immediateLocation };
      }
    }

    return { location: immediateLocation, immediateContainer: null };
  }

  /** Something an actor can be in or on: a container, a supporter or a vehicle. */
  private static isEnclosure(entity: IFEntity): boolean {
    return entity.hasTrait(TraitType.CONTAINER)
      || entity.hasTrait(TraitType.SUPPORTER)
      || entity.hasTrait(TraitType.VEHICLE);
  }

  /**
   * Whether an entity blocks sight between its inside and outside: a
   * container that is openable, closed and not transparent. Anything held
   * on top (a supporter, a vehicle ridden `on`) never does, nor does an
   * open, lidless or transparent container. The one definition for
   * scope, reach, the describable location, and every action that asks
   * whether a container's contents can be seen (searching, examining).
   *
   * @param entity - Any entity
   * @returns true when its inside cannot be seen from outside, nor out from in
   */
  static blocksSight(entity: IFEntity): boolean {
    if (!entity.hasTrait(TraitType.CONTAINER)) return false;
    if (entity.getTrait(EnterableTrait)?.preposition === 'on') return false;
    if (entity.getTrait(ContainerTrait)?.isTransparent) return false;
    if (!entity.hasTrait(TraitType.OPENABLE)) return false;
    return !(entity.getTrait(OpenableTrait)?.isOpen ?? false);
  }
}
