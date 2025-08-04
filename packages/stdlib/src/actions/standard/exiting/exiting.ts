/**
 * Exiting action - exit from containers, supporters, or other enterable objects
 * 
 * This action handles exiting objects that the actor is currently inside/on.
 */

import { Action, ActionContext } from '../../enhanced-types';
import { SemanticEvent } from '@sharpee/core';
import { TraitType, EntryTrait } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ExitedEventData } from './exiting-events';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';

export const exitingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.EXITING,
  requiredMessages: [
    'already_outside',
    'container_closed',
    'cant_exit',
    'exited',
    'exited_from',
    'nowhere_to_go'
  ],
  group: 'movement',
  
  execute(context: ActionContext): SemanticEvent[] {
    const actor = context.player;
    const currentLocation = context.world.getLocation(actor.id);
    
    if (!currentLocation) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'nowhere_to_go',
        reason: 'nowhere_to_go'
      })];
    }
    
    const currentContainer = context.world.getEntity(currentLocation);
    if (!currentContainer) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'nowhere_to_go',
        reason: 'nowhere_to_go'
      })];
    }
    
    // Check if we're in something we can exit from
    // Must be in a container, supporter, or entry - not just a plain room
    const isExitable = currentContainer.has(TraitType.CONTAINER) || 
                      currentContainer.has(TraitType.SUPPORTER) ||
                      currentContainer.has(TraitType.ENTRY);
    
    if (!isExitable) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'already_outside',
        reason: 'already_outside'
      })];
    }
    
    // Find the parent location (where we'll exit to)
    const parentLocation = context.world.getLocation(currentLocation);
    if (!parentLocation) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'nowhere_to_go',
        reason: 'nowhere_to_go'
      })];
    }
    
    // Check if the current location allows exiting
    let canExit = true;
    let preposition = 'from';
    
    // Determine preposition based on container type
    if (currentContainer.has(TraitType.CONTAINER)) {
      preposition = 'out of';
    } else if (currentContainer.has(TraitType.SUPPORTER)) {
      preposition = 'off';
    }
    
    if (currentContainer.has(TraitType.ENTRY)) {
      const entryTrait = currentContainer.get(TraitType.ENTRY) as EntryTrait;
      // Note: We check canEnter because if you can't enter, you probably can't exit either
      // In a more complex system, there might be a separate canExit property
      if (!entryTrait.canEnter) {
        canExit = false;
      }
      // Entry trait can override preposition
      const entryPrep = entryTrait.preposition || 'in';
      // Convert preposition for exiting
      if (entryPrep === 'in') preposition = 'out of';
      else if (entryPrep === 'on') preposition = 'off';
      else if (entryPrep === 'under') preposition = 'from under';
      else if (entryPrep === 'behind') preposition = 'from behind';
    }
    
    // Check if container needs to be open to exit
    if (currentContainer.has(TraitType.CONTAINER) && currentContainer.has(TraitType.OPENABLE)) {
      const openableTrait = currentContainer.get(TraitType.OPENABLE) as { isOpen?: boolean };
      if (!openableTrait.isOpen) {
        return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'container_closed',
        reason: 'container_closed',
        params: { container: currentContainer.name }
      })];
      }
    }
    
    if (!canExit) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'cant_exit',
        reason: 'cant_exit',
        params: { place: currentContainer.name }
      })];
    }
    
    // Build event data
    const params: Record<string, any> = {
      place: currentContainer.name,
      preposition
    };
    
    const events: SemanticEvent[] = [];
    
    // Create the EXITED event for world model updates
    const exitedData: ExitedEventData = {
      fromLocation: currentLocation,
      toLocation: parentLocation,
      preposition
    };
    
    events.push(context.event('if.event.exited', exitedData));
    
    // Create success message
    const messageId = preposition === 'off' ? 'exited_from' : 'exited';
    events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId: messageId,
        params: params
      }));
    
    return events;
  },
  
  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  }
};
