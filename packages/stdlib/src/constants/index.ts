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
export * from './action-failure-reason';
export * from './if-verbs';

// Convenience aggregated export
import { IFEntityType } from './if-entity-types';
import { IFRelationshipType } from './if-relationships';
import { IFEvents, IFEventTag } from './if-events';
import { IFActions, IFActionCategory } from './if-actions';
import { IFAttributes, IFAttributeType } from './if-attributes';
import { ActionFailureReason } from './action-failure-reason';
import { IFVerbs } from './if-verbs';

export const IFConstants = {
  EntityTypes: IFEntityType,
  Relationships: IFRelationshipType,
  Events: IFEvents,
  EventTags: IFEventTag,
  Actions: IFActions,
  ActionCategories: IFActionCategory,
  Attributes: IFAttributes,
  AttributeTypes: IFAttributeType,
  ActionFailureReasons: ActionFailureReason,
  Verbs: IFVerbs
} as const;

/**
 * Type aliases for convenience
 */
export type IFEntity = IFEntityType;
export type IFRelation = IFRelationshipType;
export type IFEvent = IFEvents;
export type IFAction = IFActions;
export type IFAttribute = IFAttributes;
