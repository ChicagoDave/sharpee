/**
 * Core constants for Sharpee
 *
 * These are generic, system-level constants that don't assume any particular
 * type of narrative or game. IF-specific constants are in @sharpee/stdlib.
 */
// Export generic constants only
export * from './entity-types';
export * from './relationships';
export * from './attributes';
export * from './core-events';
// Convenience export
import { CoreEntityType } from './entity-types';
import { CoreRelationshipType } from './relationships';
import { CoreAttributes } from './attributes';
import { CoreEvents, CoreEventCategory } from './core-events';
export const CoreConstants = {
    EntityTypes: CoreEntityType,
    Relationships: CoreRelationshipType,
    Attributes: CoreAttributes,
    Events: CoreEvents,
    EventCategories: CoreEventCategory
};
//# sourceMappingURL=index.js.map