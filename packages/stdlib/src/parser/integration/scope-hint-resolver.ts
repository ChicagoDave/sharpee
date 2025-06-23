/**
 * Scope Hint Resolver - Resolves scope hints using world state
 * 
 * This module provides the logic for checking if entities match
 * specific scope hints based on the current world state.
 */

import { EntityId } from '../../world-model/types';
import { IFWorld } from '../../world-model/if-world';
import { IFEntity } from '../../world-model/if-entities/types';
import { ScopeHintType } from '../grammar';

/**
 * Interface for scope hint resolution
 */
export interface ScopeHintResolver {
  /**
   * Check if an entity matches a scope hint
   */
  matchesHint(entity: IFEntity, hint: ScopeHintType): boolean;
  
  /**
   * Get all entities matching a hint in current scope
   */
  getEntitiesMatchingHint(hint: ScopeHintType): IFEntity[];
  
  /**
   * Get human-readable description of a hint
   */
  getHintDescription(hint: ScopeHintType): string;
}

/**
 * World-based scope hint resolver
 */
export class WorldScopeHintResolver implements ScopeHintResolver {
  constructor(private world: IFWorld) {}

  /**
   * Check if entity matches hint based on world state
   */
  matchesHint(entity: IFEntity, hint: ScopeHintType): boolean {
    switch (hint) {
      case ScopeHintType.HELD:
        // Entity is held if it's in the player's inventory
        const playerId = this.world.getPlayer()?.id;
        return playerId ? this.world.getLocation(entity.id) === playerId : false;
        
      case ScopeHintType.CONTAINER:
        return entity.attributes.container === true;
        
      case ScopeHintType.SUPPORTER:
        return entity.attributes.supporter === true;
        
      case ScopeHintType.PERSON:
        return entity.type === 'person' || entity.type === 'player';
        
      case ScopeHintType.DOOR:
        return entity.type === 'door';
        
      case ScopeHintType.OPENABLE:
        return entity.attributes.openable === true;
        
      case ScopeHintType.LOCKABLE:
        return entity.attributes.lockable === true;
        
      case ScopeHintType.VISIBLE:
        return this.world.isVisible(entity.id);
        
      case ScopeHintType.REACHABLE:
        return this.world.isReachable(entity.id);
        
      case ScopeHintType.WORN:
        // Must be worn AND on the player
        const player = this.world.getPlayer();
        return entity.attributes.worn === true && 
               player ? this.world.getLocation(entity.id) === player.id : false;
        
      case ScopeHintType.WEARABLE:
        return entity.attributes.wearable === true;
        
      case ScopeHintType.EDIBLE:
        return entity.attributes.edible === true;
        
      case ScopeHintType.ENTERABLE:
        // Rooms, containers (unless explicitly not enterable), and supporters
        if (entity.type === 'room') return true;
        if (entity.attributes.container && entity.attributes.enterable !== false) return true;
        if (entity.attributes.supporter) return true;
        return false;
        
      case ScopeHintType.SWITCHED_ON:
        return entity.attributes.on === true;
        
      case ScopeHintType.SWITCHABLE:
        return entity.attributes.switchable === true;
        
      default:
        return false;
    }
  }

  /**
   * Get all entities in scope matching a hint
   */
  getEntitiesMatchingHint(hint: ScopeHintType): IFEntity[] {
    const scope = this.world.calculateScope();
    const matches: IFEntity[] = [];
    
    // For some hints, we need to check different scopes
    let entitiesToCheck: Set<EntityId>;
    
    switch (hint) {
      case ScopeHintType.HELD:
      case ScopeHintType.WORN:
        // Only check player inventory
        const playerId = this.world.getPlayer()?.id;
        if (playerId) {
          const inventory = this.world.getContents(playerId);
          entitiesToCheck = new Set(inventory.map(e => e.id));
        } else {
          entitiesToCheck = new Set();
        }
        break;
        
      case ScopeHintType.VISIBLE:
        entitiesToCheck = scope.visible;
        break;
        
      case ScopeHintType.REACHABLE:
        entitiesToCheck = scope.reachable;
        break;
        
      default:
        // Check all reachable entities
        entitiesToCheck = scope.reachable;
    }
    
    // Check each entity
    for (const entityId of entitiesToCheck) {
      const entity = this.world.getEntity(entityId) as IFEntity;
      if (entity && this.matchesHint(entity, hint)) {
        matches.push(entity);
      }
    }
    
    return matches;
  }

  /**
   * Get human-readable hint description
   */
  getHintDescription(hint: ScopeHintType): string {
    switch (hint) {
      case ScopeHintType.HELD:
        return 'something you are holding';
      case ScopeHintType.CONTAINER:
        return 'a container';
      case ScopeHintType.SUPPORTER:
        return 'something you can put things on';
      case ScopeHintType.PERSON:
        return 'a person';
      case ScopeHintType.DOOR:
        return 'a door';
      case ScopeHintType.OPENABLE:
        return 'something that can be opened';
      case ScopeHintType.LOCKABLE:
        return 'something that can be locked';
      case ScopeHintType.VISIBLE:
        return 'something visible';
      case ScopeHintType.REACHABLE:
        return 'something within reach';
      case ScopeHintType.WORN:
        return 'something you are wearing';
      case ScopeHintType.WEARABLE:
        return 'something that can be worn';
      case ScopeHintType.EDIBLE:
        return 'something edible';
      case ScopeHintType.ENTERABLE:
        return 'something you can enter';
      case ScopeHintType.SWITCHED_ON:
        return 'something that is switched on';
      case ScopeHintType.SWITCHABLE:
        return 'something that can be switched on or off';
      default:
        return 'something';
    }
  }
}

/**
 * Create a world-based scope hint resolver
 */
export function createWorldScopeHintResolver(world: IFWorld): ScopeHintResolver {
  return new WorldScopeHintResolver(world);
}

/**
 * Static scope hint resolver for testing
 * This resolver doesn't need world state and uses only entity attributes
 */
export class StaticScopeHintResolver implements ScopeHintResolver {
  matchesHint(entity: IFEntity, hint: ScopeHintType): boolean {
    switch (hint) {
      case ScopeHintType.CONTAINER:
        return entity.attributes.container === true;
      case ScopeHintType.SUPPORTER:
        return entity.attributes.supporter === true;
      case ScopeHintType.PERSON:
        return entity.type === 'person' || entity.type === 'player';
      case ScopeHintType.DOOR:
        return entity.type === 'door';
      case ScopeHintType.OPENABLE:
        return entity.attributes.openable === true;
      case ScopeHintType.LOCKABLE:
        return entity.attributes.lockable === true;
      case ScopeHintType.WEARABLE:
        return entity.attributes.wearable === true;
      case ScopeHintType.EDIBLE:
        return entity.attributes.edible === true;
      case ScopeHintType.SWITCHABLE:
        return entity.attributes.switchable === true;
      case ScopeHintType.SWITCHED_ON:
        return entity.attributes.on === true;
      case ScopeHintType.WORN:
        return entity.attributes.worn === true;
      case ScopeHintType.ENTERABLE:
        if (entity.type === 'room') return true;
        if (entity.attributes.container && entity.attributes.enterable !== false) return true;
        if (entity.attributes.supporter) return true;
        return false;
      // These require world state, so default to true in static resolver
      case ScopeHintType.HELD:
      case ScopeHintType.VISIBLE:
      case ScopeHintType.REACHABLE:
        return true;
      default:
        return false;
    }
  }

  getEntitiesMatchingHint(hint: ScopeHintType): IFEntity[] {
    // Static resolver can't enumerate entities
    return [];
  }

  getHintDescription(hint: ScopeHintType): string {
    // Same descriptions as world resolver
    return new WorldScopeHintResolver(null as any).getHintDescription(hint);
  }
}

/**
 * Create a static scope hint resolver
 */
export function createStaticScopeHintResolver(): ScopeHintResolver {
  return new StaticScopeHintResolver();
}
