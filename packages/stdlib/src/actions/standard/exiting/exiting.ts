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
import { exit } from './sub-actions/exit';

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
    // Rooms are containers but not exitable
    const isRoom = currentContainer.has(TraitType.ROOM);
    const isExitable = !isRoom && (
      currentContainer.has(TraitType.CONTAINER) || 
      currentContainer.has(TraitType.SUPPORTER) ||
      currentContainer.has(TraitType.ENTRY)
    );
    
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
    const actor = context.player;
    
    // Check validation first
    const validation = this.validate(context);
    if (!validation.valid) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: validation.error!,
        reason: validation.error!,
        params: validation.params
      })];
    }
    
    // Use sub-action for core logic
    const result = exit(actor, context.world);
    
    if (!result.success) {
      // This shouldn't happen if validation passed, but handle it gracefully
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'nowhere_to_go',
        reason: 'nowhere_to_go'
      })];
    }
    
    const currentContainer = context.world.getEntity(result.fromLocation!);
    if (!currentContainer) {
      return [];
    }
    
    const events: ISemanticEvent[] = [];
    
    // Use EntryBehavior for ENTRY trait entities to get proper events
    if (currentContainer.has(TraitType.ENTRY)) {
      // EntryBehavior.exit generates proper events
      // But we've already handled the state change in our sub-action
      // So just create our own events for consistency
      const exitedData: ExitedEventData = {
        fromLocation: result.fromLocation!,
        toLocation: result.toLocation!,
        preposition: result.preposition
      };
      
      events.push(context.event('if.event.exited', exitedData));
      
      // Add success message
      events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId: 'exited',
        params: { 
          place: currentContainer.name,
          preposition: result.preposition
        }
      }));
    } else {
      // For non-ENTRY containers/supporters
      const exitedData: ExitedEventData = {
        fromLocation: result.fromLocation!,
        toLocation: result.toLocation!,
        preposition: result.preposition
      };
      
      events.push(context.event('if.event.exited', exitedData));
      
      // Add success message
      events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId: 'exited',
        params: { 
          place: currentContainer.name,
          preposition: result.preposition
        }
      }));
    }
    
    return events;
  },
  
  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  }
};