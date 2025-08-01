// VisibilityBehavior.ts - Visibility system for IF

import { Behavior } from '../behaviors/behavior';
import { IFEntity } from '../entities/if-entity';
import { WorldModel } from './WorldModel';
import { TraitType } from '../traits/trait-types';

export class VisibilityBehavior extends Behavior {
  static requiredTraits = [];

  /**
   * Determines if an observer can see a target entity
   */
  static canSee(observer: IFEntity, target: IFEntity, world: WorldModel): boolean {
    // Can always see self
    if (observer.id === target.id) return true;

    // Check if target is invisible
    const targetScenery = target.getTrait(TraitType.SCENERY);
    if (targetScenery && (targetScenery as any).visible === false) {
      return false;
    }

    // Get rooms
    const observerRoom = world.getContainingRoom(observer.id);
    const targetRoom = world.getContainingRoom(target.id);

    // Must be in same room (or target is the room)
    if (target.hasTrait(TraitType.ROOM)) {
      // Check if we're in the target room
      if (observerRoom?.id === target.id) {
        // In a dark room, can't see the room itself without light
        const roomTrait = target.getTrait(TraitType.ROOM);
        if (roomTrait && (roomTrait as any).isDark && !this.hasLightSource(target, world)) {
          return false;
        }
        return true;
      }
      return false;
    }

    if (!observerRoom || observerRoom.id !== targetRoom?.id) {
      return false;
    }

    // Check if room is dark
    const roomTrait = observerRoom.getTrait(TraitType.ROOM);
    if (roomTrait && (roomTrait as any).isDark) {
      // In a dark room, need light to see
      if (!this.hasLightSource(observerRoom, world)) {
        // Can only see light sources themselves when they're on
        return target.hasTrait(TraitType.LIGHT_SOURCE) && 
               (target.getTrait(TraitType.LIGHT_SOURCE) as any)?.isLit === true;
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

    // Check all entities in scope (including worn items)
    const inScope = world.getInScope(observer.id);
    
    for (const entity of inScope) {
      if (entity.id !== observer.id && 
          !seen.has(entity.id) && 
          this.canSee(observer, entity, world)) {
        visible.push(entity);
        seen.add(entity.id);
      }
    }

    return visible;
  }



  /**
   * Checks if a room has any active light sources
   */
  private static hasLightSource(room: IFEntity, world: WorldModel): boolean {
    // Check all entities in the room
    const contents = world.getAllContents(room.id, { recursive: true });
    
    for (const entity of contents) {
      if (entity.hasTrait(TraitType.LIGHT_SOURCE)) {
        const light = entity.getTrait(TraitType.LIGHT_SOURCE) as any;
        if (light && light.isLit === true) {
          // Check if the light is accessible (not in a closed container)
          if (this.isAccessible(entity.id, room.id, world)) {
            return true;
          }
        }
      }
    }
    
    return false;
  }

  /**
   * Checks if an entity is accessible from a room (not blocked by closed containers)
   */
  private static isAccessible(entityId: string, roomId: string, world: WorldModel): boolean {
    let current = entityId;
    
    while (current !== roomId) {
      const parent = world.getLocation(current);
      if (!parent) return false;
      
      const container = world.getEntity(parent);
      if (!container) return false;
      
      // Actors don't block access to their contents
      if (container.hasTrait(TraitType.ACTOR)) {
        // Items carried by actors are accessible
        current = parent;
        continue;
      }
      
      // If it's in an opaque, closed container, it's not accessible
      if (container.hasTrait(TraitType.CONTAINER)) {
        const containerTrait = container.getTrait(TraitType.CONTAINER) as any;
        const isTransparent = containerTrait?.isTransparent ?? false;
        if (!isTransparent) {
          if (container.hasTrait(TraitType.OPENABLE)) {
            const openable = container.getTrait(TraitType.OPENABLE) as any;
            const isOpen = openable?.isOpen ?? false;
            if (!isOpen) {
              return false; // Closed opaque container blocks access
            }
          }
        }
      }
      
      current = parent;
    }
    
    return true;
  }

  /**
   * Checks if there's a line of sight between observer and target
   */
  private static hasLineOfSight(observerId: string, targetId: string, world: WorldModel): boolean {
    // Get the containment path from target to room
    const targetPath = this.getContainmentPath(targetId, world);
    
    // Check each container in the path
    for (let i = 0; i < targetPath.length - 1; i++) {
      const contained = targetPath[i];
      const container = targetPath[i + 1];
      
      const containerEntity = world.getEntity(container);
      if (!containerEntity) return false;

      // Actors are always visible-through (can see their inventory/worn items)
      if (containerEntity.hasTrait(TraitType.ACTOR)) {
        // Can always see what actors are carrying/wearing
        continue;
      }
      
      // If it's in a container, check if we can see inside
      if (containerEntity.hasTrait(TraitType.CONTAINER)) {
        const containerTrait = containerEntity.getTrait(TraitType.CONTAINER) as any;
        
        // Opaque containers block sight when closed
        // Default isTransparent to false if not specified
        const isTransparent = containerTrait?.isTransparent ?? false;
        if (!isTransparent) {
          // If it's opaque, check if it's openable and closed
          if (containerEntity.hasTrait(TraitType.OPENABLE)) {
            const openable = containerEntity.getTrait(TraitType.OPENABLE) as any;
            // Default isOpen to false if not specified
            const isOpen = openable?.isOpen ?? false;
            if (!isOpen) {
              return false; // Closed opaque container blocks sight
            }
          }
          // If opaque but not openable, we can see through (it can't be closed)
        }
      }
    }

    return true;
  }

  /**
   * Gets the containment path from an entity to its room
   */
  private static getContainmentPath(entityId: string, world: WorldModel): string[] {
    const path: string[] = [entityId];
    let current = entityId;
    let depth = 0;
    const maxDepth = 10;

    while (depth < maxDepth) {
      const parent = world.getLocation(current);
      if (!parent) break;
      
      path.push(parent);
      
      const parentEntity = world.getEntity(parent);
      if (parentEntity?.hasTrait(TraitType.ROOM)) break;
      
      current = parent;
      depth++;
    }

    return path;
  }

  /**
   * Checks if an entity is visible in its current context
   * (used for filtering queries)
   */
  static isVisible(entity: IFEntity, world: WorldModel): boolean {
    // Check if explicitly invisible
    const scenery = entity.getTrait(TraitType.SCENERY);
    if (scenery && (scenery as any).visible === false) {
      return false;
    }

    // Check containment path for closed opaque containers
    let current = entity.id;
    
    while (true) {
      const location = world.getLocation(current);
      if (!location) break; // Reached top level
      
      const container = world.getEntity(location);
      if (!container) break;
      
      // Actors don't block visibility of their contents
      if (container.hasTrait(TraitType.ACTOR)) {
        current = location;
        continue;
      }
      
      // Check if this container blocks visibility
      if (container.hasTrait(TraitType.CONTAINER)) {
        const containerTrait = container.getTrait(TraitType.CONTAINER) as any;
        
        // If container is opaque and closed, entity is not visible
        const isTransparent = containerTrait?.isTransparent ?? false;
        if (!isTransparent) {
          if (container.hasTrait(TraitType.OPENABLE)) {
            const openable = container.getTrait(TraitType.OPENABLE) as any;
            const isOpen = openable?.isOpen ?? false;
            if (!isOpen) {
              return false; // In closed opaque container
            }
          }
          // Opaque but not openable - can see through
        }
      }
      
      current = location;
    }

    return true;
  }
}
