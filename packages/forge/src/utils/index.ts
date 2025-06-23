// packages/forge/src/utils/index.ts

import { ForgeContext, EntityContext } from '../types';
import { Entity, EntityId, RelationshipType } from '@sharpee/core';

/**
 * Get a random element from an array
 */
export function randomChoice<T>(array: T[]): T | undefined {
  if (array.length === 0) {
    return undefined;
  }
  
  const index = Math.floor(Math.random() * array.length);
  return array[index];
}

/**
 * Filter entities by type
 */
export function filterByType(entities: EntityContext[], type: string): EntityContext[] {
  return entities.filter(entity => entity.type === type);
}

/**
 * Find an entity by name
 */
export function findByName(entities: EntityContext[], name: string): EntityContext | undefined {
  return entities.find(entity => 
    entity.name.toLowerCase() === name.toLowerCase()
  );
}

/**
 * Get a list of entity names as a formatted string
 */
export function formatEntityList(entities: EntityContext[]): string {
  if (entities.length === 0) {
    return 'nothing';
  }
  
  if (entities.length === 1) {
    return entities[0].name;
  }
  
  const names = entities.map(entity => entity.name);
  const lastItem = names.pop();
  
  return `${names.join(', ')} and ${lastItem}`;
}

/**
 * Check if the player can see in the current location
 */
export function canPlayerSee(context: ForgeContext): boolean {
  // Check if the location is dark
  if (context.currentLocation.isDark) {
    // Check if the player has a light source
    const inventory = context.player.getInventory();
    const hasLightSource = inventory.some(item => 
      item.getAttribute<boolean>('isLightSource') === true && 
      item.getAttribute<boolean>('isLit') === true
    );
    
    return hasLightSource;
  }
  
  // Location is not dark
  return true;
}

/**
 * Move an entity from one container to another
 */
export function moveEntity(
  entityId: EntityId,
  fromContainerId: EntityId,
  toContainerId: EntityId,
  context: ForgeContext
): boolean {
  const gameContext = context.getCoreContext();
  
  // Update the world state
  const updatedContext = gameContext.updateWorldState(state => {
    // Remove from source container
    const fromContainer = { ...state.entities[fromContainerId] };
    fromContainer.relationships = {
      ...fromContainer.relationships,
      [RelationshipType.CONTAINS]: 
        (fromContainer.relationships[RelationshipType.CONTAINS] || [])
        .filter(id => id !== entityId)
    };
    
    // Add to target container
    const toContainer = { ...state.entities[toContainerId] };
    toContainer.relationships = {
      ...toContainer.relationships,
      [RelationshipType.CONTAINS]: [
        ...(toContainer.relationships[RelationshipType.CONTAINS] || []),
        entityId
      ]
    };
    
    // Update state
    return {
      ...state,
      entities: {
        ...state.entities,
        [fromContainerId]: fromContainer,
        [toContainerId]: toContainer
      }
    };
  });
  
  return updatedContext !== gameContext;
}
