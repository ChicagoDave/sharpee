// packages/core/src/constants/relationships.ts

/**
 * Core relationship types - generic relationships that any system might use
 * Game-specific relationships should be defined in their respective packages
 */
export enum CoreRelationshipType {
  // Basic hierarchical relationships
  PARENT = 'core.parent',
  CHILD = 'core.child',
  
  // Generic associations
  RELATED_TO = 'core.related_to',
  DEPENDS_ON = 'core.depends_on',
  
  // Component relationships (for ECS-style systems)
  HAS_COMPONENT = 'core.has_component',
  COMPONENT_OF = 'core.component_of'
}

/**
 * Configuration for core relationships
 */
export interface ICoreRelationshipConfig {
  bidirectional?: boolean;
  inverse?: CoreRelationshipType;
  exclusive?: boolean;
}

/**
 * Standard configurations for core relationships
 */
export const CORE_RELATIONSHIP_CONFIGS: Record<CoreRelationshipType, ICoreRelationshipConfig> = {
  [CoreRelationshipType.PARENT]: {
    bidirectional: true,
    inverse: CoreRelationshipType.CHILD,
    exclusive: true
  },
  [CoreRelationshipType.CHILD]: {
    bidirectional: true,
    inverse: CoreRelationshipType.PARENT,
    exclusive: false
  },
  [CoreRelationshipType.RELATED_TO]: {
    bidirectional: true,
    inverse: CoreRelationshipType.RELATED_TO,
    exclusive: false
  },
  [CoreRelationshipType.DEPENDS_ON]: {
    bidirectional: false,
    exclusive: false
  },
  [CoreRelationshipType.HAS_COMPONENT]: {
    bidirectional: true,
    inverse: CoreRelationshipType.COMPONENT_OF,
    exclusive: false
  },
  [CoreRelationshipType.COMPONENT_OF]: {
    bidirectional: true,
    inverse: CoreRelationshipType.HAS_COMPONENT,
    exclusive: true
  }
};
