/**
 * Opening action - opens containers and doors
 *
 * This action properly delegates to OpenableBehavior and LockableBehavior
 * for validation and execution. It follows the validate/execute pattern.
 *
 * Uses four-phase pattern:
 * 1. validate: Check target exists and can be opened
 * 2. execute: Delegate to OpenableBehavior for state changes
 * 3. report: Generate success events with opened/revealed data
 * 4. blocked: Generate error events when validation fails
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent, EntityId } from '@sharpee/core';
import { TraitType, OpenableBehavior, LockableBehavior, IOpenResult } from '@sharpee/world-model';
import { buildEventData } from '../../data-builder-types';
import { IFActions } from '../../constants';
import { OpenedEventData, ExitRevealedEventData } from './opening-events';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';
import { OpeningSharedData } from './opening-types';
import { OpeningMessages } from './opening-messages';

// Import our data builder
import { openedDataConfig } from './opening-data';

export const openingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.OPENING,

  // Default scope requirements for this action's slots
  defaultScope: {
    target: ScopeLevel.REACHABLE
  },

  // ADR-104: Implicit inference requirements
  targetRequirements: {
    trait: TraitType.OPENABLE,
    condition: 'not_open',
    description: 'openable'
  },

  // Opening doesn't require holding the target
  requiresHolding: false,

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
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  },
  group: 'container_manipulation',
  
  validate(context: ActionContext): ValidationResult {
    const noun = context.command.directObject?.entity;

    // Validate we have a target
    if (!noun) {
      return { valid: false, error: OpeningMessages.NO_TARGET };
    }

    // Check scope - must be able to reach the target
    const scopeCheck = context.requireScope(noun, ScopeLevel.REACHABLE);
    if (!scopeCheck.ok) {
      return scopeCheck.error!;
    }

    // Check if it's openable
    if (!noun.has(TraitType.OPENABLE)) {
      return {
        valid: false,
        error: OpeningMessages.NOT_OPENABLE,
        params: { item: noun.name }
      };
    }

    // Use behavior's canOpen method for validation
    if (!OpenableBehavior.canOpen(noun)) {
      return {
        valid: false,
        error: OpeningMessages.ALREADY_OPEN,
        params: { item: noun.name }
      };
    }

    // Check lock status using behavior
    if (noun.has(TraitType.LOCKABLE) && LockableBehavior.isLocked(noun)) {
      return {
        valid: false,
        error: OpeningMessages.LOCKED,
        params: { item: noun.name }
      };
    }

    return { valid: true };
  },
  
  /**
   * Execute the open action
   * Assumes validation has already passed - no validation logic here
   * Delegates to OpenableBehavior for actual state changes
   */
  execute(context: ActionContext): void {
    // Assume validation has passed - no checks needed
    const noun = context.command.directObject!.entity!; // Safe because validate ensures it exists
    
    // Delegate to behavior for opening
    const result: IOpenResult = OpenableBehavior.open(noun);
    
    // Store result for report phase using typed shared data
    const sharedData: OpeningSharedData = {
      openResult: result
    };
    context.sharedData.openResult = result;
  },

  report(context: ActionContext): ISemanticEvent[] {
    // report() is only called on success - validation passed
    const noun = context.command.directObject!.entity!;
    const result = context.sharedData.openResult as IOpenResult;
    const events: ISemanticEvent[] = [];

    // 1. The atomic opened event - just the fact of opening
    const openedData: OpenedEventData = {
      targetId: noun.id,
      targetName: noun.name
    };
    events.push(context.event('if.event.opened', openedData));

    // 2. Domain event for backward compatibility (simplified)
    events.push(context.event('opened', {
      targetId: noun.id,
      targetName: noun.name
    }));

    // Note: if.event.revealed is emitted by the opened event handler in stdlib
    // This ensures revealed events fire regardless of what action opened the container

    // 3. Success event with appropriate message
    const isContainer = noun.has(TraitType.CONTAINER);
    const contents = isContainer ? context.world.getContents(noun.id) : [];

    let messageId: string = OpeningMessages.OPENED;
    let params: Record<string, any> = { item: noun.name };

    // Special message for empty containers
    if (isContainer && contents.length === 0) {
      messageId = OpeningMessages.ITS_EMPTY;
      params = { container: noun.name };
    }

    events.push(context.event('action.success', {
      actionId: context.action.id,
      messageId,
      params
    }));

    return events;
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    // blocked() is called when validation fails
    const noun = context.command.directObject?.entity;

    return [context.event('action.blocked', {
      actionId: context.action.id,
      messageId: result.error,
      params: {
        ...result.params,
        item: noun?.name
      }
    })];
  }
};
