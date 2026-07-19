/**
 * Core constants for Sharpee
 * 
 * These are generic, system-level constants that don't assume any particular
 * type of narrative or game. IF-specific constants are in @sharpee/stdlib.
 */

// Export generic constants only
export * from './entity-types.js';
export * from './relationships.js';
export * from './attributes.js';
export * from './core-events.js';

// Convenience export
import { CoreEntityType } from './entity-types.js';
import { CoreRelationshipType } from './relationships.js';
import { CoreAttributes } from './attributes.js';
import { CoreEvents, CoreEventCategory } from './core-events.js';

export const CoreConstants = {
  EntityTypes: CoreEntityType,
  Relationships: CoreRelationshipType,
  Attributes: CoreAttributes,
  Events: CoreEvents,
  EventCategories: CoreEventCategory
} as const;
