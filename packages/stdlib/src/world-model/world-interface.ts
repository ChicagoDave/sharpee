/**
 * Temporary World interface for stdlib services
 * 
 * This provides the world management methods that stdlib services expect.
 * In a proper implementation, this would come from the world-model package
 * or be provided by a world management service.
 */

import { Entity as IFEntity } from '@sharpee/core';

/**
 * World interface expected by stdlib services
 */
export interface IFWorld {
  /**
   * Get an entity by ID
   */
  getEntity(id: string): IFEntity | null;
  
  /**
   * Get the location of an entity
   */
  getLocation(entityId: string): string | null;
  
  /**
   * Get all entities in a location
   */
  getContents(locationId: string): IFEntity[];
  
  /**
   * Move an entity to a new location
   */
  moveEntity(entityId: string, newLocationId: string): void;
  
  /**
   * Check if an entity exists
   */
  hasEntity(id: string): boolean;
  
  /**
   * Create a new entity
   */
  createEntity(id: string, type: string, params?: any): IFEntity;
  
  /**
   * Remove an entity
   */
  removeEntity(id: string): boolean;
}
