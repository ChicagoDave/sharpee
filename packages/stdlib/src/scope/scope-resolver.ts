/**
 * Core scope resolver implementation
 * 
 * Determines what entities are physically perceivable by actors
 * based on IF conventions and physical laws.
 */

import { IFEntity, WorldModel, TraitType } from '@sharpee/world-model';
import { ScopeLevel, ScopeResolver } from './types';

/**
 * Standard implementation of scope resolution for IF games
 */
export class StandardScopeResolver implements ScopeResolver {
  constructor(private world: WorldModel) {}

  /**
   * Get the highest level of scope for a target entity
   */
  getScope(actor: IFEntity, target: IFEntity): ScopeLevel {
    // Carried items are always in scope
    if (this.isCarried(actor, target)) {
      return ScopeLevel.CARRIED;
    }

    // Check physical reachability first (most restrictive)
    if (this.canReach(actor, target)) {
      return ScopeLevel.REACHABLE;
    }

    // Check visibility
    if (this.canSee(actor, target)) {
      return ScopeLevel.VISIBLE;
    }

    // Check hearing
    if (this.canHear(actor, target)) {
      return ScopeLevel.AUDIBLE;
    }

    // Check smell
    if (this.canSmell(actor, target)) {
      return ScopeLevel.DETECTABLE;
    }

    return ScopeLevel.OUT_OF_SCOPE;
  }

  /**
   * Check if actor can see the target
   */
  canSee(actor: IFEntity, target: IFEntity): boolean {
    // Get locations
    const actorLocation = this.world.getLocation(actor.id);
    const targetLocation = this.world.getLocation(target.id);

    if (!actorLocation || !targetLocation) {
      return false;
    }

    // Check if in same room or connected space
    const actorRoom = this.getContainingRoom(actor.id);
    const targetRoom = this.getContainingRoom(target.id);

    if (!actorRoom || !targetRoom) {
      return false;
    }

    // Check for darkness
    if (this.isInDarkness(actorRoom) && !this.hasLightSource(actor)) {
      return false;
    }

    // Different rooms = can't see (TODO: handle open doors, windows)
    if (actorRoom.id !== targetRoom.id) {
      return false;
    }

    // Same room - check for blocking containers
    return this.isVisibleInContainer(target.id, actor.id);
  }

  /**
   * Check if actor can physically reach the target
   */
  canReach(actor: IFEntity, target: IFEntity): boolean {
    // Must be visible first
    if (!this.canSee(actor, target)) {
      return false;
    }

    // Check if in inventory
    if (this.isCarried(actor, target)) {
      return true;
    }

    // Get locations
    const actorLocation = this.world.getLocation(actor.id);
    const targetLocation = this.world.getLocation(target.id);

    // In same immediate location (e.g., both on table)
    if (actorLocation === targetLocation) {
      return true;
    }

    // Check if target is in/on something in the room
    const targetContainer = targetLocation ? this.world.getEntity(targetLocation) : null;
    if (targetContainer) {
      // On a supporter - reachable if we can see it
      if (targetContainer.has(TraitType.SUPPORTER)) {
        return true;
      }

      // In an open container - check depth
      if (targetContainer.has(TraitType.CONTAINER)) {
        const containerTrait = targetContainer.getTrait(TraitType.CONTAINER);
        
        // Must be open
        if (targetContainer.has(TraitType.OPENABLE)) {
          const openable = targetContainer.getTrait(TraitType.OPENABLE);
          if (openable && !(openable as any).isOpen) {
            return false;
          }
        }

        // TODO: Check container depth/size for reachability
        // For now, assume all open containers allow reach
        return true;
      }
    }


    // Default to reachable if in same room and visible
    return true;
  }

  /**
   * Check if actor can hear the target
   */
  canHear(actor: IFEntity, target: IFEntity): boolean {
    // Can't hear if no location
    const actorLocation = this.world.getLocation(actor.id);
    const targetLocation = this.world.getLocation(target.id);
    
    if (!actorLocation || !targetLocation) {
      return false;
    }

    // Get rooms
    const actorRoom = this.getContainingRoom(actor.id);
    const targetRoom = this.getContainingRoom(target.id);
    
    if (!actorRoom || !targetRoom) {
      return false;
    }

    // Same room - check if sound is blocked by containers
    if (actorRoom.id === targetRoom.id) {
      // Check if target is in a closed container that blocks sound
      if (this.isInClosedContainer(target.id)) {
        // Only loud sounds escape closed containers
        const identity = target.get(TraitType.IDENTITY);
        const isLoud = identity && 
          typeof identity === 'object' && 
          'customProperties' in identity &&
          (identity.customProperties as any)?.loud === true;
        
        return isLoud === true;
      }
      return true;
    }

    // Check if rooms are connected by an open door
    const connection = this.getRoomConnection(actorRoom, targetRoom);
    if (connection) {
      // Open doors allow full sound
      if (connection.isOpen) {
        return true;
      }
      // Closed doors muffle but don't block sound
      return true;
    }

    // TODO: Check for thin walls or other sound conductors
    // For now, sound doesn't travel between unconnected rooms
    return false;
  }

  /**
   * Check if actor can smell the target
   */
  canSmell(actor: IFEntity, target: IFEntity): boolean {
    // Can't smell if no location
    const actorLocation = this.world.getLocation(actor.id);
    const targetLocation = this.world.getLocation(target.id);
    
    if (!actorLocation || !targetLocation) {
      return false;
    }

    // Get rooms
    const actorRoom = this.getContainingRoom(actor.id);
    const targetRoom = this.getContainingRoom(target.id);
    
    if (!actorRoom || !targetRoom) {
      return false;
    }

    // Same room - check if scent is blocked by containers
    if (actorRoom.id === targetRoom.id) {
      // Closed containers block most scents
      if (this.isInClosedContainer(target.id)) {
        // Only very strong scents escape
        const identity = target.get(TraitType.IDENTITY);
        const isVerySmelly = identity && 
          typeof identity === 'object' && 
          'customProperties' in identity &&
          (identity.customProperties as any)?.verySmelly === true;
        
        return (isVerySmelly === true) && this.hasScent(target);
      }
      return this.hasScent(target);
    }

    // Check if rooms are connected and air can flow
    const connection = this.getRoomConnection(actorRoom, targetRoom);
    if (connection && connection.isOpen) {
      // Open connections allow scent to travel
      return this.hasScent(target);
    }

    // Scent doesn't travel through closed doors or unconnected rooms
    return false;
  }

  /**
   * Get all entities visible to the actor
   */
  getVisible(actor: IFEntity): IFEntity[] {
    const visible: IFEntity[] = [];
    const entities = this.world.getAllEntities();

    for (const entity of entities) {
      if (entity.id !== actor.id && this.canSee(actor, entity)) {
        visible.push(entity);
      }
    }

    return visible;
  }

  /**
   * Get all entities reachable by the actor
   */
  getReachable(actor: IFEntity): IFEntity[] {
    const reachable: IFEntity[] = [];
    const entities = this.world.getAllEntities();

    for (const entity of entities) {
      if (entity.id !== actor.id && this.canReach(actor, entity)) {
        reachable.push(entity);
      }
    }

    return reachable;
  }

  /**
   * Get all entities the actor can hear
   */
  getAudible(actor: IFEntity): IFEntity[] {
    const audible: IFEntity[] = [];
    const entities = this.world.getAllEntities();

    for (const entity of entities) {
      if (entity.id !== actor.id && this.canHear(actor, entity)) {
        audible.push(entity);
      }
    }

    return audible;
  }

  /**
   * Check if target is in actor's inventory
   */
  private isCarried(actor: IFEntity, target: IFEntity): boolean {
    return this.world.getLocation(target.id) === actor.id;
  }

  /**
   * Get the room containing an entity
   */
  private getContainingRoom(entityId: string): IFEntity | null {
    let current = entityId;
    let maxDepth = 10; // Prevent infinite loops

    while (current && maxDepth-- > 0) {
      const entity = this.world.getEntity(current);
      if (!entity) return null;

      if (entity.has(TraitType.ROOM)) {
        return entity;
      }

      const location = this.world.getLocation(current);
      if (!location) return null;
      
      current = location;
    }

    return null;
  }

  /**
   * Check if entity is visible considering container hierarchy
   */
  private isVisibleInContainer(targetId: string, viewerId: string): boolean {
    let current = targetId;
    let maxDepth = 10; // Prevent infinite loops

    while (current && maxDepth-- > 0) {
      const location = this.world.getLocation(current);
      if (!location) return false;

      // Reached the room level
      const container = this.world.getEntity(location);
      if (!container) return false;
      
      if (container.has(TraitType.ROOM)) {
        return true;
      }

      // Check if container blocks visibility
      if (container.has(TraitType.CONTAINER)) {
        // Closed opaque containers block sight
        if (container.has(TraitType.OPENABLE)) {
          const openable = container.getTrait(TraitType.OPENABLE);
          if (openable && !(openable as any).isOpen) {
            // TODO: Check for transparent trait
            return false;
          }
        }
      }

      // Supporters don't block visibility
      if (container.has(TraitType.SUPPORTER)) {
        // Continue up the hierarchy
      }

      current = location;
    }

    return false;
  }

  /**
   * Check if two rooms are connected by a door
   */
  private getRoomConnection(room1: IFEntity, room2: IFEntity): { isOpen: boolean } | null {
    // Get all entities in both rooms
    const room1Entities = this.world.getAllEntities().filter(e => 
      this.world.getLocation(e.id) === room1.id
    );
    const room2Entities = this.world.getAllEntities().filter(e => 
      this.world.getLocation(e.id) === room2.id
    );
    
    // Look for doors that connect these rooms
    const checkDoors = (entities: IFEntity[]) => {
      for (const entity of entities) {
        if (entity.has(TraitType.DOOR)) {
          const doorTrait = entity.get(TraitType.DOOR) as any;
          // Check if this door connects our two rooms
          if ((doorTrait.room1 === room1.id && doorTrait.room2 === room2.id) ||
              (doorTrait.room1 === room2.id && doorTrait.room2 === room1.id)) {
            // Found a connecting door, check if it's open
            if (entity.has(TraitType.OPENABLE)) {
              const openable = entity.get(TraitType.OPENABLE) as any;
              return { isOpen: openable.isOpen };
            }
            // Door without openable trait is always open
            return { isOpen: true };
          }
        }
      }
      return null;
    };
    
    // Check doors in both rooms
    const result = checkDoors(room1Entities);
    if (result) return result;
    
    return checkDoors(room2Entities);
  }

  /**
   * Check if an entity has a scent
   */
  private hasScent(entity: IFEntity): boolean {
    // Check for explicit smelly property
    const identity = entity.get(TraitType.IDENTITY);
    if (identity && typeof identity === 'object' && 'customProperties' in identity) {
      const props = (identity.customProperties as any);
      if (props?.smelly || props?.verySmelly) {
        return true;
      }
    }
    
    // Food items have scent
    if (entity.has(TraitType.EDIBLE)) {
      return true;
    }
    
    // Actors have scent
    if (entity.has(TraitType.ACTOR)) {
      return true;
    }
    
    // Check for explicit scent trait (future)
    // if (entity.has('SCENTED')) return true;
    
    return false;
  }

  /**
   * Check if a room is in darkness
   */
  private isInDarkness(room: IFEntity): boolean {
    // For now, we'll use a custom property on the room's identity trait
    // In a real implementation, this would be a proper DARK trait
    const identity = room.get(TraitType.IDENTITY);
    if (identity && typeof identity === 'object' && 'customProperties' in identity) {
      const props = (identity.customProperties as any);
      return props?.isDark === true;
    }
    
    // Default: rooms are lit
    return false;
  }

  /**
   * Check if an actor has a light source
   */
  private hasLightSource(actor: IFEntity): boolean {
    // Check inventory for light sources
    const inventory = this.world.getAllEntities().filter(e => 
      this.world.getLocation(e.id) === actor.id
    );
    
    for (const item of inventory) {
      if (this.isLightSource(item)) {
        return true;
      }
    }
    
    // Check if actor itself provides light (via custom property)
    const identity = actor.get(TraitType.IDENTITY);
    if (identity && typeof identity === 'object' && 'customProperties' in identity) {
      const props = (identity.customProperties as any);
      if (props?.providesLight) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check if an entity is a light source
   */
  private isLightSource(entity: IFEntity): boolean {
    // Check for LIGHT_SOURCE trait
    if (entity.has(TraitType.LIGHT_SOURCE)) {
      const lightSource = entity.getTrait(TraitType.LIGHT_SOURCE);
      // Check if it's currently on
      if (entity.has(TraitType.SWITCHABLE)) {
        const switchable = entity.getTrait(TraitType.SWITCHABLE);
        return switchable ? (switchable as any).isOn === true : false;
      }
      return true; // Light sources without switches are always on
    }
    
    // Check for custom light property
    const identity = entity.get(TraitType.IDENTITY);
    if (identity && typeof identity === 'object' && 'customProperties' in identity) {
      const props = (identity.customProperties as any);
      if (props?.isLit) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check if entity is inside any closed container
   */
  private isInClosedContainer(entityId: string): boolean {
    let current = entityId;
    let maxDepth = 10;

    while (current && maxDepth-- > 0) {
      const location = this.world.getLocation(current);
      if (!location) return false;

      const container = this.world.getEntity(location);
      if (!container) return false;

      // If we reach a room, we're not in a closed container
      if (container.has(TraitType.ROOM)) {
        return false;
      }

      // Check if this is a closed container
      if (container.has(TraitType.CONTAINER) && container.has(TraitType.OPENABLE)) {
        const openable = container.getTrait(TraitType.OPENABLE);
        if (openable && !(openable as any).isOpen) {
          return true;
        }
      }

      current = location;
    }

    return false;
  }
}

/**
 * Create a standard scope resolver
 */
export function createScopeResolver(world: WorldModel): ScopeResolver {
  return new StandardScopeResolver(world);
}