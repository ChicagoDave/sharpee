/**
 * Visibility Service
 * 
 * Handles scope calculations, visibility checks, and reachability
 * for the standard library.
 */

import { Entity as IFEntity, World as IFWorld } from '@sharpee/core';
import { 
  TraitType, 
  RoomBehavior,
  ContainerBehavior,
  OpenableBehavior,
  LightSourceBehavior,
  SceneryBehavior
} from '@sharpee/world-model';

export class VisibilityService {
  constructor(private world: IFWorld) {}

  /**
   * Get all entities visible to an observer
   */
  getVisibleEntities(observer: IFEntity): IFEntity[] {
    const visible: Set<IFEntity> = new Set();
    const observerLocation = this.world.getLocation(observer.id);
    
    if (!observerLocation) return [];
    
    const room = this.world.getEntity(observerLocation);
    if (!room) return [];

    // Check if room is dark
    if (this.isRoomDark(room)) {
      // In darkness, can only see light sources
      return this.getLightSourcesInScope(observer);
    }

    // Add the room itself
    visible.add(room);

    // Add room contents
    this.addVisibleContents(room, visible, observer);

    // Add observer's inventory
    this.addVisibleContents(observer, visible, observer);

    // Remove the observer from visible set
    visible.delete(observer);

    return Array.from(visible);
  }

  /**
   * Get all entities reachable by an observer
   */
  getReachableEntities(observer: IFEntity): IFEntity[] {
    const reachable: Set<IFEntity> = new Set();
    const observerLocation = this.world.getLocation(observer.id);
    
    if (!observerLocation) return [];
    
    const room = this.world.getEntity(observerLocation);
    if (!room) return [];

    // Can reach things in the room
    this.addReachableContents(room, reachable, observer);

    // Can reach things in inventory
    this.addReachableContents(observer, reachable, observer);

    // Can reach things on supporters in the room
    const roomContents = this.world.getContents(room.id);
    for (const item of roomContents) {
      if (item.has(TraitType.SUPPORTER)) {
        this.addReachableContents(item, reachable, observer);
      }
    }

    // Remove the observer from reachable set
    reachable.delete(observer);

    return Array.from(reachable);
  }

  /**
   * Check if observer can see a target
   */
  canSee(observer: IFEntity, target: IFEntity): boolean {
    // Can always see yourself
    if (observer.id === target.id) return true;

    // Check if in same room or inventory
    const observerLocation = this.world.getLocation(observer.id);
    const targetLocation = this.world.getLocation(target.id);

    if (!observerLocation || !targetLocation) return false;

    // If target is in observer's inventory, can see it
    if (targetLocation === observer.id) return true;

    // If in same room
    if (observerLocation === targetLocation) {
      const room = this.world.getEntity(observerLocation);
      if (!room) return false;
      
      // Check if room is dark
      if (this.isRoomDark(room)) {
        // Can only see light sources in the dark
        return target.has(TraitType.LIGHT_SOURCE) && 
               LightSourceBehavior.isLit(target);
      }
      
      return true;
    }

    // Check if target is in a visible container
    return this.isInVisibleContainer(target, observer);
  }

  /**
   * Check if observer can reach a target
   */
  canReach(observer: IFEntity, target: IFEntity): boolean {
    // Can always reach yourself
    if (observer.id === target.id) return true;

    // Check basic visibility first
    if (!this.canSee(observer, target)) return false;

    const targetLocation = this.world.getLocation(target.id);
    if (!targetLocation) return false;

    // If in inventory, can reach
    if (targetLocation === observer.id) return true;

    // If in same room, can reach
    const observerLocation = this.world.getLocation(observer.id);
    if (observerLocation === targetLocation) return true;

    // Check if in an open container in the room or on a supporter
    const container = this.world.getEntity(targetLocation);
    if (!container) return false;

    // If on a supporter in the same room, can reach
    if (container.has(TraitType.SUPPORTER)) {
      const supporterLocation = this.world.getLocation(container.id);
      return supporterLocation === observerLocation;
    }

    // If in a container, check if it's open and in reach
    if (container.has(TraitType.CONTAINER)) {
      // Container must be reachable
      if (!this.canReach(observer, container)) return false;
      
      // If container is openable, must be open
      if (container.has(TraitType.OPENABLE)) {
        return OpenableBehavior.isOpen(container);
      }
      
      // Non-openable containers are always accessible
      return true;
    }

    return false;
  }

  /**
   * Find path from observer to target
   * Returns array of entities that form the path, or null if no path
   */
  findPath(observer: IFEntity, target: IFEntity): IFEntity[] | null {
    // Simple implementation for now - just checks direct containment
    const path: IFEntity[] = [];
    
    let current = target;
    let currentLocation = this.world.getLocation(current.id);
    
    while (currentLocation) {
      const container = this.world.getEntity(currentLocation);
      if (!container) break;
      
      path.unshift(container);
      
      if (container.id === observer.id) {
        return path;
      }
      
      const observerLocation = this.world.getLocation(observer.id);
      if (container.id === observerLocation) {
        return path;
      }
      
      current = container;
      currentLocation = this.world.getLocation(current.id);
    }
    
    return null;
  }

  /**
   * Get obstructions between observer and target
   */
  getObstructions(observer: IFEntity, target: IFEntity): IFEntity[] {
    const obstructions: IFEntity[] = [];
    
    // If can reach, no obstructions
    if (this.canReach(observer, target)) return obstructions;
    
    // Find what's blocking
    const targetLocation = this.world.getLocation(target.id);
    if (!targetLocation) return obstructions;
    
    const container = this.world.getEntity(targetLocation);
    if (!container) return obstructions;
    
    // If in a closed container, that's the obstruction
    if (container.has(TraitType.CONTAINER) && 
        container.has(TraitType.OPENABLE) &&
        !OpenableBehavior.isOpen(container)) {
      obstructions.push(container);
    }
    
    return obstructions;
  }

  /**
   * Check if a room is dark
   */
  private isRoomDark(room: IFEntity): boolean {
    if (!room.has(TraitType.ROOM)) return false;
    
    // Use RoomBehavior to check darkness
    return RoomBehavior.isDark(room, this.world);
  }

  /**
   * Get light sources visible in scope
   */
  private getLightSourcesInScope(observer: IFEntity): IFEntity[] {
    const lights: IFEntity[] = [];
    const observerLocation = this.world.getLocation(observer.id);
    
    if (!observerLocation) return lights;
    
    // Check room contents
    const room = this.world.getEntity(observerLocation);
    if (room) {
      this.findLightSources(room, lights);
    }
    
    // Check inventory
    this.findLightSources(observer, lights);
    
    return lights;
  }

  /**
   * Recursively find light sources in a container
   */
  private findLightSources(container: IFEntity, lights: IFEntity[]): void {
    const contents = this.world.getContents(container.id);
    
    for (const item of contents) {
      if (item.has(TraitType.LIGHT_SOURCE) && LightSourceBehavior.isLit(item)) {
        lights.push(item);
      }
      
      // Check inside open containers
      if (item.has(TraitType.CONTAINER)) {
        if (!item.has(TraitType.OPENABLE) || OpenableBehavior.isOpen(item)) {
          this.findLightSources(item, lights);
        }
      }
    }
  }

  /**
   * Add visible contents of a container to the visible set
   */
  private addVisibleContents(
    container: IFEntity, 
    visible: Set<IFEntity>, 
    observer: IFEntity
  ): void {
    const contents = this.world.getContents(container.id);
    
    for (const item of contents) {
      visible.add(item);
      
      // Look inside open containers
      if (item.has(TraitType.CONTAINER)) {
        if (!item.has(TraitType.OPENABLE) || OpenableBehavior.isOpen(item)) {
          this.addVisibleContents(item, visible, observer);
        }
      }
      
      // Look on supporters
      if (item.has(TraitType.SUPPORTER)) {
        this.addVisibleContents(item, visible, observer);
      }
    }
  }

  /**
   * Add reachable contents of a container to the reachable set
   */
  private addReachableContents(
    container: IFEntity, 
    reachable: Set<IFEntity>, 
    observer: IFEntity
  ): void {
    const contents = this.world.getContents(container.id);
    
    for (const item of contents) {
      reachable.add(item);
      
      // Can reach into open containers
      if (item.has(TraitType.CONTAINER)) {
        if (!item.has(TraitType.OPENABLE) || OpenableBehavior.isOpen(item)) {
          this.addReachableContents(item, reachable, observer);
        }
      }
    }
  }

  /**
   * Check if target is in a visible container
   */
  private isInVisibleContainer(target: IFEntity, observer: IFEntity): boolean {
    let current = this.world.getLocation(target.id);
    
    while (current) {
      const container = this.world.getEntity(current);
      if (!container) return false;
      
      // If we reach observer's location or inventory, it's visible
      const observerLocation = this.world.getLocation(observer.id);
      if (current === observer.id || current === observerLocation) {
        return true;
      }
      
      // If in a closed container, not visible
      if (container.has(TraitType.CONTAINER) && 
          container.has(TraitType.OPENABLE) &&
          !OpenableBehavior.isOpen(container)) {
        return false;
      }
      
      current = this.world.getLocation(current);
    }
    
    return false;
  }
}
