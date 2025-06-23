// packages/stdlib/src/constants/index.ts
/**
 * Interactive Fiction constants for Sharpee stdlib
 *
 * These constants define the standard vocabulary of Interactive Fiction:
 * entity types, relationships, events, actions, and attributes.
 */
// Export all IF-specific constants
export * from './if-entity-types';
export * from './if-relationships';
export * from './if-events';
export * from './if-actions';
export * from './if-attributes';
export * from './movement-systems';
// Convenience aggregated export
import { IFEntityType } from './if-entity-types';
import { IFRelationshipType } from './if-relationships';
import { IFEvents, IFEventTag } from './if-events';
import { IFActions, IFActionCategory } from './if-actions';
import { IFAttributes, IFAttributeType } from './if-attributes';
export const IFConstants = {
    EntityTypes: IFEntityType,
    Relationships: IFRelationshipType,
    Events: IFEvents,
    EventTags: IFEventTag,
    Actions: IFActions,
    ActionCategories: IFActionCategory,
    Attributes: IFAttributes,
    AttributeTypes: IFAttributeType
};
//# sourceMappingURL=index.js.map