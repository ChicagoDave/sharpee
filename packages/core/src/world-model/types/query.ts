// packages/core/src/world-model/types/query.ts

import { Entity, EntityId } from './entity';
import { AttributeValue } from './attribute';

/**
 * A predicate function that tests if an entity matches certain criteria
 */
export type EntityPredicate = (entity: Entity) => boolean;

/**
 * Represents a query to find entities in the world state
 */
export interface EntityQuery {
  /**
   * Match entities of these types
   */
  types?: string[];
  
  /**
   * Match entities with these attribute values
   */
  attributes?: Record<string, AttributeValue>;
  
  /**
   * Match entities with these relationship types
   */
  relationships?: Record<string, EntityId[]>;
  
  /**
   * Custom predicate function for complex matching
   */
  predicate?: EntityPredicate;
  
  /**
   * Match any of the conditions instead of all (OR instead of AND)
   */
  matchAny?: boolean;
}

/**
 * Result of an entity query
 */
export interface QueryResult {
  /**
   * IDs of entities that matched the query
   */
  ids: EntityId[];
  
  /**
   * The actual entity objects that matched
   */
  entities: Entity[];
}

/**
 * Options for entity queries
 */
export interface QueryOptions {
  /**
   * Maximum number of results to return
   */
  limit?: number;
  
  /**
   * Sort results by this attribute
   */
  sortBy?: string;
  
  /**
   * Sort direction
   */
  sortDirection?: 'asc' | 'desc';
}