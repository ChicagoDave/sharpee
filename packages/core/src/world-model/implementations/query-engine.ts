// packages/core/src/world-model/implementations/query-engine.ts

import {
    Entity,
    EntityId,
    EntityQuery,
    QueryOptions,
    QueryResult,
    AttributeValue,
    WorldState
  } from '../types';
  import { StateManager } from './immutable-state';
  
  /**
   * Provides advanced querying capabilities for entities in the world state
   */
  export class QueryEngine {
    private stateManager: StateManager;
    
    /**
     * Creates a new QueryEngine
     * @param stateManager The state manager to use
     */
    constructor(stateManager: StateManager) {
      this.stateManager = stateManager;
    }
    
    /**
     * Finds entities matching the given query
     * @param query Query criteria
     * @param options Query options
     */
    public findEntities(query: EntityQuery, options: QueryOptions = {}): QueryResult {
      const state = this.stateManager.getState();
      const matchingEntities = this.executeQuery(query, state);
      
      // Apply sorting if requested
      let sortedEntities = matchingEntities;
      if (options.sortBy) {
        sortedEntities = this.sortEntities(matchingEntities, options.sortBy, options.sortDirection);
      }
      
      // Apply limit if requested
      const limitedEntities = options.limit
        ? sortedEntities.slice(0, options.limit)
        : sortedEntities;
      
      return {
        ids: limitedEntities.map(entity => entity.id),
        entities: limitedEntities
      };
    }
    
    /**
     * Finds a single entity matching the query
     * @param query Query criteria
     */
    public findEntity(query: EntityQuery): Entity | undefined {
      const result = this.findEntities(query, { limit: 1 });
      return result.entities[0];
    }
    
    /**
     * Finds entities by their type
     * @param type Entity type
     * @param options Query options
     */
    public findByType(type: string, options: QueryOptions = {}): QueryResult {
      return this.findEntities({ types: [type] }, options);
    }
    
    /**
     * Finds entities by attribute value
     * @param attributeName Attribute name
     * @param value Attribute value
     * @param options Query options
     */
    public findByAttribute(
      attributeName: string,
      value: AttributeValue,
      options: QueryOptions = {}
    ): QueryResult {
      return this.findEntities(
        { attributes: { [attributeName]: value } },
        options
      );
    }
    
    /**
     * Finds entities related to a specific entity
     * @param entityId Entity ID
     * @param relationshipType Optional relationship type
     * @param options Query options
     */
    public findRelatedEntities(
      entityId: EntityId,
      relationshipType?: string,
      options: QueryOptions = {}
    ): QueryResult {
      const entity = this.stateManager.getEntity(entityId);
      if (!entity) return { ids: [], entities: [] };
      
      let relatedIds: EntityId[] = [];
      
      if (relationshipType) {
        // Get entities for a specific relationship type
        relatedIds = entity.relationships[relationshipType] || [];
      } else {
        // Get all related entities
        Object.values(entity.relationships).forEach(ids => {
          relatedIds.push(...ids);
        });
        
        // Remove duplicates
        relatedIds = [...new Set(relatedIds)];
      }
      
      // Get the actual entity objects
      const entities = relatedIds
        .map(id => this.stateManager.getEntity(id))
        .filter((e): e is Entity => e !== undefined);
      
      // Apply sorting if requested
      let sortedEntities = entities;
      if (options.sortBy) {
        sortedEntities = this.sortEntities(entities, options.sortBy, options.sortDirection);
      }
      
      // Apply limit if requested
      const limitedEntities = options.limit
        ? sortedEntities.slice(0, options.limit)
        : sortedEntities;
      
      return {
        ids: limitedEntities.map(entity => entity.id),
        entities: limitedEntities
      };
    }
    
    /**
     * Finds entities that have a relationship with a specific entity
     * @param entityId Target entity ID
     * @param relationshipType Optional relationship type
     * @param options Query options
     */
    public findEntitiesRelatingTo(
      entityId: EntityId,
      relationshipType?: string,
      options: QueryOptions = {}
    ): QueryResult {
      const state = this.stateManager.getState();
      
      const matchingEntities = Object.values(state.entities).filter(entity => {
        if (relationshipType) {
          // Check specific relationship type
          const relatedIds = entity.relationships[relationshipType] || [];
          return relatedIds.includes(entityId);
        } else {
          // Check all relationship types
          return Object.values(entity.relationships).some(relatedIds => 
            relatedIds.includes(entityId)
          );
        }
      });
      
      // Apply sorting if requested
      let sortedEntities = matchingEntities;
      if (options.sortBy) {
        sortedEntities = this.sortEntities(matchingEntities, options.sortBy, options.sortDirection);
      }
      
      // Apply limit if requested
      const limitedEntities = options.limit
        ? sortedEntities.slice(0, options.limit)
        : sortedEntities;
      
      return {
        ids: limitedEntities.map(entity => entity.id),
        entities: limitedEntities
      };
    }
    
    /**
     * Executes a query against the world state
     * @param query Query criteria
     * @param state World state
     */
    private executeQuery(query: EntityQuery, state: WorldState): Entity[] {
      const entities = Object.values(state.entities);
      
      return entities.filter(entity => {
        // Use provided predicate if available
        if (query.predicate) {
          return query.predicate(entity);
        }
        
        const typeMatch = this.matchType(entity, query.types);
        const attributeMatch = this.matchAttributes(entity, query.attributes);
        const relationshipMatch = this.matchRelationships(entity, query.relationships);
        
        // If matchAny is true, we need at least one match
        if (query.matchAny) {
          return (
            (query.types !== undefined && typeMatch) ||
            (query.attributes !== undefined && attributeMatch) ||
            (query.relationships !== undefined && relationshipMatch)
          );
        }
        
        // Otherwise, all specified criteria must match
        return (
          (query.types === undefined || typeMatch) &&
          (query.attributes === undefined || attributeMatch) &&
          (query.relationships === undefined || relationshipMatch)
        );
      });
    }
    
    /**
     * Checks if an entity's type matches any in the provided list
     */
    private matchType(entity: Entity, types?: string[]): boolean {
      if (!types || types.length === 0) return true;
      return types.includes(entity.type);
    }
    
    /**
     * Checks if an entity's attributes match the query attributes
     */
    private matchAttributes(entity: Entity, attributes?: Record<string, AttributeValue>): boolean {
      if (!attributes) return true;
      
      return Object.entries(attributes).every(([key, value]) => {
        // Check if the attribute exists and matches the value
        return (
          key in entity.attributes &&
          this.areValuesEqual(entity.attributes[key], value)
        );
      });
    }
    
    /**
     * Checks if an entity's relationships match the query relationships
     */
    private matchRelationships(
      entity: Entity,
      relationships?: Record<string, EntityId[]>
    ): boolean {
      if (!relationships) return true;
      
      return Object.entries(relationships).every(([type, targetIds]) => {
        // Check if the relationship type exists
        const entityRelationships = entity.relationships[type] || [];
        
        // Check if all target IDs are present
        return targetIds.every(id => entityRelationships.includes(id));
      });
    }
    
    /**
     * Compares two values for equality
     */
    private areValuesEqual(a: unknown, b: unknown): boolean {
      // If we're dealing with arrays, check if they have the same values
      if (Array.isArray(a) && Array.isArray(b)) {
        return (
          a.length === b.length &&
          a.every((val, i) => this.areValuesEqual(val, b[i]))
        );
      }
      
      // If we're dealing with objects, check if they have the same keys/values
      if (
        typeof a === 'object' && a !== null &&
        typeof b === 'object' && b !== null
      ) {
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        
        return (
          keysA.length === keysB.length &&
          keysA.every(key => 
            keysB.includes(key) && 
            this.areValuesEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
          )
        );
      }
      
      // Otherwise, do a strict equality check
      return a === b;
    }
    
    /**
     * Sorts entities by an attribute
     */
    private sortEntities(
      entities: Entity[],
      attributeName: string,
      direction: 'asc' | 'desc' = 'asc'
    ): Entity[] {
      return [...entities].sort((a, b) => {
        const valueA = this.getNestedAttributeValue(a, attributeName);
        const valueB = this.getNestedAttributeValue(b, attributeName);
        
        // Handle different types
        if (typeof valueA === 'number' && typeof valueB === 'number') {
          return direction === 'asc' ? valueA - valueB : valueB - valueA;
        }
        
        if (typeof valueA === 'string' && typeof valueB === 'string') {
          return direction === 'asc'
            ? valueA.localeCompare(valueB)
            : valueB.localeCompare(valueA);
        }
        
        if (typeof valueA === 'boolean' && typeof valueB === 'boolean') {
          const numA = valueA ? 1 : 0;
          const numB = valueB ? 1 : 0;
          return direction === 'asc' ? numA - numB : numB - numA;
        }
        
        // If values aren't comparable, preserve original order
        return 0;
      });
    }
    
    /**
     * Gets a nested attribute value using dot notation
     * e.g., getNestedAttributeValue(entity, 'stats.strength')
     */
    private getNestedAttributeValue(entity: Entity, path: string): unknown {
      // Special handling for built-in entity properties
      if (path === 'id') return entity.id;
      if (path === 'type') return entity.type;
      
      // Handle nested attributes with dot notation
      const parts = path.split('.');
      let value: unknown = entity.attributes;
      
      for (const part of parts) {
        if (value === null || value === undefined) return undefined;
        
        if (typeof value === 'object') {
          value = (value as Record<string, unknown>)[part];
        } else {
          return undefined;
        }
      }
      
      return value;
    }
    
    /**
     * Finds entities with a spatial relationship to the given entity
     * @param entityId Central entity ID
     * @param relationshipType Spatial relationship type (e.g., 'contains', 'adjacentTo')
     * @param maxDistance Maximum traversal distance
     */
    public findNearbyEntities(
      entityId: EntityId,
      relationshipType: string,
      maxDistance: number = 1
    ): Map<EntityId, number> {
      const entity = this.stateManager.getEntity(entityId);
      if (!entity) return new Map();
      
      // Map of entity IDs to their distance from the source
      const distances = new Map<EntityId, number>();
      distances.set(entityId, 0);
      
      // Queue for breadth-first search
      const queue: Array<[EntityId, number]> = [[entityId, 0]];
      
      while (queue.length > 0) {
        const [currentId, distance] = queue.shift()!;
        
        // Stop if we've reached the maximum distance
        if (distance >= maxDistance) continue;
        
        const currentEntity = this.stateManager.getEntity(currentId);
        if (!currentEntity) continue;
        
        // Get related entities of the specified relationship type
        const relatedIds = currentEntity.relationships[relationshipType] || [];
        
        for (const relatedId of relatedIds) {
          // Skip if we've already visited this entity at a shorter or equal distance
          if (distances.has(relatedId) && distances.get(relatedId)! <= distance + 1) {
            continue;
          }
          
          // Record the distance
          distances.set(relatedId, distance + 1);
          
          // Add to queue for further exploration
          queue.push([relatedId, distance + 1]);
        }
      }
      
      // Remove the source entity from the results
      distances.delete(entityId);
      
      return distances;
    }
    
    /**
     * Performs a graph traversal to find a path between entities
     * @param startId Starting entity ID
     * @param endId Ending entity ID
     * @param relationshipType Relationship type to follow
     */
    public findPath(
      startId: EntityId,
      endId: EntityId,
      relationshipType: string
    ): EntityId[] {
      const start = this.stateManager.getEntity(startId);
      const end = this.stateManager.getEntity(endId);
      if (!start || !end) return [];
      
      // Map to track which entity we came from
      const cameFrom = new Map<EntityId, EntityId>();
      
      // Queue for breadth-first search
      const queue: EntityId[] = [startId];
      
      // Continue until we find the end or exhaust all possibilities
      while (queue.length > 0) {
        const currentId = queue.shift()!;
        
        // If we've reached the end, reconstruct and return the path
        if (currentId === endId) {
          return this.reconstructPath(cameFrom, startId, endId);
        }
        
        const currentEntity = this.stateManager.getEntity(currentId);
        if (!currentEntity) continue;
        
        // Get related entities of the specified relationship type
        const relatedIds = currentEntity.relationships[relationshipType] || [];
        
        for (const relatedId of relatedIds) {
          // Skip if we've already visited this entity
          if (cameFrom.has(relatedId)) continue;
          
          // Record where we came from
          cameFrom.set(relatedId, currentId);
          
          // Add to queue for further exploration
          queue.push(relatedId);
        }
      }
      
      // No path found
      return [];
    }
    
    /**
     * Reconstructs a path from the cameFrom map
     */
    private reconstructPath(
      cameFrom: Map<EntityId, EntityId>,
      startId: EntityId,
      endId: EntityId
    ): EntityId[] {
      const path: EntityId[] = [endId];
      let current = endId;
      
      while (current !== startId) {
        const previous = cameFrom.get(current);
        if (!previous) break; // No path exists
        
        path.unshift(previous);
        current = previous;
      }
      
      return path;
    }
  }
  
  /**
   * Creates a new query engine with the given state manager
   * @param stateManager State manager to use
   */
  export function createQueryEngine(stateManager: StateManager): QueryEngine {
    return new QueryEngine(stateManager);
  }