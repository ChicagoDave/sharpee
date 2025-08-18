/**
 * Exiting action - exit from containers, supporters, or other enterable objects
 * 
 * This action handles exiting objects that the actor is currently inside/on.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { 
  TraitType, 
  EntryTrait,
  OpenableBehavior,
  EntryBehavior
} from '@sharpee/world-model';
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
  
  validate(context: ActionContext): ValidationResult {
    const actor = context.player;
    const currentLocation = context.world.getLocation(actor.id);
    
    if (!currentLocation) {
      return { 
        valid: false, 
        error: 'nowhere_to_go'
      };
    }
    
    const currentContainer = context.world.getEntity(currentLocation);
    if (!currentContainer) {
      return { 
        valid: false, 
        error: 'nowhere_to_go'
      };
    }
    
    // Check if we're in something we can exit from
    const isExitable = currentContainer.has(TraitType.CONTAINER) || 
                      currentContainer.has(TraitType.SUPPORTER) ||
                      currentContainer.has(TraitType.ENTRY);
    
    if (!isExitable) {
      return { 
        valid: false, 
        error: 'already_outside'
      };
    }
    
    // Find the parent location (where we'll exit to)
    const parentLocation = context.world.getLocation(currentLocation);
    if (!parentLocation) {
      return { 
        valid: false, 
        error: 'nowhere_to_go'
      };
    }
    
    // Check if the current location allows exiting
    if (currentContainer.has(TraitType.ENTRY)) {
      const entryTrait = currentContainer.get(TraitType.ENTRY) as EntryTrait;
      if (!entryTrait.canEnter) { // If you can't enter, you can't exit
        return { 
          valid: false, 
          error: 'cant_exit',
          params: { place: currentContainer.name }
        };
      }
    }
    
    // Check if container needs to be open to exit using behavior
    if (currentContainer.has(TraitType.CONTAINER) && currentContainer.has(TraitType.OPENABLE)) {
      if (!OpenableBehavior.isOpen(currentContainer)) {
        return { 
          valid: false, 
          error: 'container_closed',
          params: { container: currentContainer.name }
        };
      }
    }
    
    return { valid: true };
  },
  
  execute(context: ActionContext): ISemanticEvent[] {
    // Validate first
    const validation = this.validate(context);
    if (!validation.valid) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: validation.error,
        reason: validation.error,
        params: validation.params || {}
      })];
    }
    
    const actor = context.player;
    const currentLocation = context.world.getLocation(actor.id)!;
    const currentContainer = context.world.getEntity(currentLocation)!;
    const parentLocation = context.world.getLocation(currentLocation)!;
    
    let preposition = 'from';
    
    // Determine preposition based on container type
    if (currentContainer.has(TraitType.CONTAINER)) {
      preposition = 'out of';
    } else if (currentContainer.has(TraitType.SUPPORTER)) {
      preposition = 'off';
    }
    
    if (currentContainer.has(TraitType.ENTRY)) {
      const entryTrait = currentContainer.get(TraitType.ENTRY) as EntryTrait;
      // Update occupants list using behavior if tracked
      if (EntryBehavior.contains(currentContainer, actor.id)) {
        // Note: EntryBehavior.exit() returns events but we generate our own
        // So we manually update the occupants
        const index = entryTrait.occupants?.indexOf(actor.id);
        if (index !== undefined && index >= 0) {
          entryTrait.occupants!.splice(index, 1);
        }
      }
      
      // Entry trait can override preposition
      const entryPrep = entryTrait.preposition || 'in';
      // Convert preposition for exiting
      if (entryPrep === 'in') preposition = 'out of';
      else if (entryPrep === 'on') preposition = 'off';
      else if (entryPrep === 'under') preposition = 'from under';
      else if (entryPrep === 'behind') preposition = 'from behind';
    }
    
    // Build event data
    const params: Record<string, any> = {
      place: currentContainer.name,
      preposition
    };
    
    const events: ISemanticEvent[] = [];
    
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
