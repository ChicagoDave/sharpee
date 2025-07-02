/**
 * Read-only action context implementation
 * 
 * Provides query methods for actions without allowing state mutations
 */

import { IFEntity, WorldModel } from '@sharpee/world-model';
import { ActionContext } from './types';

export class ReadOnlyActionContext implements ActionContext {
  constructor(
    public readonly world: WorldModel,
    public readonly player: IFEntity,
    public readonly currentLocation: IFEntity
  ) {}
  
  /**
   * Check if an entity is visible to the player
   */
  canSee(entity: IFEntity): boolean {
    return this.world.canSee(this.player.id, entity.id);
  }
  
  /**
   * Check if an entity is physically reachable by the player
   * 
   * An entity is reachable if:
   * 1. It's in the same location as the player
   * 2. It's held by the player
   * 3. It's in an open container in the same location
   * 4. It's on a supporter in the same location
   */
  canReach(entity: IFEntity): boolean {
    const entityLocation = this.world.getLocation(entity.id);
    
    // Held by player
    if (entityLocation === this.player.id) {
      return true;
    }
    
    // In same location as player
    if (entityLocation === this.currentLocation.id) {
      return true;
    }
    
    // In an accessible container/supporter
    if (entityLocation) {
      const container = this.world.getEntity(entityLocation);
      if (container) {
        const containerLocation = this.world.getLocation(container.id);
        
        // Container is in same location as player
        if (containerLocation === this.currentLocation.id) {
          // Check if it's an open container
          if (container.has('container')) {
            const openableTrait = container.get('openable');
            if (!openableTrait || (openableTrait as any).isOpen) {
              return true;
            }
          }
          
          // Or a supporter (always accessible)
          if (container.has('supporter')) {
            return true;
          }
        }
        
        // Container is held by player
        if (containerLocation === this.player.id) {
          // Check if it's an open container
          if (container.has('container')) {
            const openableTrait = container.get('openable');
            if (!openableTrait || (openableTrait as any).isOpen) {
              return true;
            }
          }
        }
      }
    }
    
    return false;
  }
  
  /**
   * Check if an entity can be taken by the player
   * 
   * An entity can be taken if:
   * 1. It's visible
   * 2. It's reachable
   * 3. It's not a room
   * 4. It's not scenery (fixed in place)
   * 5. It's not already held by the player
   */
  canTake(entity: IFEntity): boolean {
    // Must be visible
    if (!this.canSee(entity)) {
      return false;
    }
    
    // Must be reachable
    if (!this.canReach(entity)) {
      return false;
    }
    
    // Can't take rooms
    if (entity.has('room')) {
      return false;
    }
    
    // Can't take scenery
    if (entity.has('scenery')) {
      return false;
    }
    
    // Already held
    const location = this.world.getLocation(entity.id);
    if (location === this.player.id) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Check if an entity is in scope for the player
   */
  isInScope(entity: IFEntity): boolean {
    const inScopeEntities = this.world.getInScope(this.player.id);
    return inScopeEntities.some(e => e.id === entity.id);
  }
  
  /**
   * Get all entities visible to the player
   */
  getVisible(): IFEntity[] {
    return this.world.getVisible(this.player.id);
  }
  
  /**
   * Get all entities in scope for the player
   */
  getInScope(): IFEntity[] {
    return this.world.getInScope(this.player.id);
  }
}
