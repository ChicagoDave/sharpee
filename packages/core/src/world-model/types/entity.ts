// packages/core/src/world-model/types/entity.ts

/**
 * Unique identifier for entities in the world
 */
export type EntityId = string;

/**
 * The base Entity interface representing any object in the world model
 */
export interface Entity {
  /**
   * Unique identifier for this entity
   */
  id: EntityId;
  
  /**
   * The entity type, used for categorization and type checking
   */
  type: string;
  
  /**
   * Arbitrary attributes/properties of the entity
   */
  attributes: Record<string, unknown>;
  
  /**
   * Relationships to other entities, organized by relationship type
   */
  relationships: Record<string, EntityId[]>;
}

/**
 * Minimal information needed to create a new entity
 */
export interface EntityCreationParams {
  type: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<string, EntityId[]>;
}

/**
 * Configuration for how entity operations should be performed
 */
export interface EntityOperationOptions {
  /**
   * Whether to merge arrays in relationships instead of replacing them
   */
  mergeRelationships?: boolean;
  
  /**
   * Whether to validate relationship target existence
   */
  validateRelationships?: boolean;
}