/**
 * Sub-action for removing items from containers or supporters
 * Handles the core state mutation of moving an item from its container/supporter to the actor
 */

import { IFEntity } from '@sharpee/world-model';
import { TraitType } from '@sharpee/world-model';

export interface IRemoveResult {
  success: boolean;
  sourceType: 'container' | 'supporter';
  previousLocation?: string;
}

export interface IRemoveContext {
  moveEntity: (entityId: string, newLocation: string) => void;
  getLocation: (entityId: string) => string | undefined;
}

/**
 * Remove an item from a container or supporter and give it to the actor
 * Assumes all validation has been done by the main action
 */
export function remove(
  item: IFEntity,
  source: IFEntity,
  actor: IFEntity,
  context: IRemoveContext
): IRemoveResult {
  // Get previous location (should be the source)
  const previousLocation = context.getLocation(item.id);
  
  // Determine source type
  const sourceType = source.has(TraitType.CONTAINER) ? 'container' : 'supporter';
  
  // Move the item to the actor (taking it)
  context.moveEntity(item.id, actor.id);
  
  return {
    success: true,
    sourceType,
    previousLocation
  };
}