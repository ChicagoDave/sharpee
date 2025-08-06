/**
 * Standard Interactive Fiction entity types
 * 
 * These represent the fundamental object types in IF games.
 * The values match the type strings used throughout the system.
 */
export const EntityType = {
  /** A location in the game world */
  ROOM: 'room',
  
  /** A doorway or portal between rooms */
  DOOR: 'door',
  
  /** A generic takeable object */
  ITEM: 'item',
  
  /** A character (NPC or player) */
  ACTOR: 'actor',
  
  /** An object that can contain other objects */
  CONTAINER: 'container',
  
  /** An object that can support other objects on top */
  SUPPORTER: 'supporter',
  
  /** Fixed decorative objects that can't be taken */
  SCENERY: 'scenery',
  
  /** A directional exit (rarely used as entity) */
  EXIT: 'exit',
  
  /** Generic object type (default) */
  OBJECT: 'object'
} as const;

/**
 * Type representing valid entity types
 */
export type EntityType = typeof EntityType[keyof typeof EntityType];

/**
 * Type guard to check if a string is a valid IF entity type
 */
export function isEntityType(type: string): type is EntityType {
  return Object.values(EntityType).includes(type as EntityType);
}

/**
 * Get the ID prefix for an entity type
 * Used for generating consistent entity IDs
 */
export function getEntityTypePrefix(type: EntityType): string {
  const prefixMap: Record<EntityType, string> = {
    [EntityType.ROOM]: 'r',
    [EntityType.DOOR]: 'd', 
    [EntityType.ITEM]: 'i',
    [EntityType.ACTOR]: 'a',
    [EntityType.CONTAINER]: 'c',
    [EntityType.SUPPORTER]: 's',
    [EntityType.SCENERY]: 'y',
    [EntityType.EXIT]: 'e',
    [EntityType.OBJECT]: 'o'
  };
  
  return prefixMap[type] || 'o';
}