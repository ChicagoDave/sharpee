/**
 * Closing action - closes containers and doors
 * 
 * This action properly delegates to OpenableBehavior for validation
 * and execution. It follows the validate/execute pattern.
 * 
 * MIGRATED: To three-phase pattern (validate/execute/report) for atomic events
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, OpenableBehavior, ICloseResult } from '@sharpee/world-model';
import { captureEntitySnapshot } from '../../base/snapshot-utils';
import { buildEventData } from '../../data-builder-types';
import { IFActions } from '../../constants';
import { closedDataConfig } from './closing-data';

// Import our payload types
import { ClosedEventData } from './closing-event-data';
import { PreventsClosingErrorData } from './closing-error-prevents-closing';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';

export const closingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.CLOSING,
  requiredMessages: [
    'no_target',
    'not_closable', 
    'already_closed',
    'closed',
    'cant_reach',
    'prevents_closing'
  ],
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  },
  group: 'container_manipulation',
  
  /**
   * Validate whether the close action can be executed
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
    
    // Check if it's openable (things that can open can also close)
    if (!noun.has(TraitType.OPENABLE)) {
      return { 
        valid: false, 
        error: 'not_closable',
        params: { item: noun.name }
      };
    }
    
    // Use behavior's canClose method for validation
    if (!OpenableBehavior.canClose(noun)) {
      // Check if it's because it's already closed
      if (!OpenableBehavior.isOpen(noun)) {
        return { 
          valid: false, 
          error: 'already_closed',
          params: { item: noun.name }
        };
      }
      // Otherwise it can't be closed for some other reason
      return { 
        valid: false, 
        error: 'prevents_closing',
        params: { item: noun.name }
      };
    }
    
    // Check if closable has special requirements
    const openableTrait = noun.get(TraitType.OPENABLE);
    if ((openableTrait as any).closeRequirements) {
      const requirement = (openableTrait as any).closeRequirements;
      if (requirement.preventedBy) {
        return { 
          valid: false, 
          error: 'prevents_closing',
          params: { 
            item: noun.name,
            obstacle: requirement.preventedBy
          }
        };
      }
    }
    
    return { valid: true };
  },
  
  /**
   * Execute the close action
   * Assumes validation has already passed - no validation logic here
   * Delegates to OpenableBehavior for actual state changes
   */
  execute(context: ActionContext): void {
    const noun = context.command.directObject!.entity!;
    
    // Delegate to behavior for closing
    const result: ICloseResult = OpenableBehavior.close(noun);
    
    // Store result for report phase
    (context as any)._closeResult = result;
  },

  /**
   * Report events after closing
   * Generates events with complete state snapshots
   */
  report(context: ActionContext, validationResult?: ValidationResult, executionError?: Error): ISemanticEvent[] {
    // Handle validation errors
    if (validationResult && !validationResult.valid) {
      // Capture entity data for validation errors
      const errorParams = { ...(validationResult.params || {}) };
      
      // Add entity snapshots if entities are available
      if (context.command.directObject?.entity) {
        errorParams.targetSnapshot = captureEntitySnapshot(
          context.command.directObject.entity,
          context.world,
          false
        );
      }
      if (context.command.indirectObject?.entity) {
        errorParams.indirectTargetSnapshot = captureEntitySnapshot(
          context.command.indirectObject.entity,
          context.world,
          false
        );
      }

      return [
        context.event('action.error', {
          actionId: context.action.id,
          error: validationResult.error || 'validation_failed',
          messageId: validationResult.messageId || validationResult.error || 'action_failed',
          params: errorParams
        })
      ];
    }
    
    // Handle execution errors
    if (executionError) {
      return [
        context.event('action.error', {
          actionId: context.action.id,
          error: 'execution_failed',
          messageId: 'action_failed',
          params: {
            error: executionError.message
          }
        })
      ];
    }
    
    const noun = context.command.directObject!.entity!;
    const result = (context as any)._closeResult as ICloseResult;
    
    // Check if the behavior reported failure (shouldn't happen after validation)
    if (!result.success) {
      if (result.alreadyClosed) {
        return [context.event('action.error', {
          actionId: context.action.id,
          messageId: 'already_closed',
          reason: 'already_closed',
          params: { item: noun.name }
        })];
      }
      
      if (result.cantClose) {
        return [context.event('action.error', {
          actionId: context.action.id,
          messageId: 'cant_close',
          reason: 'cant_close',
          params: { item: noun.name }
        })];
      }
      
      // Generic failure
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'cannot_close',
        reason: 'cannot_close',
        params: { item: noun.name }
      })];
    }
    
    // Closing succeeded
    const events: ISemanticEvent[] = [];
    
    // Add the domain event (closed)
    events.push(context.event('closed', {
      targetId: noun.id,
      targetName: noun.name,
      customMessage: result.closeMessage,
      sound: result.closeSound
    }));
    
    // Add the action event (if.event.closed) - using data builder
    const eventData = buildEventData(closedDataConfig, context);
    
    // Add additional fields for backward compatibility
    const isContainer = noun.has(TraitType.CONTAINER);
    const isDoor = noun.has(TraitType.DOOR);
    const isSupporter = noun.has(TraitType.SUPPORTER);
    
    let hasContents = false;
    let contentsCount = 0;
    let contentsIds: string[] = [];
    
    if (isContainer) {
      const contents = context.world.getContents(noun.id);
      hasContents = contents.length > 0;
      contentsCount = contents.length;
      contentsIds = contents.map(item => item.id);
    }
    
    const fullEventData = {
      ...eventData,
      containerId: noun.id,
      containerName: noun.name,
      isContainer,
      isDoor,
      isSupporter,
      hasContents,
      contentsCount,
      contentsIds,
      item: noun.name
    };
    
    events.push(context.event('if.event.closed', fullEventData));
    
    // Add success event
    events.push(context.event('action.success', {
      actionId: context.action.id,
      messageId: 'closed',
      params: { item: noun.name }
    }));
    
    return events;
  }
};
