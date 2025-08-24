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
  
  // Capture snapshots after the mutation
  const itemSnapshot = captureEntitySnapshot(noun, context.world, true);
  const actorSnapshot = captureEntitySnapshot(actor, context.world, false);
  
  return {
    // New atomic structure
    itemSnapshot: itemSnapshot,
    actorSnapshot: actorSnapshot,
    // Backward compatibility
    item: noun.name
  };
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