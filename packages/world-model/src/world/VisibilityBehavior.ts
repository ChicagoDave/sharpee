// VisibilityBehavior.ts - Visibility system for IF

import { Behavior } from '../behaviors/behavior';
import { IFEntity } from '../entities/if-entity';
import { WorldModel } from './WorldModel';
import { TraitType } from '../traits/trait-types';
import { SwitchableBehavior } from '../traits/switchable/switchableBehavior';
import { VehicleTrait } from '../traits/vehicle/vehicleTrait';
import { RoomTrait } from '../traits/room/roomTrait';
import { ContainerTrait } from '../traits/container/containerTrait';
import { OpenableTrait } from '../traits/openable/openableTrait';
import { LightSourceTrait } from '../traits/light-source/lightSourceTrait';
import { SceneryTrait } from '../traits/scenery/sceneryTrait';
import { IdentityTrait } from '../traits/identity/identityTrait';
import { findTraitWithCapability, getBehaviorForCapability } from '../capabilities';

/**
 * Standard capability ID for visibility control.
 * Entities can claim this capability to control their own visibility.
 */
export const VISIBILITY_CAPABILITY = 'if.scope.visible';

export class VisibilityBehavior extends Behavior {
  static requiredTraits = [];

  /**
   * Determines if a room is effectively dark (no usable light sources).
   * This is the single source of truth for darkness checking.
   *
   * A room is dark if:
   * 1. It has RoomTrait with isDark = true
   * 2. There are no accessible, active light sources
   *
   * @param room - The room entity to check
   * @param world - The world model
   * @returns true if the room is dark and has no accessible light sources
   */
  static isDark(room: IFEntity, world: WorldModel): boolean {
    const roomTrait = room.getTrait(RoomTrait);
    if (!roomTrait || !roomTrait.isDark) {
      return false; // Room isn't marked as dark
    }
    return !this.hasLightSource(room, world);
  }

  /**
   * Determines if a light source entity is currently providing light.
   * Checks isLit property first, falls back to switchable state, defaults to lit.
   *
   * Priority order:
   * 1. Explicit isLit property (e.g., lit torch, extinguished candle)
   * 2. Switchable trait state (e.g., flashlight isOn: true)
   * 3. Default to lit (e.g., glowing gems, phosphorescent moss)
   */
  private static isLightActive(entity: IFEntity): boolean {
    const lightTrait = entity.getTrait(LightSourceTrait);

    // Explicit isLit property takes precedence
    if (lightTrait?.isLit !== undefined) {
      return lightTrait.isLit === true;
    }

    // Fall back to switchable state
    if (entity.hasTrait(TraitType.SWITCHABLE)) {
      return SwitchableBehavior.isOn(entity);
    }

    // Default: light sources without explicit state are lit
    return true;
  }

  /**
   * Determines if an observer can see a target entity
   */
  static canSee(observer: IFEntity, target: IFEntity, world: WorldModel): boolean {
    // Can always see self
    if (observer.id === target.id) return true;

    // Check if target is invisible via SceneryTrait
    const targetScenery = target.getTrait(SceneryTrait);
    if (targetScenery && targetScenery.visible === false) {
      return false;
    }

    // Check if target has visibility capability that blocks being seen
    const visibilityTrait = findTraitWithCapability(target, VISIBILITY_CAPABILITY);
    if (visibilityTrait) {
      const behavior = getBehaviorForCapability(visibilityTrait, VISIBILITY_CAPABILITY);
      if (behavior) {
        const result = behavior.validate(target, world, observer.id, {});
        if (!result.valid) {
          return false; // Entity blocks visibility via capability
        }
      }
    }

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

    if (!observerRoom || observerRoom.id !== targetRoom?.id) {
      return false;
    }

    // Check if room is dark
    const roomTrait = observerRoom.getTrait(RoomTrait);
    if (roomTrait && roomTrait.isDark) {
      // In a dark room, need light to see
      if (!this.hasLightSource(observerRoom, world)) {
        // Special cases in darkness:
        // 1. Can see lit light sources
        if (target.hasTrait(TraitType.LIGHT_SOURCE) &&
            target.getTrait(LightSourceTrait)?.isLit === true) {
          return true;
        }
        // 2. Can see items you're carrying (by feel)
        const targetLocation = world.getLocation(target.id);
        if (targetLocation === observer.id) {
          return true;
        }
        // Otherwise can't see in darkness
        return false;
      }
    }

    // Check line of sight through containers
    const hasLineOfSight = this.hasLineOfSight(observer.id, target.id, world);
    return hasLineOfSight;
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

    // Check if room is dark
    const roomTrait = observerRoom.getTrait(RoomTrait);
    const isDark = roomTrait && roomTrait.isDark;
    const hasLight = this.hasLightSource(observerRoom, world);
    
    // If it's dark and no light, only see specific things
    if (isDark && !hasLight) {
      // Can always see what you're carrying (by feel)
      const carried = world.getContents(observer.id);
      for (const entity of carried) {
        if (!seen.has(entity.id)) {
          visible.push(entity);
          seen.add(entity.id);
        }
      }
      
      // Add any lit light sources in the room
      const roomContents = world.getAllContents(observerRoom.id, { recursive: true });
      for (const entity of roomContents) {
        if (entity.hasTrait(TraitType.LIGHT_SOURCE)) {
          const light = entity.getTrait(LightSourceTrait);
          if (light && light.isLit === true && !seen.has(entity.id)) {
            visible.push(entity);
            seen.add(entity.id);
          }
        }
      }
      return visible;
    }

    // Get contents of the room
    const roomContents = world.getContents(observerRoom.id);
    
    // Add visible entities in the room
    for (const entity of roomContents) {
      if (entity.id !== observer.id && !seen.has(entity.id)) {
        // Check if entity is concealed (hidden until revealed via SEARCH or game event)
        const identity = entity.getTrait(IdentityTrait);
        if (identity && identity.concealed === true) {
          continue;
        }

        // Check if entity is visible via SceneryTrait
        const scenery = entity.getTrait(SceneryTrait);
        if (scenery && scenery.visible === false) {
          continue;
        }

        // Check if entity has visibility capability that blocks being seen
        const visibilityTrait = findTraitWithCapability(entity, VISIBILITY_CAPABILITY);
        if (visibilityTrait) {
          const behavior = getBehaviorForCapability(visibilityTrait, VISIBILITY_CAPABILITY);
          if (behavior) {
            const result = behavior.validate(entity, world, observer.id, {});
            if (!result.valid) {
              continue; // Entity blocks visibility via capability
            }
          }
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
   * Recursively adds visible contents of a container/supporter/actor
   */
  private static addVisibleContents(
    container: IFEntity, 
    visible: IFEntity[], 
    seen: Set<string>, 
    world: WorldModel
  ): void {
    // Check if we can see inside this container
    if (container.hasTrait(TraitType.CONTAINER)) {
      const containerTrait = container.getTrait(ContainerTrait);
      const isTransparent = containerTrait?.isTransparent ?? false;

      if (!isTransparent && container.hasTrait(TraitType.OPENABLE)) {
        const openable = container.getTrait(OpenableTrait);
        const isOpen = openable?.isOpen ?? false;
        if (!isOpen) {
          return; // Can't see inside closed opaque container
        }
      }
    }
    
    // Get contents (including worn items for actors)
    const contents = world.getContents(container.id, { includeWorn: true });
    
    for (const entity of contents) {
      if (!seen.has(entity.id)) {
        // Check if entity is visible via SceneryTrait
        const scenery = entity.getTrait(SceneryTrait);
        if (scenery && scenery.visible === false) {
          continue;
        }

        // Check if entity has visibility capability that blocks being seen
        const visibilityTrait = findTraitWithCapability(entity, VISIBILITY_CAPABILITY);
        if (visibilityTrait) {
          const behavior = getBehaviorForCapability(visibilityTrait, VISIBILITY_CAPABILITY);
          if (behavior) {
            // Note: We don't have a direct observer here, use container's id as proxy
            const result = behavior.validate(entity, world, container.id, {});
            if (!result.valid) {
              continue; // Entity blocks visibility via capability
            }
          }
        }

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
    // Check all entities in the room, including worn items
    const contents = world.getAllContents(room.id, { recursive: true, includeWorn: true });

    for (const entity of contents) {
      if (!entity.hasTrait(TraitType.LIGHT_SOURCE)) continue;

      // Check if light is active (isLit, switchable, or default)
      if (!this.isLightActive(entity)) continue;

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
      if (container.hasTrait(TraitType.CONTAINER)) {
        const containerTrait = container.getTrait(ContainerTrait);
        const isTransparent = containerTrait?.isTransparent ?? false;
        if (!isTransparent && container.hasTrait(TraitType.OPENABLE)) {
          const openable = container.getTrait(OpenableTrait);
          const isOpen = openable?.isOpen ?? false;
          if (!isOpen) {
            return false;
          }
        }
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
    // Check if explicitly invisible via SceneryTrait
    const scenery = entity.getTrait(SceneryTrait);
    if (scenery && scenery.visible === false) {
      return false;
    }

    // Check if entity has visibility capability that blocks being seen
    // Note: For isVisible we don't have an observer, so we pass empty string
    const visibilityTrait = findTraitWithCapability(entity, VISIBILITY_CAPABILITY);
    if (visibilityTrait) {
      const behavior = getBehaviorForCapability(visibilityTrait, VISIBILITY_CAPABILITY);
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
   * Accounts for vehicle/container transparency:
   * - In a transparent vehicle → describe the room
   * - In an open container → describe the room
   * - In a closed container → describe the container
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

    // Check if we're in a vehicle
    if (immediateLocation.hasTrait(TraitType.VEHICLE)) {
      const vehicleTrait = immediateLocation.getTrait(VehicleTrait);
      if (vehicleTrait?.transparent) {
        // Transparent vehicle - describe the room
        const room = world.getContainingRoom(observer.id);
        if (room) {
          return { location: room, immediateContainer: immediateLocation };
        }
      }
      // Opaque vehicle - describe the vehicle interior
      return { location: immediateLocation, immediateContainer: null };
    }

    // Check if we're in a container
    if (immediateLocation.hasTrait(TraitType.CONTAINER)) {
      // Check if container is open (visibility passes through)
      if (immediateLocation.hasTrait(TraitType.OPENABLE)) {
        const openable = immediateLocation.getTrait(OpenableTrait);
        if (openable?.isOpen) {
          // Open container - describe the room
          const room = world.getContainingRoom(observer.id);
          if (room) {
            return { location: room, immediateContainer: immediateLocation };
          }
        }
      }
      // Closed container - describe the container
      return { location: immediateLocation, immediateContainer: null };
    }

    // Default: describe what we're in
    return { location: immediateLocation, immediateContainer: null };
  }
}
