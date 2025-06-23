/**
 * Helper functions for common rule patterns
 */
import { EntityId } from '../types/entity';
import { SemanticEvent } from '../events/types';
import { RuleWorld, EntityChange } from './types';
/**
 * Helper to get the target item from an event
 */
export declare function getTargetItem(event: SemanticEvent, world: RuleWorld): any;
/**
 * Helper to get the actor from an event
 */
export declare function getActor(event: SemanticEvent, world: RuleWorld): any;
/**
 * Helper to check if entity has a specific name/id
 */
export declare function entityIs(entity: any, nameOrId: string): boolean;
/**
 * Helper to get entity attribute value
 */
export declare function getAttribute(entity: any, attribute: string): any;
/**
 * Helper to check if entity has an ability
 */
export declare function hasAbility(entity: any, ability: string): boolean;
/**
 * Helper to create an entity change that gives an ability
 */
export declare function giveAbility(entityId: EntityId, ability: string): EntityChange;
/**
 * Helper to create an entity change that removes an ability
 */
export declare function removeAbility(entityId: EntityId, ability: string): EntityChange;
/**
 * Helper to create an entity change that sets an attribute
 */
export declare function setAttribute(entityId: EntityId, attribute: string, value: any): EntityChange;
/**
 * Common condition: item weight vs player strength
 */
export declare function itemTooHeavy(event: SemanticEvent, world: RuleWorld): boolean;
/**
 * Common condition: check if taking a specific item
 */
export declare function isTaking(itemNameOrId: string): (event: SemanticEvent, world: RuleWorld) => boolean;
/**
 * Common condition: player has specific ability
 */
export declare function playerHasAbility(ability: string): (event: SemanticEvent, world: RuleWorld) => boolean;
