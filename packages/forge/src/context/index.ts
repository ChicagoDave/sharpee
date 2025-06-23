// packages/forge/src/context/index.ts

import { ForgeContext, PlayerContext, LocationContext, EntityContext } from '../types';
import { GameContext, Entity, EntityId, RelationshipType } from '@sharpee/core';

/**
 * Create a forge context from a game context
 */
export function createForgeContext(gameContext: GameContext): ForgeContext {
  const playerContext = createPlayerContext(gameContext.player, gameContext);
  const locationContext = createLocationContext(gameContext.currentLocation, gameContext);
  
  return {
    player: playerContext,
    currentLocation: locationContext,
    isFirstVisit: !gameContext.currentLocation.attributes.visited,
    
    getEntity: (id: EntityId) => {
      const entity = gameContext.getEntity(id);
      return entity ? createEntityContext(entity, gameContext) : undefined;
    },
    
    findEntity: (name: string) => {
      const entity = gameContext.findEntityByName(name);
      return entity ? createEntityContext(entity, gameContext) : undefined;
    },
    
    moveTo: (locationId: string) => {
      // Implementation will go here
    },
    
    emit: (message: string) => {
      // Implementation will go here
    },
    
    emitToChannel: (channelId: string, message: string) => {
      // Implementation will go here
    },
    
    limitActions: (allowedActions: string[]) => {
      // Implementation will go here
    },
    
    startConversation: (conversationId: string, npcId?: string) => {
      // Implementation will go here
    },
    
    getCoreContext: () => gameContext
  };
}

/**
 * Create a player context from a player entity
 */
function createPlayerContext(playerEntity: Entity, gameContext: GameContext): PlayerContext {
  const entityContext = createEntityContext(playerEntity, gameContext);
  
  return {
    ...entityContext,
    
    has: (itemId: string) => {
      const inventory = playerEntity.relationships[RelationshipType.CONTAINS] || [];
      return inventory.includes(itemId);
    },
    
    getInventory: () => {
      const inventory = playerEntity.relationships[RelationshipType.CONTAINS] || [];
      return inventory
        .map(id => gameContext.getEntity(id))
        .filter((e): e is Entity => !!e)
        .map(e => createEntityContext(e, gameContext));
    },
    
    addToInventory: (itemId: string) => {
      // Implementation will go here
    },
    
    removeFromInventory: (itemId: string) => {
      // Implementation will go here
    }
  };
}

/**
 * Create a location context from a location entity
 */
function createLocationContext(locationEntity: Entity, gameContext: GameContext): LocationContext {
  const entityContext = createEntityContext(locationEntity, gameContext);
  
  return {
    ...entityContext,
    
    getItems: () => {
      const items = locationEntity.relationships[RelationshipType.CONTAINS] || [];
      return items
        .map(id => gameContext.getEntity(id))
        .filter((e): e is Entity => !!e && e.type === 'item')
        .map(e => createEntityContext(e, gameContext));
    },
    
    getCharacters: () => {
      const characters = locationEntity.relationships[RelationshipType.CONTAINS] || [];
      return characters
        .map(id => gameContext.getEntity(id))
        .filter((e): e is Entity => !!e && e.type === 'character')
        .map(e => createEntityContext(e, gameContext));
    },
    
    getExits: () => {
      // Implementation will go here
      return {};
    },
    
    isDark: locationEntity.attributes.dark === true || locationEntity.attributes.isDark === true,
    
    hasBeenVisited: locationEntity.attributes.visited === true
  };
}

/**
 * Create an entity context from an entity
 */
function createEntityContext(entity: Entity, gameContext: GameContext): EntityContext {
  return {
    id: entity.id,
    type: entity.type,
    name: entity.attributes.name as string || '',
    description: entity.attributes.description as string || '',
    
    getAttribute: <T>(key: string) => entity.attributes[key] as T,
    
    setAttribute: <T>(key: string, value: T) => {
      // Implementation will go here
    },
    
    hasAttribute: (key: string) => key in entity.attributes,
    
    getRelated: (relationshipType: string) => {
      const relatedIds = entity.relationships[relationshipType] || [];
      return relatedIds
        .map(id => gameContext.getEntity(id))
        .filter((e): e is Entity => !!e)
        .map(e => createEntityContext(e, gameContext));
    },
    
    addRelationship: (relationshipType: string, targetId: EntityId) => {
      // Implementation will go here
    },
    
    removeRelationship: (relationshipType: string, targetId: EntityId) => {
      // Implementation will go here
    },
    
    getEntity: () => entity
  };
}
