/**
 * Opening action - opens containers and doors
 * 
 * This action validates conditions for opening something and returns
 * appropriate events. It NEVER mutates state directly.
 */

import { Action, EnhancedActionContext } from '../enhanced-types';
import { SemanticEvent } from '@sharpee/core';
import { TraitType } from '@sharpee/world-model';
import { IFActions } from '../constants';

export const openingAction: Action = {
  id: IFActions.OPENING,
  requiredMessages: [
    'no_target',
    'not_openable',
    'already_open',
    'locked',
    'opened',
    'revealing',
    'its_empty',
    'cant_reach'
  ],
  group: 'container_manipulation',
  
  execute(context: EnhancedActionContext): SemanticEvent[] {
    const actor = context.player;
    const noun = context.command.directObject?.entity;
    
    // Validate we have a target
    if (!noun) {
      return context.emitError('no_target');
    }
    
    // Visibility and reachability are already validated by the command processor
    
    // Check if it's openable
    if (!noun.has(TraitType.OPENABLE)) {
      return context.emitError('not_openable', { item: noun.name });
    }
    
    const openableTrait = noun.get(TraitType.OPENABLE);
    
    // Check if already open
    if (openableTrait && (openableTrait as any).isOpen) {
      return context.emitError('already_open', { item: noun.name });
    }
    
    // Check if locked
    if (noun.has(TraitType.LOCKABLE)) {
      const lockableTrait = noun.get(TraitType.LOCKABLE);
      if (lockableTrait && (lockableTrait as any).isLocked) {
        return context.emitError('locked', { item: noun.name });
      }
    }
    
    // Build event data
    const eventData: Record<string, unknown> = {
      item: noun.name
    };
    
    // Determine success message based on what was revealed
    let messageId = 'opened';
    
    if (noun.has(TraitType.CONTAINER)) {
      eventData.isContainer = true;
      const contents = context.world.getContents(noun.id);
      eventData.hasContents = contents.length > 0;
      eventData.revealedItems = contents.length;
      
      if (contents.length > 0) {
        messageId = 'revealing';
        eventData.container = noun.name;
        eventData.items = contents.map(e => e.name);
      } else {
        messageId = 'its_empty';
        eventData.container = noun.name;
      }
    }
    
    if (noun.has(TraitType.DOOR)) {
      eventData.isDoor = true;
    }
    
    const events: SemanticEvent[] = [];
    
    // Create the OPENED event for world model updates
    events.push(context.emit('if.event.opened', eventData));
    
    // Create the success message
    events.push(...context.emitSuccess(messageId, eventData));
    
    return events;
  }
};