// packages/core/src/execution/game-context.ts

import { 
    Entity, 
    EntityId, 
    WorldState,
    RelationshipType 
  } from '../world-model/types';
  import { GameContext } from './types';
  import { StateManager, EntityManager, QueryEngine } from '../world-model/implementations';
  
  /**
   * Implementation of the GameContext interface
   */
  export class GameContextImpl implements GameContext {
    public readonly worldState: WorldState;
    public readonly player: Entity;
    public readonly currentLocation: Entity;
    
    private readonly entityManager: EntityManager;
    private readonly queryEngine: QueryEngine;
  
    /**
     * Create a new game context
     */
    constructor(
      worldState: WorldState,
      player: Entity,
      currentLocation: Entity,
      entityManager: EntityManager,
      queryEngine: QueryEngine
    ) {
      this.worldState = worldState;
      this.player = player;
      this.currentLocation = currentLocation;
      this.entityManager = entityManager;
      this.queryEngine = queryEngine;
    }
  
    /**
     * Get an entity by ID
     */
    public getEntity(id: EntityId): Entity | undefined {
      return this.entityManager.getEntity(id);
    }
  
    /**
     * Get entities by type
     */
    public getEntitiesByType(type: string): Entity[] {
      return this.entityManager.getEntitiesByType(type);
    }
  
    /**
     * Get entities with a specific relationship to an entity
     */
    public getRelatedEntities(entityId: EntityId, relationshipType: string): Entity[] {
      return this.entityManager.getRelatedEntities(entityId, relationshipType);
    }
  
    /**
     * Check if an entity is accessible to the player
     */
    public isAccessible(entityId: EntityId): boolean {
      const entity = this.getEntity(entityId);
      if (!entity) return false;
  
      // Entity is accessible if:
      // 1. It's in the player's inventory
      const inInventory = this.isInInventory(entityId);
      
      // 2. It's in the current location
      const inLocation = this.isInLocation(entityId, this.currentLocation.id);
      
      // 3. It's contained in something that's accessible and open
      const containers = this.getContainersOf(entityId);
      const inAccessibleContainer = containers.some(container => {
        return this.isAccessible(container.id) && this.isOpen(container.id);
      });
  
      return inInventory || inLocation || inAccessibleContainer;
    }
  
    /**
     * Check if an entity is visible to the player
     */
    public isVisible(entityId: EntityId): boolean {
      const entity = this.getEntity(entityId);
      if (!entity) return false;
  
      // Entity is visible if:
      // 1. It's accessible
      if (this.isAccessible(entityId)) return true;
      
      // 2. It's in the current location but inaccessible (e.g., behind glass)
      if (this.isInLocation(entityId, this.currentLocation.id)) {
        // Check entity's visibility attribute
        return entity.attributes.visible !== false;
      }
      
      // 3. It's in a transparent container that's visible
      const containers = this.getContainersOf(entityId);
      return containers.some(container => {
        const isTransparent = container.attributes.transparent === true;
        return isTransparent && this.isVisible(container.id);
      });
    }
  
    /**
     * Find an entity by name
     */
    public findEntityByName(name: string, options: {
      location?: EntityId;
      includeInventory?: boolean;
      typeFilter?: string[];
    } = {}): Entity | undefined {
      const matches = this.findEntitiesByName(name, options);
      return matches.length > 0 ? matches[0] : undefined;
    }
  
    /**
     * Find entities by name
     */
    public findEntitiesByName(name: string, options: {
      location?: EntityId;
      includeInventory?: boolean;
      typeFilter?: string[];
    } = {}): Entity[] {
      const locationId = options.location || this.currentLocation.id;
      const includeInventory = options.includeInventory !== false;
      const normalizedName = name.toLowerCase();
      
      // Create a list of candidate entities
      let candidates: Entity[] = [];
      
      // Add entities in the location
      const locationEntities = this.getEntitiesInLocation(locationId);
      candidates.push(...locationEntities);
      
      // Add entities in the player's inventory if requested
      if (includeInventory) {
        const inventoryEntities = this.getPlayerInventory();
        candidates.push(...inventoryEntities);
      }
      
      // Apply type filter if provided
      if (options.typeFilter && options.typeFilter.length > 0) {
        candidates = candidates.filter(entity => 
          options.typeFilter!.includes(entity.type)
        );
      }
      
      // Find entities that match the name
      return candidates.filter(entity => {
        // Check the name attribute
        const entityName = String(entity.attributes.name || '').toLowerCase();
        
        // Check aliases if defined
        const aliases = entity.attributes.aliases;
        const aliasesList = Array.isArray(aliases) ? aliases : [];
        
        // Match if the name or any alias matches
        return (
          entityName === normalizedName ||
          entityName.includes(normalizedName) ||
          aliasesList.some(alias => 
            String(alias).toLowerCase() === normalizedName ||
            String(alias).toLowerCase().includes(normalizedName)
          )
        );
      });
    }
  
    /**
     * Update the world state
     */
    public updateWorldState(updater: (state: WorldState) => WorldState): GameContext {
      // Apply the update to get a new state
      const newState = updater(this.worldState);
      
      // Get the player and location in the new state
      const newPlayer = this.entityManager.getEntity(this.player.id)!;
      const newLocation = this.entityManager.getEntity(this.currentLocation.id)!;
      
      // Create a new context with the updated state
      return new GameContextImpl(
        newState,
        newPlayer,
        newLocation,
        this.entityManager,
        this.queryEngine
      );
    }
  
    /**
     * Helper method to check if an entity is in the player's inventory
     */
    private isInInventory(entityId: EntityId): boolean {
      const playerInventory = this.player.relationships[RelationshipType.CONTAINS] || [];
      return playerInventory.includes(entityId);
    }
  
    /**
     * Helper method to check if an entity is in a location
     */
    private isInLocation(entityId: EntityId, locationId: EntityId): boolean {
      const location = this.getEntity(locationId);
      if (!location) return false;
      
      const locationContents = location.relationships[RelationshipType.CONTAINS] || [];
      
      // Direct containment
      if (locationContents.includes(entityId)) return true;
      
      // Check containers in the location
      for (const containerId of locationContents) {
        const container = this.getEntity(containerId);
        if (container && this.isInContainer(entityId, containerId)) {
          return true;
        }
      }
      
      return false;
    }
  
    /**
     * Helper method to check if an entity is in a container
     */
    private isInContainer(entityId: EntityId, containerId: EntityId): boolean {
      const container = this.getEntity(containerId);
      if (!container) return false;
      
      const containerContents = container.relationships[RelationshipType.CONTAINS] || [];
      
      // Direct containment
      if (containerContents.includes(entityId)) return true;
      
      // Recursive check for nested containers
      for (const innerContainerId of containerContents) {
        if (this.isInContainer(entityId, innerContainerId)) {
          return true;
        }
      }
      
      return false;
    }
  
    /**
     * Helper method to get all containers of an entity
     */
    private getContainersOf(entityId: EntityId): Entity[] {
      const entity = this.getEntity(entityId);
      if (!entity) return [];
      
      // Get entities that contain this entity
      const containerIds = entity.relationships[RelationshipType.CONTAINED_BY] || [];
      
      return containerIds
        .map(id => this.getEntity(id))
        .filter((e): e is Entity => e !== undefined);
    }
  
    /**
     * Helper method to check if a container is open
     */
    private isOpen(entityId: EntityId): boolean {
      const entity = this.getEntity(entityId);
      if (!entity) return false;
      
      // Default to open if not specified
      if (entity.attributes.openable !== true) return true;
      
      return entity.attributes.open === true;
    }
  
    /**
     * Helper method to get all entities in a location
     */
    private getEntitiesInLocation(locationId: EntityId): Entity[] {
      const location = this.getEntity(locationId);
      if (!location) return [];
      
      const locationContents = location.relationships[RelationshipType.CONTAINS] || [];
      
      return locationContents
        .map(id => this.getEntity(id))
        .filter((e): e is Entity => e !== undefined);
    }
  
    /**
     * Helper method to get the player's inventory
     */
    private getPlayerInventory(): Entity[] {
      const inventoryIds = this.player.relationships[RelationshipType.CONTAINS] || [];
      
      return inventoryIds
        .map(id => this.getEntity(id))
        .filter((e): e is Entity => e !== undefined);
    }
  }
  
  /**
   * Create a new game context
   */
  export function createGameContext(
    worldState: WorldState,
    playerId: EntityId,
    locationId: EntityId,
    entityManager: EntityManager,
    queryEngine: QueryEngine
  ): GameContext {
    const player = entityManager.getEntity(playerId);
    if (!player) {
      throw new Error(`Player entity not found: ${playerId}`);
    }
    
    const location = entityManager.getEntity(locationId);
    if (!location) {
      throw new Error(`Location entity not found: ${locationId}`);
    }
    
    return new GameContextImpl(
      worldState,
      player,
      location,
      entityManager,
      queryEngine
    );
  }