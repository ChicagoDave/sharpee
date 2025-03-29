// packages/core/src/world-model/types/relationship.ts

import { EntityId } from './entity';

/**
 * Defines the types of relationships that can exist between entities
 */
export enum RelationshipType {
  CONTAINS = 'contains',
  CONTAINED_BY = 'containedBy',
  CONNECTS_TO = 'connectsTo',
  CONNECTED_FROM = 'connectedFrom',
  SUPPORTS = 'supports',
  SUPPORTED_BY = 'supportedBy',
  ADJACENT_TO = 'adjacentTo',
  BELONGS_TO = 'belongsTo',
  RELATED_TO = 'relatedTo'
}

/**
 * A relationship between two entities
 */
export interface Relationship {
  /**
   * The source entity of the relationship
   */
  sourceId: EntityId;
  
  /**
   * The type of relationship
   */
  type: RelationshipType | string;
  
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
  inverseType?: RelationshipType | string;
  
  /**
   * Whether this relationship is exclusive (replaces previous relationships of same type)
   */
  exclusive?: boolean;
}

/**
 * Map of relationship type configurations
 */
export type RelationshipConfigMap = Record<string, RelationshipConfig>;

/**
 * Standard relationship configurations with their inverse mappings
 */
export const STANDARD_RELATIONSHIP_CONFIGS: RelationshipConfigMap = {
  [RelationshipType.CONTAINS]: {
    bidirectional: true,
    inverseType: RelationshipType.CONTAINED_BY,
    exclusive: false
  },
  [RelationshipType.CONNECTS_TO]: {
    bidirectional: true,
    inverseType: RelationshipType.CONNECTED_FROM,
    exclusive: false
  },
  [RelationshipType.SUPPORTS]: {
    bidirectional: true,
    inverseType: RelationshipType.SUPPORTED_BY,
    exclusive: false
  },
  [RelationshipType.ADJACENT_TO]: {
    bidirectional: true,
    inverseType: RelationshipType.ADJACENT_TO,
    exclusive: false
  }
};