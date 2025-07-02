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
      return observerRoom?.id === target.id;
    }

    if (!observerRoom || observerRoom.id !== targetRoom?.id) {
      return false;
    }

    // Check if room is dark
    if (this.isRoomDark(observerRoom, world)) {
      // Can only see light sources in the dark
      return target.hasTrait(TraitType.LIGHT_SOURCE) && 
             (target.getTrait(TraitType.LIGHT_SOURCE) as any)?.isOn === true;
    }

    // Check line of sight through containers
    return this.hasLineOfSight(observer.id, target.id, world);
  }

  /**
   * Gets all entities visible to an observer
   */
  static getVisible(observer: IFEntity, world: WorldModel): IFEntity[] {
    const visible: IFEntity[] = [];
    const observerRoom = world.getContainingRoom(observer.id);
    
    if (!observerRoom) return visible;

    // Add the room itself if visible
    if (this.canSee(observer, observerRoom, world)) {
      visible.push(observerRoom);
    }

    // Check all entities in scope
    const inScope = world.getInScope(observer.id);
    
    for (const entity of inScope) {
      if (entity.id !== observer.id && this.canSee(observer, entity, world)) {
        visible.push(entity);
      }
    }

    return visible;
  }

  /**
   * Checks if a room is dark (no active light sources)
   */
  private static isRoomDark(room: IFEntity, world: WorldModel): boolean {
    // Check if room itself is a light source
    if (room.hasTrait(TraitType.LIGHT_SOURCE)) {
      const light = room.getTrait(TraitType.LIGHT_SOURCE);
      if ((light as any)?.isOn) return false;
    }

    // Check for any active light sources in the room
    const contents = world.getAllContents(room.id, { recursive: true });
    
    for (const entity of contents) {
      if (entity.hasTrait(TraitType.LIGHT_SOURCE)) {
        const light = entity.getTrait(TraitType.LIGHT_SOURCE);
        if ((light as any)?.isOn) return false;
      }
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

      // If it's in a container, check if we can see inside
      if (containerEntity.hasTrait(TraitType.CONTAINER)) {
        const containerTrait = containerEntity.getTrait(TraitType.CONTAINER);
        
        // Opaque containers block sight when closed
        if (!(containerTrait as any)?.isTransparent && 
            containerEntity.hasTrait(TraitType.OPENABLE)) {
          const openable = containerEntity.getTrait(TraitType.OPENABLE);
          if (!(openable as any)?.isOpen) return false;
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

    // Check if in a closed opaque container
    const location = world.getLocation(entity.id);
    if (!location) return true; // Not contained, so visible

    const container = world.getEntity(location);
    if (!container) return true;

    // Only hidden if in a closed, opaque container
    if (container.hasTrait(TraitType.CONTAINER)) {
      const containerTrait = container.getTrait(TraitType.CONTAINER);
      if (!(containerTrait as any)?.isTransparent && container.hasTrait(TraitType.OPENABLE)) {
        const openable = container.getTrait(TraitType.OPENABLE);
        return (openable as any)?.isOpen === true;
      }
    }

    return true;
  }
}
