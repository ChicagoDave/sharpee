/**
 * Sub-action for putting items into containers or onto supporters
 * Handles the core state mutation without validation
 */

import { IFEntity } from '@sharpee/world-model';
import { TraitType } from '@sharpee/world-model';

export interface IPutResult {
  success: boolean;
  targetType: 'container' | 'supporter';
  previousLocation?: string;
}

export interface IPutContext {
  moveEntity: (entityId: string, newLocation: string) => void;
  getLocation: (entityId: string) => string | undefined;
}

/**
 * Put an item into a container or onto a supporter
 * Assumes all validation has been done by the main action
 */
export function put(
  item: IFEntity,
  target: IFEntity,
  context: IPutContext
): IPutResult {
  // Get previous location
  const previousLocation = context.getLocation(item.id);
  
  // Determine target type
  const targetType = target.has(TraitType.CONTAINER) ? 'container' : 'supporter';
  
  // Move the item to the target
  context.moveEntity(item.id, target.id);
  
  return {
    success: true,
    targetType,
    previousLocation
  };
}