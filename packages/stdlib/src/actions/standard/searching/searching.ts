/**
 * Searching action - search objects or locations for hidden items
 *
 * This action allows players to search containers, supporters, or locations
 * to find concealed items or discover additional details.
 *
 * Uses three-phase pattern:
 * 1. validate: Check target is searchable (container open if applicable)
 * 2. execute: Analyze contents, reveal concealed items (mutation)
 * 3. report: Emit searched event and success message
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
import { handleReportErrors } from '../../base/report-helpers';

/**
 * Shared data passed between execute and report phases
 */
interface SearchingSharedData {
  eventData?: SearchedEventData;
  messageId?: string;
  params?: Record<string, any>;
}

function getSearchingSharedData(context: ActionContext): SearchingSharedData {
  return context.sharedData as SearchingSharedData;
}

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
  
  execute(context: ActionContext): void {
    const target = context.command.directObject?.entity;
    const sharedData = getSearchingSharedData(context);

    // Analyze what we're searching
    const searchContext = analyzeSearchTarget(context, target);

    // Reveal any concealed items found (world mutation)
    if (searchContext.concealedItems.length > 0) {
      revealConcealedItems(searchContext.concealedItems);
    }

    // Build event data and message
    const eventData = buildSearchEventData(searchContext) as SearchedEventData;
    const { messageId, params } = determineSearchMessage(searchContext);

    // Store in sharedData for report phase
    sharedData.eventData = eventData;
    sharedData.messageId = messageId;
    sharedData.params = params;
  },

  report(context: ActionContext, validationResult?: ValidationResult, executionError?: Error): ISemanticEvent[] {
    const errorEvents = handleReportErrors(context, validationResult, executionError);
    if (errorEvents) return errorEvents;

    const events: ISemanticEvent[] = [];
    const sharedData = getSearchingSharedData(context);

    // Emit searched event for world model
    if (sharedData.eventData) {
      events.push(context.event('if.event.searched', sharedData.eventData));
    }

    // Emit success message
    events.push(context.event('action.success', {
      actionId: context.action.id,
      messageId: sharedData.messageId || 'nothing_special',
      params: sharedData.params || {}
    }));

    return events;
  },

  group: "sensory"
};
