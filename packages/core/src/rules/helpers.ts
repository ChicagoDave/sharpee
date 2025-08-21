/**
 * Helper functions for common rule patterns
 */

import { EntityId } from '../types/entity';
import { ISemanticEvent } from '../events/types';
import { IRuleWorld, IEntityChange } from './types';

/**
 * Helper to get the target item from an event
 */
export function getTargetItem(event: ISemanticEvent, world: IRuleWorld) {
  const targetId = event.entities.target || (event.data as any)?.itemId;
  // Ensure targetId is a string before passing to getEntity
  if (typeof targetId === 'string') {
    return world.getEntity(targetId);
  }
  return undefined;
}

/**
 * Helper to get the actor from an event
 */
export function getActor(event: ISemanticEvent, world: IRuleWorld) {
  const actorId = event.entities.actor;
  return actorId ? world.getEntity(actorId) : undefined;
}

/**
 * Helper to check if entity has a specific name/id
 */
export function entityIs(entity: any, nameOrId: string): boolean {
  return entity?.id === nameOrId || entity?.attributes?.name === nameOrId;
}

/**
 * Helper to get entity attribute value
 */
export function getAttribute(entity: any, attribute: string): any {
  return entity?.attributes?.[attribute];
}

/**
 * Helper to check if entity has an ability
 */
export function hasAbility(entity: any, ability: string): boolean {
  return entity?.attributes?.[`ability_${ability}`] === true;
}

/**
 * Helper to create an entity change that gives an ability
 */
export function giveAbility(entityId: EntityId, ability: string): IEntityChange {
  return {
    entityId,
    attribute: `ability_${ability}`,
    value: true
  };
}

/**
 * Helper to create an entity change that removes an ability
 */
export function removeAbility(entityId: EntityId, ability: string): IEntityChange {
  return {
    entityId,
    attribute: `ability_${ability}`,
    value: undefined
  };
}

/**
 * Helper to create an entity change that sets an attribute
 */
export function setAttribute(entityId: EntityId, attribute: string, value: any): IEntityChange {
  return {
    entityId,
    attribute,
    value
  };
}

/**
 * Common condition: item weight vs player strength
 */
export function itemTooHeavy(event: ISemanticEvent, world: IRuleWorld): boolean {
  const item = getTargetItem(event, world);
  const player = world.getPlayer();
  
  const itemWeight = getAttribute(item, 'weight') || 0;
  const playerStrength = getAttribute(player, 'strength') || 10;
  
  return itemWeight > playerStrength;
}

/**
 * Common condition: check if taking a specific item
 */
export function isTaking(itemNameOrId: string) {
  return (event: ISemanticEvent, world: IRuleWorld): boolean => {
    const item = getTargetItem(event, world);
    return entityIs(item, itemNameOrId);
  };
}

/**
 * Common condition: player has specific ability
 */
export function playerHasAbility(ability: string) {
  return (event: ISemanticEvent, world: IRuleWorld): boolean => {
    const player = world.getPlayer();
    return hasAbility(player, ability);
  };
}
