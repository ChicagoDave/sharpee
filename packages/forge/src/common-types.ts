/**
 * Common types and constants for the Forge layer
 */

/**
 * Standard compass directions for movement
 */
export type Direction = 
  | 'north' | 'south' | 'east' | 'west'
  | 'northeast' | 'northwest' | 'southeast' | 'southwest'
  | 'up' | 'down' | 'in' | 'out'
  | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | 'u' | 'd';

/**
 * Relationship types for connecting entities
 */
export type RelationshipType = 
  | 'contains'
  | 'supports' 
  | 'connects'
  | 'north' | 'south' | 'east' | 'west'
  | 'northeast' | 'northwest' | 'southeast' | 'southwest'
  | 'up' | 'down' | 'in' | 'out';

/**
 * Entity identifier type
 */
export type EntityId = string;
