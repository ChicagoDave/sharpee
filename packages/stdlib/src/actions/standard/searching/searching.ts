/**
 * Searching action - search objects or locations for hidden items
 * 
 * This action allows players to search containers, supporters, or locations
 * to find concealed items or discover additional details.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { 
  TraitType,
  OpenableBehavior
} from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { SearchedEventData } from './searching-events';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';
import {
  analyzeSearchTarget,
  revealConcealedItems,
  determineSearchMessage,
  buildSearchEventData
} from '../searching-helpers';

export const searchingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.SEARCHING,
  requiredMessages: [
    'not_visible',
    'not_reachable',
    'container_closed',
    'nothing_special',
    'found_items',
    'empty_container',
    'container_contents',
    'supporter_contents',
    'searched_location',
    'searched_object',
    'found_concealed'
  ],
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  },
  
  validate(context: ActionContext): ValidationResult {
    const target = context.command.directObject?.entity;
    
    // If no target, we'll search the current location (always valid)
    if (!target) {
      return { valid: true };
    }
    
    // Check if it's a container that needs to be open
    if (target.has(TraitType.CONTAINER) && target.has(TraitType.OPENABLE)) {
      if (!OpenableBehavior.isOpen(target)) {
        return { 
          valid: false, 
          error: 'container_closed',
          params: { target: target.name }
        };
      }
    }
    
    return { valid: true };
  },
  
  execute(context: ActionContext): ISemanticEvent[] {
    const target = context.command.directObject?.entity;
    
    // Analyze what we're searching
    const searchContext = analyzeSearchTarget(context, target);
    
    // Reveal any concealed items found
    if (searchContext.concealedItems.length > 0) {
      revealConcealedItems(searchContext.concealedItems);
    }
    
    // Build event data
    const eventData = buildSearchEventData(searchContext) as SearchedEventData;
    
    // Create SEARCHED event for world model
    const events: ISemanticEvent[] = [];
    events.push(context.event('if.event.searched', eventData));
    
    // Determine and add success message
    const { messageId, params } = determineSearchMessage(searchContext);
    events.push(context.event('action.success', {
      actionId: context.action.id,
      messageId,
      params
    }));
    
    return events;
  },
  
  group: "sensory"
};
