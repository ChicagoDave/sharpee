/**
 * Dropping action - puts down held objects
 * 
 * This action validates conditions for dropping an object and returns
 * appropriate events. It NEVER mutates state directly.
 * 
 * UPDATED: Uses new simplified context.event() method (ADR-041)
 * MIGRATED: To new folder structure with typed events (ADR-042)
 */

import { Action, ActionContext } from '../../enhanced-types';
import { SemanticEvent } from '@sharpee/core';
import { TraitType } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';

// Import our typed event data
import { DroppedEventData, DroppingErrorData } from './dropping-events';

export const droppingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.DROPPING,
  requiredMessages: [
    'no_target',
    'not_held',
    'still_worn',
    'container_not_open',
    'container_full',
    'dropped',
    'dropped_in',
    'dropped_on',
    'cant_drop_here',
    'dropped_quietly',
    'dropped_carelessly'
  ],

  execute(context: ActionContext): SemanticEvent[] {
    const actor = context.player;
    const noun = context.command.directObject?.entity;

    // Validate we have a target
    if (!noun) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'no_target',
        reason: 'no_target'
      })];
    }

    // Check if held by actor
    const currentLocation = context.world.getLocation(noun.id);
    if (currentLocation !== actor.id) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'not_held',
        reason: 'not_held',
        params: { item: noun.name }
      })];
    }

    // Check if the item is worn
    if (noun.has(TraitType.WEARABLE)) {
      const wearableTrait = noun.get(TraitType.WEARABLE);
      if (wearableTrait && (wearableTrait as any).worn) {
        return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'still_worn',
        reason: 'still_worn',
        params: { item: noun.name }
      })];
      }
    }

    // Determine where to drop the item
    // TODO: This should check for indirect object (destination) from command validation
    // For now, drops in player's immediate location
    const playerLocation = context.world.getLocation(actor.id);
    const dropLocation = playerLocation ? context.world.getEntity(playerLocation) : context.currentLocation;
    
    if (!dropLocation) {
      throw new Error('No valid drop location found');
    }

    // Build typed event data
    const droppedData: DroppedEventData = {
      item: noun.id,
      itemName: noun.name,
      toLocation: dropLocation.id,
      toLocationName: dropLocation.name
    };

    const params: Record<string, any> = {
      item: noun.name,
      location: dropLocation.name
    };

    let messageId = 'dropped';

    // Rooms can always accept dropped items
    if (!dropLocation.has(TraitType.ROOM)) {
      // If we're in a container/supporter, check if it can accept items
      if (dropLocation.has(TraitType.CONTAINER)) {
        const containerTrait = dropLocation.get(TraitType.CONTAINER);

        // Note: We don't check if the container is open/closed here because
        // if the player is already inside the container, they can drop items.
        // The open/closed state only affects movement IN/OUT from outside.

        // Check capacity
        if (containerTrait && (containerTrait as any).capacity) {
          const contents = context.world.getContents(dropLocation.id);
          const maxItems = (containerTrait as any).capacity.maxItems;
          if (maxItems !== undefined && contents.length >= maxItems) {
            return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'container_full',
        reason: 'container_full',
        params: { container: dropLocation.name }
      })];
          }
        }

        droppedData.toContainer = true;
        messageId = 'dropped_in';
        params.container = dropLocation.name;
      } else if (dropLocation.has(TraitType.SUPPORTER)) {
        droppedData.toSupporter = true;
        messageId = 'dropped_on';
        params.supporter = dropLocation.name;
      }
    } else {
      droppedData.toRoom = true;

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

    // Return both the domain event and success message
    return [
      context.event('if.event.dropped', droppedData),
      context.event('action.success', {
        actionId: context.action.id,
        messageId,
        params: params
      })
    ];
  },

  group: "object_manipulation",
  
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.CARRIED
  }
};
