/**
 * Opened → Revealed Event Chain (ADR-094)
 *
 * This chain handler generates a `if.event.revealed` event when a container
 * is opened and has contents. This decouples the opening action from content
 * revelation, allowing stories to override or extend this behavior.
 *
 * Chain flow:
 * 1. Opening action emits `if.event.opened` with targetId
 * 2. This handler checks if target is a container with contents
 * 3. If yes, returns `if.event.revealed` with items list
 * 4. Language layer renders "Inside you see..." from revealed event
 */

import { ISemanticEvent } from '@sharpee/core';
import { IWorldModel, TraitType } from '@sharpee/world-model';
import { RevealedEventData } from '../actions/standard/opening/opening-events';

/**
 * Key for this chain - allows stories to replace the stdlib behavior
 */
export const OPENED_REVEALED_CHAIN_KEY = 'stdlib.chain.opened-revealed';

/**
 * Create the opened→revealed chain handler.
 *
 * Returns a handler function that generates revealed events when
 * containers are opened.
 */
export function createOpenedRevealedChain() {
  return (event: ISemanticEvent, world: IWorldModel): ISemanticEvent | null => {
    // Extract target from the opened event
    const eventData = event.data as { targetId?: string; targetName?: string };
    const { targetId, targetName } = eventData;

    if (!targetId) {
      return null;
    }

    // Get the target entity
    const target = world.getEntity(targetId);
    if (!target) {
      return null;
    }

    // Only generate revealed event for containers
    if (!target.has(TraitType.CONTAINER)) {
      return null;
    }

    // Get the contents of the container
    const contents = world.getContents(targetId);

    // No revealed event for empty containers
    if (contents.length === 0) {
      return null;
    }

    // Build the revealed event data
    const revealedData: RevealedEventData = {
      containerId: targetId,
      containerName: targetName || target.name || 'container',
      items: contents.map(item => ({
        entityId: item.id,
        // Use item name as messageId for now
        // Language layer can map this to proper article/description
        messageId: item.name || item.id
      }))
    };

    // Generate unique ID for the chained event
    const eventId = `revealed-${targetId}-${Date.now()}`;

    return {
      id: eventId,
      type: 'if.event.revealed',
      timestamp: Date.now(),
      entities: {
        target: targetId,
        others: contents.map(item => item.id)
      },
      data: revealedData
    };
  };
}
