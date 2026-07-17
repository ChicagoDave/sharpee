/**
 * Searching action - search objects or locations for hidden items
 *
 * This action allows players to search containers, supporters, or locations
 * to find concealed items or discover additional details.
 *
 * Uses four-phase pattern:
 * 1. validate: Check target is searchable (container open if applicable)
 * 2. execute: Analyze contents, reveal concealed items (mutation)
 * 3. blocked: Generate events when validation fails
 * 4. report: Generate success events
 *
 * Interceptor consultation (ADR-118) runs through the shared lifecycle
 * engine (ADR-228) via `searchingLifecycle` — no hand-rolled hook plumbing.
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
import { nounPhraseFor } from '../../../utils';
import {
  analyzeSearchTarget,
  revealConcealedItems,
  determineSearchMessage,
  buildSearchEventData
} from '../searching-helpers';
import {
  ActionLifecycleDescriptor,
  resolveLifecycle,
  getLifecycleState,
  runPreValidate,
  runPostValidate,
  runPostExecute,
  runPostReport,
  runOnBlocked,
  blockedMessageId
} from '../../lifecycle';

/**
 * Interceptor surface (ADR-228): the searched target is the only
 * consultable entity of a SEARCH command (a bare SEARCH of the current
 * location has no consultable slot).
 */
export const searchingLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.SEARCHING,
  slots: [
    {
      id: 'target',
      actionIds: [IFActions.SEARCHING],
      resolve: (ctx) => ctx.command.directObject?.entity
    }
  ]
};

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

  // Default scope requirements for this action's slots
  defaultScope: {
    target: ScopeLevel.REACHABLE
  },

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

    const state = resolveLifecycle(context, searchingLifecycle);
    const preVeto = runPreValidate(context, state);
    if (preVeto) return preVeto;

    // If no target, we'll search the current location (always valid).
    // The container-open check only applies to a targeted search.
    if (target && target.has(TraitType.CONTAINER) && target.has(TraitType.OPENABLE)) {
      if (!OpenableBehavior.isOpen(target)) {
        return {
          valid: false,
          error: 'container_closed',
          params: { target: nounPhraseFor(target) }
        };
      }
    }

    // Canonical placement (ADR-228): postValidate runs after ALL standard validation
    const postVeto = runPostValidate(context, state);
    if (postVeto) return postVeto;

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

    const state = getLifecycleState(context);
    if (state) runPostExecute(context, state);
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const target = context.command.directObject?.entity;
    const events: ISemanticEvent[] = [context.event('if.event.searched', {
      blocked: true,
      messageId: blockedMessageId(context, result),
      // params carry EntityInfo for the formatter chain (ADR-158)
      params: { target: target ? nounPhraseFor(target) : undefined, ...result.params },
      reason: result.error,
      targetId: target?.id,
      targetName: target?.name
    })];

    if (result.error) {
      const state = getLifecycleState(context);
      if (state) runOnBlocked(context, state, events, 'if.event.searched', result.error);
    }

    return events;
  },

  report(context: ActionContext): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];
    const sharedData = getSearchingSharedData(context);

    // Emit searched event with messageId for text rendering
    events.push(context.event('if.event.searched', {
      messageId: `${context.action.id}.${sharedData.messageId || 'nothing_special'}`,
      params: sharedData.params || {},
      ...sharedData.eventData
    }));

    const state = getLifecycleState(context);
    if (state) runPostReport(context, state, events, 'if.event.searched');

    return events;
  },

  group: "sensory"
};
