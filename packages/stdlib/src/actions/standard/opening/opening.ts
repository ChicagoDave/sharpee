/**
 * Opening action - opens containers and doors
 * 
 * This action properly delegates to OpenableBehavior and LockableBehavior
 * for validation and execution. It follows the validate/execute pattern.
 * 
 * MIGRATED: To three-phase pattern (validate/execute/report) for atomic events
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent, EntityId } from '@sharpee/core';
import { TraitType, OpenableBehavior, LockableBehavior, IOpenResult } from '@sharpee/world-model';
import { buildEventData } from '../../data-builder-types';
import { handleReportErrors } from '../../base/report-helpers';
import { IFActions } from '../../constants';
import { OpenedEventData, RevealedEventData, ExitRevealedEventData } from './opening-events';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';
import { OpeningSharedData } from './opening-types';

// Import our data builder
import { openedDataConfig } from './opening-data';

export const openingAction: Action & { metadata: ActionMetadata } = {
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
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  },
  group: 'container_manipulation',
  
  /**
   * Validate whether the open action can be executed
   * Uses behavior validation methods to check preconditions
   */
  validate(context: ActionContext): ValidationResult {
    const noun = context.command.directObject?.entity;
    
    // Validate we have a target
    if (!noun) {
      return { 
        valid: false, 
        error: 'no_target'
      };
    }
    
    // Check if it's openable
    if (!noun.has(TraitType.OPENABLE)) {
      return { 
        valid: false, 
        error: 'not_openable',
        params: { item: noun.name }
      };
    }
    
    // Use behavior's canOpen method for validation
    if (!OpenableBehavior.canOpen(noun)) {
      return { 
        valid: false, 
        error: 'already_open',
        params: { item: noun.name }
      };
    }
    
    // Check lock status using behavior
    if (noun.has(TraitType.LOCKABLE) && LockableBehavior.isLocked(noun)) {
      return { 
        valid: false, 
        error: 'locked',
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

  /**
   * Report events after opening
   * Generates atomic events - one discrete fact per event
   */
  report(context: ActionContext, validationResult?: ValidationResult, executionError?: Error): ISemanticEvent[] {
    // Handle validation and execution errors using shared helper
    const errorEvents = handleReportErrors(context, validationResult, executionError);
    if (errorEvents) return errorEvents;

    const noun = context.command.directObject!.entity!;
    const result = context.sharedData.openResult as IOpenResult;
    
    // Check if the behavior reported failure
    if (!result.success) {
      if (result.alreadyOpen) {
        return [context.event('action.error', {
          actionId: context.action.id,
          messageId: 'already_open',
          reason: 'already_open',
          params: { item: noun.name }
        })];
      }
      // Shouldn't happen if validate() was called, but handle it
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'cannot_open',
        reason: 'cannot_open',
        params: { item: noun.name }
      })];
    }
    
    // Build atomic events
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
    
    // 3. Revealed events - one per item if this is a container
    if (noun.has(TraitType.CONTAINER)) {
      const contents = context.world.getContents(noun.id);
      for (const item of contents) {
        const revealedData: RevealedEventData = {
          itemId: item.id,
          itemName: item.name,
          containerId: noun.id,
          containerName: noun.name
        };
        events.push(context.event('if.event.revealed', revealedData));
      }
    }
    
    // 4. Exit revealed event if this is a door
    // Note: This is simplified for now. A full implementation would need to:
    // - Access the room's trait to get exit information
    // - Check which exits use this door
    // - Emit exit_revealed for each direction unblocked
    // For now, we'll let story handlers deal with door-specific logic
    
    // 5. Success event with appropriate message
    const isContainer = noun.has(TraitType.CONTAINER);
    const contents = isContainer ? context.world.getContents(noun.id) : [];
    
    let messageId = 'opened';
    let params: Record<string, any> = {
      item: noun.name
    };
    
    // Special message for empty containers
    if (isContainer && contents.length === 0) {
      messageId = 'its_empty';
      params = {
        container: noun.name
      };
    }
    
    events.push(context.event('action.success', {
      actionId: context.action.id,
      messageId,
      params
    }));
    
    return events;
  }
};
