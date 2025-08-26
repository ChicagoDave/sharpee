/**
 * Data builder for taking action
 * 
 * Centralizes all entity snapshot logic for the taking action.
 * This separates data structure concerns from business logic.
 */

import { ActionDataBuilder, ActionDataConfig } from '../../data-builder-types';
import { ActionContext } from '../../enhanced-types';
import { WorldModel } from '@sharpee/world-model';
import { captureEntitySnapshot } from '../../base/snapshot-utils';

/**
 * Build taken event data
 * 
 * Creates the complete data structure for taken events,
 * including entity snapshots.
 */
export const buildTakenData: ActionDataBuilder<Record<string, unknown>> = (
  context: ActionContext,
  preState?: WorldModel,
  postState?: WorldModel
): Record<string, unknown> => {
  const actor = context.player;
  const noun = context.command.directObject?.entity;
  
  if (!noun) {
    // Shouldn't happen if validation passed
    return {
      item: 'nothing'
    };
  }
  
  // Get the previous location from context (stored during execute)
  const previousLocation = (context as any)._previousLocation;
  
  // Capture snapshots after the mutation
  const itemSnapshot = captureEntitySnapshot(noun, context.world, true);
  const actorSnapshot = captureEntitySnapshot(actor, context.world, false);
  
  const data: Record<string, unknown> = {
    // New atomic structure
    itemSnapshot: itemSnapshot,
    actorSnapshot: actorSnapshot,
    // Backward compatibility
    item: noun.name
  };
  
  // Add container/supporter info if item was taken from one
  if (previousLocation && previousLocation !== context.world.getLocation(actor.id)) {
    const container = context.world.getEntity(previousLocation);
    if (container) {
      data.fromLocation = previousLocation;
      
      if (container.has && container.has('container')) {
        data.fromContainer = true;
        data.container = container.name;
      } else if (container.has && container.has('supporter')) {
        data.fromSupporter = true;
        data.container = container.name; // Use container field for backward compatibility
        data.supporter = container.name;
      } else if (container.has && container.has('actor')) {
        // When taking from another actor (e.g., worn items)
        data.container = container.name;
      }
    }
  }
  
  return data;
};

/**
 * Configuration for taking data builder
 * 
 * Allows stories to extend the data while protecting core fields
 */
export const takenDataConfig: ActionDataConfig<Record<string, unknown>> = {
  builder: buildTakenData,
  protectedFields: ['item', 'itemSnapshot', 'actorSnapshot']
};