/**
 * Core constants for Sharpee
 *
 * These are generic, system-level constants that don't assume any particular
 * type of narrative or game. IF-specific constants are in @sharpee/stdlib.
 */
export * from './entity-types';
export * from './relationships';
export * from './attributes';
export * from './core-events';
import { CoreEntityType } from './entity-types';
import { CoreRelationshipType } from './relationships';
import { CoreAttributes } from './attributes';
import { CoreEvents, CoreEventCategory } from './core-events';
export declare const CoreConstants: {
    readonly EntityTypes: typeof CoreEntityType;
    readonly Relationships: typeof CoreRelationshipType;
    readonly Attributes: typeof CoreAttributes;
    readonly Events: typeof CoreEvents;
    readonly EventCategories: typeof CoreEventCategory;
};
