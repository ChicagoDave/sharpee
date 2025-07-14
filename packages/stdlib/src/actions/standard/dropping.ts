/**
 * Dropping action - puts down held objects
 * 
 * This action validates conditions for dropping an object and returns
 * appropriate events. It NEVER mutates state directly.
 */

import { Action, EnhancedActionContext } from '../enhanced-types';
import { SemanticEvent } from '@sharpee/core';
import { TraitType } from '@sharpee/world-model';
import { IFActions } from '../constants';

export const droppingAction: Action = {
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

  execute(context: EnhancedActionContext): SemanticEvent[] {
    const actor = context.player;
    const noun = context.command.directObject?.entity;

    // Validate we have a target
    if (!noun) {
      return context.emitError('no_target');
    }

    // Check if held by actor
    const currentLocation = context.world.getLocation(noun.id);
    if (currentLocation !== actor.id) {
      return context.emitError('not_held', { item: noun.name });
    }

    // Check if the item is worn
    if (noun.has(TraitType.WEARABLE)) {
      const wearableTrait = noun.get(TraitType.WEARABLE);
      if (wearableTrait && (wearableTrait as any).worn) {
        return context.emitError('still_worn', { item: noun.name });
      }
    }

    // Check if the current location can accept items
    const dropLocation = context.currentLocation;

    // Build event data
    const eventData: Record<string, unknown> = {
      item: noun.id,
      itemName: noun.name,
      toLocation: dropLocation.id,
      toLocationName: dropLocation.name
    };

    const messageParams: Record<string, any> = {
      item: noun.name,
      location: dropLocation.name
    };

    let messageId = 'dropped';

    // Rooms can always accept dropped items
    if (!dropLocation.has(TraitType.ROOM)) {
      // If we're in a container/supporter, check if it can accept items
      if (dropLocation.has(TraitType.CONTAINER)) {
        const containerTrait = dropLocation.get(TraitType.CONTAINER);

        // Check if container is open
        if (dropLocation.has(TraitType.OPENABLE)) {
          const openableTrait = dropLocation.get(TraitType.OPENABLE);
          if (openableTrait && !(openableTrait as any).isOpen) {
            return context.emitError('container_not_open', {
              container: dropLocation.name
            });
          }
        }

        // Check capacity
        if (containerTrait && (containerTrait as any).capacity) {
          const contents = context.world.getContents(dropLocation.id);
          const maxItems = (containerTrait as any).capacity.maxItems;
          if (maxItems !== undefined && contents.length >= maxItems) {
            return context.emitError('container_full', {
              container: dropLocation.name
            });
          }
        }

        eventData.toContainer = true;
        messageId = 'dropped_in';
        messageParams.container = dropLocation.name;
      } else if (dropLocation.has(TraitType.SUPPORTER)) {
        eventData.toSupporter = true;
        messageId = 'dropped_on';
        messageParams.supporter = dropLocation.name;
      }
    } else {
      eventData.toRoom = true;

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

    // Create events
    const events: SemanticEvent[] = [];

    // Create the DROPPED event for world model
    events.push(context.emit('if.event.dropped', eventData));

    // Add success message
    events.push(...context.emitSuccess(messageId, messageParams));

    return events;
  },

  group: "object_manipulation"
};
