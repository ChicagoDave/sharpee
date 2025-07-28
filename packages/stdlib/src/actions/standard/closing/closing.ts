/**
 * Closing action - closes containers and doors
 * 
 * This action validates conditions for closing something and returns
 * appropriate events. It NEVER mutates state directly.
 * 
 * UPDATED: Uses new simplified context.event() method (ADR-041)
 */

import { Action, EnhancedActionContext } from '../../enhanced-types';
import { SemanticEvent } from '@sharpee/core';
import { TraitType } from '@sharpee/world-model';
import { IFActions } from '../../constants';

// Import our payload types
import { ClosedEventData } from './closing-event-data';
import { PreventsClosingErrorData } from './closing-error-prevents-closing';

export const closingAction: Action = {
  id: IFActions.CLOSING,
  requiredMessages: [
    'no_target',
    'not_closable', 
    'already_closed',
    'closed',
    'cant_reach',
    'prevents_closing'
  ],
  group: 'container_manipulation',
  
  execute(context: EnhancedActionContext): SemanticEvent[] {
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
    
    // Check if it's openable (things that can open can also close)
    if (!noun.has(TraitType.OPENABLE)) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'not_closable',
        reason: 'not_closable',
        params: { item: noun.name }
      })];
    }
    
    const openableTrait = noun.get(TraitType.OPENABLE);
    
    // Check if already closed
    if (openableTrait && !(openableTrait as any).isOpen) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'already_closed',
        reason: 'already_closed',
        params: { item: noun.name }
      })];
    }
    
    // Check if closable has special requirements
    if ((openableTrait as any).closeRequirements) {
      const requirement = (openableTrait as any).closeRequirements;
      if (requirement.preventedBy) {
        // This error has additional structured data
        const errorData: PreventsClosingErrorData = {
          obstacle: requirement.preventedBy
        };
        
        return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'prevents_closing',
        reason: 'prevents_closing',
        params: { 
            item: noun.name,
            obstacle: requirement.preventedBy 
          },
        ...errorData // Spread the additional error data
      })];
      }
    }
    
    // Gather information about what we're closing
    const isContainer = noun.has(TraitType.CONTAINER);
    const isDoor = noun.has(TraitType.DOOR);
    const isSupporter = noun.has(TraitType.SUPPORTER);
    const contents = isContainer ? context.world.getContents(noun.id) : [];
    
    // Build the event payload
    const closedData: ClosedEventData = {
      targetId: noun.id,
      targetName: noun.name,
      isContainer,
      isDoor,
      isSupporter,
      hasContents: contents.length > 0,
      contentsCount: contents.length,
      contentsIds: contents.map(e => e.id)
    };
    
    // Return both the domain event and success message
    return [
      context.event('if.event.closed', closedData),
      context.event('action.success', {
        actionId: context.action.id,
        messageId: 'closed',
        params: { item: noun.name }
      })
    ];
  }
};
