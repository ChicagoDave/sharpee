/**
 * Adapter to make existing world model work with simple rule system
 */

import { EntityId } from '../types/entity';
import { IRuleWorld } from './types';

/**
 * Simple adapter for any object-based world state
 */
export class SimpleRuleWorldAdapter implements IRuleWorld {
  constructor(
    private worldState: any,
    private playerId: EntityId = 'player',
    private currentLocationId?: EntityId
  ) {}

  /**
   * Get an entity by ID
   */
  getEntity(id: EntityId): any {
    return this.worldState.entities?.[id] || this.worldState[id];
  }

  /**
   * Update an entity with new attributes
   */
  updateEntity(id: EntityId, changes: Record<string, any>): void {
    const entity = this.getEntity(id);
    if (entity) {
      if (entity.attributes) {
        // For entities with attributes object
        Object.assign(entity.attributes, changes);
      } else {
        // For flat entity objects
        Object.assign(entity, changes);
      }
    }
  }

  /**
   * Get the player entity
   */
  getPlayer(): any {
    return this.getEntity(this.playerId);
  }

  /**
   * Get the current location entity
   */
  getCurrentLocation(): any {
    return this.currentLocationId ? this.getEntity(this.currentLocationId) : undefined;
  }

  /**
   * Set the player ID
   */
  setPlayerId(playerId: EntityId): void {
    this.playerId = playerId;
  }

  /**
   * Set the current location ID
   */
  setCurrentLocationId(locationId: EntityId): void {
    this.currentLocationId = locationId;
  }
}

/**
 * Create a simple rule world from basic state
 */
export function createSimpleRuleWorld(
  worldState: any, 
  playerId: EntityId = 'player',
  currentLocationId?: EntityId
): IRuleWorld {
  return new SimpleRuleWorldAdapter(worldState, playerId, currentLocationId);
}
