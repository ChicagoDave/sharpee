/**
 * Interactive Fiction constants for Sharpee stdlib
 *
 * These constants define the standard vocabulary of Interactive Fiction:
 * entity types, relationships, events, actions, and attributes.
 */
export * from './if-entity-types';
export * from './if-relationships';
export * from './if-events';
export * from './if-actions';
export * from './if-attributes';
export * from './movement-systems';
import { IFEntityType } from './if-entity-types';
import { IFRelationshipType } from './if-relationships';
import { IFEvents, IFEventTag } from './if-events';
import { IFActions, IFActionCategory } from './if-actions';
import { IFAttributes, IFAttributeType } from './if-attributes';
export declare const IFConstants: {
    readonly EntityTypes: typeof IFEntityType;
    readonly Relationships: typeof IFRelationshipType;
    readonly Events: typeof IFEvents;
    readonly EventTags: typeof IFEventTag;
    readonly Actions: typeof IFActions;
    readonly ActionCategories: typeof IFActionCategory;
    readonly Attributes: typeof IFAttributes;
    readonly AttributeTypes: typeof IFAttributeType;
};
/**
 * Type aliases for convenience
 */
export type IFEntity = IFEntityType;
export type IFRelation = IFRelationshipType;
export type IFEvent = IFEvents;
export type IFAction = IFActions;
export type IFAttribute = IFAttributes;
