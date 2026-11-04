// packages/core/src/types/entity.ts

/**
 * Unique identifier for entities
 */
export type EntityId = string;

/**
 * The base Entity interface representing any object in a narrative system
 */
export interface IEntity {
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
export interface IEntityCreationParams {
  type: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<string, EntityId[]>;
}
