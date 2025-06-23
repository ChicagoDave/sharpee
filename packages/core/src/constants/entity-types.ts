// packages/core/src/constants/entity-types.ts

/**
 * Core entity types - generic types that any system might use
 * Game-specific types should be defined in their respective packages
 */
export enum CoreEntityType {
  // Base entity type
  ENTITY = 'core.entity',
  
  // Component entities (for ECS-style systems)
  COMPONENT = 'core.component',
  
  // System entities
  SYSTEM = 'core.system',
  
  // Extension entities
  EXTENSION = 'core.extension'
}

/**
 * Type guard for core entity types
 */
export function isCoreEntityType(type: string): type is CoreEntityType {
  return Object.values(CoreEntityType).includes(type as CoreEntityType);
}
