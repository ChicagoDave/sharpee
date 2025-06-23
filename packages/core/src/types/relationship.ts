// packages/core/src/types/relationship.ts

import { EntityId } from './entity';

/**
 * A generic relationship between two entities
 */
export interface Relationship {
  /**
   * The source entity of the relationship
   */
  sourceId: EntityId;
  
  /**
   * The type of relationship (can be any string)
   */
  type: string;
  
  /**
   * The target entity of the relationship
   */
  targetId: EntityId;
  
  /**
   * Optional metadata for the relationship
   */
  metadata?: Record<string, unknown>;
}

/**
 * Configuration for creating a relationship
 */
export interface RelationshipConfig {
  /**
   * Whether this relationship creates an inverse relationship automatically
   */
  bidirectional?: boolean;
  
  /**
   * If bidirectional, the name of the inverse relationship
   */
  inverseType?: string;
  
  /**
   * Whether this relationship is exclusive (replaces previous relationships of same type)
   */
  exclusive?: boolean;
}

/**
 * Map of relationship type configurations
 */
export type RelationshipConfigMap = Record<string, RelationshipConfig>;
