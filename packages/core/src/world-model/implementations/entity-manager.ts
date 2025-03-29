// packages/core/src/world-model/implementations/entity-manager.ts

import {
  Entity,
  EntityId,
  EntityCreationParams,
  EntityOperationOptions,
  AttributeConfigMap,
  AttributeValue,
  RelationshipConfigMap,
  RelationshipType,
  WorldState
} from '../types';
import { StateManager } from './immutable-state';
import { EventEmitter, StandardEvents } from './event-emitter';

/**
 * Custom attribute types for better type safety
 */
export interface StandardEntityAttributes {
  name?: string;
  description?: string;
  visible?: boolean;
  accessible?: boolean;
  weight?: number;
  size?: number;
  position?: { x: number; y: number; z: number };
  container?: boolean;
  open?: boolean;
  locked?: boolean;
  transparent?: boolean;
  aliases?: string[];
  abilities?: string[];
  direction?: string;
  state?: string;
  [key: string]: AttributeValue | undefined;
}

/**
 * Generic interface for entity creation with typed attributes
 */
export interface TypedEntityCreationParams<T = StandardEntityAttributes> {
  type: string;
  attributes?: T;
  relationships?: Record<string, EntityId[]>;
}

/**
 * Configuration options for the EntityManager
 */
export interface EntityManagerConfig {
  /**
   * Map of entity types to attribute configurations
   */
  attributeConfigs?: Record<string, AttributeConfigMap>;
  
  /**
   * Map of relationship types to relationship configurations
   */
  relationshipConfigs?: RelationshipConfigMap;
  
  /**
   * Whether to validate entities on creation and update
   */
  validateEntities?: boolean;
}

/**
 * Default configuration for EntityManager
 */
const DEFAULT_CONFIG: EntityManagerConfig = {
  attributeConfigs: {},
  relationshipConfigs: {},
  validateEntities: true
};

/**
 * Provides higher-level entity operations on top of the StateManager
 */
export class EntityManager {
  private stateManager: StateManager;
  private config: EntityManagerConfig;
  private eventEmitter: EventEmitter;
  
  /**
   * Creates a new EntityManager
   * @param stateManager The state manager to use
   * @param config Configuration options
   */
  constructor(stateManager: StateManager, config: Partial<EntityManagerConfig> = {}) {
    this.stateManager = stateManager;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.eventEmitter = stateManager.getEventEmitter();
  }
  
  /**
   * Gets the current world state
   */
  public getState(): WorldState {
    return this.stateManager.getState();
  }
  
  /**
   * Gets an entity by ID
   * @param id Entity ID
   */
  public getEntity(id: EntityId): Entity | undefined {
    return this.stateManager.getEntity(id);
  }
  
  /**
   * Gets the event emitter for this entity manager
   */
  public getEventEmitter(): EventEmitter {
    return this.eventEmitter;
  }
  
  /**
   * Creates a new entity with type-safe attributes
   * @param params Entity creation parameters
   * @param options Optional creation options
   */
  public createEntity<T = StandardEntityAttributes>(
    params: TypedEntityCreationParams<T>,
    options: EntityOperationOptions = {}
  ): Entity {
    // Validate attributes if validation is enabled
    if (this.config.validateEntities) {
      this.validateAttributes(params.type, params.attributes || {});
    }
    
    // Create the entity
    const entity = this.stateManager.createEntity(params as EntityCreationParams);
    
    // Create bidirectional relationships if configured
    if (params.relationships) {
      this.createBidirectionalRelationships(entity.id, params.relationships);
    }
    
    return entity;
  }
  
  /**
   * Updates an existing entity with type-safe attributes
   * @param id Entity ID
   * @param updates Entity updates
   * @param options Update options
   */
  public updateEntity<T = StandardEntityAttributes>(
    id: EntityId,
    updates: Partial<Entity> & { attributes?: Partial<T> },
    options: EntityOperationOptions = {}
  ): Entity | undefined {
    const existingEntity = this.getEntity(id);
    if (!existingEntity) return undefined;
    
    // Validate attributes if validation is enabled
    if (this.config.validateEntities && updates.attributes) {
      this.validateAttributes(
        updates.type || existingEntity.type,
        updates.attributes
      );
    }
    
    // Update the entity
    const updatedEntity = this.stateManager.updateEntity(id, updates, options);
    
    // Update bidirectional relationships if needed
    if (updatedEntity && updates.relationships) {
      this.updateBidirectionalRelationships(
        id, 
        existingEntity.relationships, 
        updatedEntity.relationships
      );
    }
    
    return updatedEntity;
  }
  
  /**
   * Gets entity attributes with proper typing
   * @param id Entity ID
   */
  public getEntityAttributes<T = StandardEntityAttributes>(id: EntityId): T | undefined {
    const entity = this.getEntity(id);
    if (!entity) return undefined;
    
    return entity.attributes as unknown as T;
  }
  
  /**
   * Removes an entity
   * @param id Entity ID
   */
  public removeEntity(id: EntityId): boolean {
    const entity = this.getEntity(id);
    if (!entity) return false;
    
    // Clean up all bidirectional relationships before deleting
    this.cleanupEntityRelationships(entity);
    
    return this.stateManager.removeEntity(id);
  }
  
  /**
   * Creates a relationship between entities
   * @param sourceId Source entity ID
   * @param type Relationship type
   * @param targetId Target entity ID
   */
  public createRelationship(
    sourceId: EntityId,
    type: string,
    targetId: EntityId
  ): boolean {
    // Check if entities exist
    const source = this.getEntity(sourceId);
    const target = this.getEntity(targetId);
    if (!source || !target) return false;
    
    // Create the relationship
    const success = this.stateManager.createRelationship(sourceId, type, targetId);
    
    // If successful and relationship is bidirectional, create the inverse
    if (success) {
      const config = this.config.relationshipConfigs?.[type];
      if (config?.bidirectional && config.inverseType) {
        this.stateManager.createRelationship(targetId, config.inverseType, sourceId);
      }
    }
    
    return success;
  }
  
  /**
   * Removes a relationship between entities
   * @param sourceId Source entity ID
   * @param type Relationship type
   * @param targetId Target entity ID
   */
  public removeRelationship(
    sourceId: EntityId,
    type: string,
    targetId: EntityId
  ): boolean {
    // Remove the relationship
    const success = this.stateManager.removeRelationship(sourceId, type, targetId);
    
    // If successful and relationship is bidirectional, remove the inverse
    if (success) {
      const config = this.config.relationshipConfigs?.[type];
      if (config?.bidirectional && config.inverseType) {
        this.stateManager.removeRelationship(targetId, config.inverseType, sourceId);
      }
    }
    
    return success;
  }
  
  /**
   * Gets all entities of a specific type
   * @param type Entity type
   */
  public getEntitiesByType(type: string): Entity[] {
    const state = this.getState();
    return Object.values(state.entities).filter(entity => entity.type === type);
  }
  
  /**
   * Gets entities related to a specific entity
   * @param id Entity ID
   * @param type Optional relationship type to filter by
   */
  public getRelatedEntities(id: EntityId, type?: string): Entity[] {
    const entity = this.getEntity(id);
    if (!entity) return [];
    
    const relatedIds: EntityId[] = [];
    
    if (type) {
      // Get entities for a specific relationship type
      const relationships = entity.relationships[type] || [];
      relatedIds.push(...relationships);
    } else {
      // Get all related entities
      Object.values(entity.relationships).forEach(ids => {
        relatedIds.push(...ids);
      });
    }
    
    // Get the actual entity objects
    return relatedIds
      .map(relatedId => this.getEntity(relatedId))
      .filter((e): e is Entity => e !== undefined);
  }
  
  /**
   * Validates attributes against attribute configurations
   * @param type Entity type
   * @param attributes Attributes to validate
   */
  private validateAttributes(type: string, attributes: Record<string, unknown>): void {
    const configs = this.config.attributeConfigs?.[type];
    if (!configs) return;
    
    // Check for required attributes
    for (const [key, config] of Object.entries(configs)) {
      if (config.required && !(key in attributes)) {
        throw new Error(`Required attribute "${key}" missing for entity type "${type}"`);
      }
      
      // Skip validation if attribute is not present
      if (!(key in attributes)) continue;
      
      const value = attributes[key];
      
      // Type validation
      if (config.type) {
        const valueType = value === null ? 'null' : typeof value;
        if (
          (config.type === 'array' && !Array.isArray(value)) ||
          (config.type !== 'array' && config.type !== valueType)
        ) {
          throw new Error(
            `Attribute "${key}" for entity type "${type}" must be of type "${config.type}"`
          );
        }
      }
      
      // Custom validation
      if (config.validate && !config.validate(value as AttributeValue)) {
        throw new Error(
          `Attribute "${key}" for entity type "${type}" failed custom validation`
        );
      }
    }
  }
  
  /**
   * Creates bidirectional relationships for a new entity
   * @param entityId Entity ID
   * @param relationships Relationships to create
   */
  private createBidirectionalRelationships(
    entityId: EntityId,
    relationships: Record<string, EntityId[]>
  ): void {
    for (const [type, targetIds] of Object.entries(relationships)) {
      const config = this.config.relationshipConfigs?.[type];
      
      if (config?.bidirectional && config.inverseType) {
        for (const targetId of targetIds) {
          // Create inverse relationship
          this.stateManager.createRelationship(
            targetId,
            config.inverseType,
            entityId
          );
        }
      }
    }
  }
  
  /**
   * Updates bidirectional relationships when an entity is updated
   * @param entityId Entity ID
   * @param oldRelationships Old relationships
   * @param newRelationships New relationships
   */
  private updateBidirectionalRelationships(
    entityId: EntityId,
    oldRelationships: Record<string, EntityId[]>,
    newRelationships: Record<string, EntityId[]>
  ): void {
    // Process each relationship type
    for (const [type, config] of Object.entries(this.config.relationshipConfigs || {})) {
      if (!config.bidirectional || !config.inverseType) continue;
      
      const oldTargets = oldRelationships[type] || [];
      const newTargets = newRelationships[type] || [];
      
      // Find targets to add and remove
      const targetsToAdd = newTargets.filter(id => !oldTargets.includes(id));
      const targetsToRemove = oldTargets.filter(id => !newTargets.includes(id));
      
      // Create new inverse relationships
      for (const targetId of targetsToAdd) {
        this.stateManager.createRelationship(
          targetId,
          config.inverseType,
          entityId
        );
      }
      
      // Remove old inverse relationships
      for (const targetId of targetsToRemove) {
        this.stateManager.removeRelationship(
          targetId,
          config.inverseType,
          entityId
        );
      }
    }
  }
  
  /**
   * Cleans up an entity's relationships before removal
   * @param entity Entity to clean up
   */
  private cleanupEntityRelationships(entity: Entity): void {
    // For each relationship type
    for (const [type, targetIds] of Object.entries(entity.relationships)) {
      const config = this.config.relationshipConfigs?.[type];
      
      // If bidirectional, remove inverse relationships
      if (config?.bidirectional && config.inverseType) {
        for (const targetId of targetIds) {
          // Use removeRelationship instead of directly accessing stateManager
          // to ensure events are emitted properly
          this.removeRelationship(targetId, config.inverseType, entity.id);
        }
      }
    }
  }
  
  /**
   * Creates an entity with preset attributes
   * @param templateName Template name
   * @param overrides Optional attribute overrides
   */
  public createEntityFromTemplate<T = StandardEntityAttributes>(
    templateName: string,
    overrides: Partial<TypedEntityCreationParams<T>> = {}
  ): Entity | undefined {
    // This would be implemented to handle entity templates
    // We could define common entity types (room, item, character) with preset attributes
    
    // For now, just return undefined as this is a placeholder
    return undefined;
  }
}

/**
 * Creates a new entity manager with the given state manager
 * @param stateManager State manager to use
 * @param config Configuration options
 */
export function createEntityManager(
  stateManager: StateManager,
  config?: Partial<EntityManagerConfig>
): EntityManager {
  return new EntityManager(stateManager, config);
}