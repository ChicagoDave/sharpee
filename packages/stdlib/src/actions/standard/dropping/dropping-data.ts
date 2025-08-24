/**
 * Data builder for dropping action
 * 
 * Centralizes all entity snapshot logic for the dropping action.
 * This separates data structure concerns from business logic.
 */

import { ActionDataBuilder, ActionDataConfig } from '../../data-builder-types';
import { ActionContext } from '../../enhanced-types';
import { WorldModel, TraitType } from '@sharpee/world-model';
import { captureEntitySnapshot } from '../../base/snapshot-utils';

/**
 * Build dropped event data
 * 
 * Creates the complete data structure for dropped events,
 * including entity snapshots and location information.
 */
export const buildDroppedData: ActionDataBuilder<Record<string, unknown>> = (
  context: ActionContext,
  preState?: WorldModel,
  postState?: WorldModel
): Record<string, unknown> => {
  const actor = context.player;
  const noun = context.command.directObject?.entity;
  
  if (!noun) {
    // Shouldn't happen if validation passed
    return {
      item: '',
      itemName: 'nothing',
      toLocation: '',
      toLocationName: 'nowhere'
    };
  }
  
  // Determine drop location
  const playerLocation = context.world.getLocation(actor.id);
  const dropLocation = playerLocation ? context.world.getEntity(playerLocation) : context.currentLocation;
  
  if (!dropLocation) {
    throw new Error('No valid drop location found');
  }
  
  // Capture snapshots
  const itemSnapshot = captureEntitySnapshot(noun, context.world, true);
  const actorSnapshot = captureEntitySnapshot(actor, context.world, false);
  const locationSnapshot = captureEntitySnapshot(
    dropLocation, 
    context.world, 
    dropLocation.has(TraitType.ROOM)
  );
  
  // Build base data
  const data: Record<string, unknown> = {
    item: noun.id,
    itemName: noun.name,
    toLocation: dropLocation.id,
    toLocationName: dropLocation.name,
    // Add atomic event snapshots
    itemSnapshot: itemSnapshot,
    actorSnapshot: actorSnapshot,
    locationSnapshot: locationSnapshot
  };
  
  // Add location type flags
  if (!dropLocation.has(TraitType.ROOM)) {
    if (dropLocation.has(TraitType.CONTAINER)) {
      data.toContainer = true;
    } else if (dropLocation.has(TraitType.SUPPORTER)) {
      data.toSupporter = true;
    }
  } else {
    data.toRoom = true;
  }
  
  return data;
};

/**
 * Determine the success message for dropping
 */
export function determineDroppingMessage(
  droppedData: Record<string, unknown>,
  context: ActionContext
): { messageId: string; params: Record<string, any> } {
  const noun = context.command.directObject?.entity;
  const dropLocation = context.world.getEntity(droppedData.toLocation as string);
  
  if (!noun || !dropLocation) {
    return {
      messageId: 'dropped',
      params: { item: droppedData.itemName }
    };
  }
  
  const params: Record<string, any> = {
    item: noun.name,
    location: dropLocation.name
  };
  
  let messageId = 'dropped';
  
  // Determine message based on drop location
  if (droppedData.toContainer) {
    messageId = 'dropped_in';
    params.container = dropLocation.name;
  } else if (droppedData.toSupporter) {
    messageId = 'dropped_on';
    params.supporter = dropLocation.name;
  } else if (droppedData.toRoom) {
    // Vary the message based on how the item is dropped
    const verb = context.command.parsed.structure.verb?.text.toLowerCase() || 'drop';
    if (verb === 'discard') {
      messageId = 'dropped_carelessly';
    } else if (noun.has(TraitType.IDENTITY)) {
      // Check if item name suggests it's fragile
      const identity = noun.get(TraitType.IDENTITY);
      if (identity && (identity as any).name?.toLowerCase().includes('glass')) {
        messageId = 'dropped_quietly';
      }
    }
  }
  
  return { messageId, params };
}

/**
 * Configuration for dropping data builder
 * 
 * Allows stories to extend the data while protecting core fields
 */
export const droppedDataConfig: ActionDataConfig<Record<string, unknown>> = {
  builder: buildDroppedData,
  protectedFields: ['item', 'itemName', 'toLocation', 'toLocationName']
};