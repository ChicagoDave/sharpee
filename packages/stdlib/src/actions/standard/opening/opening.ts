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
import { captureEntitySnapshot } from '../../base/snapshot-utils';
import { IFActions } from '../../constants';
import { OpenedEventData } from './opening-events';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';

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
    
    // Store result for report phase
    (context as any)._openResult = result;
  },

  /**
   * Report events after opening
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
    
    const actor = context.player;
    const noun = context.command.directObject!.entity!;
    const result = (context as any)._openResult as IOpenResult;
    
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
    
    // Opening succeeded - gather information for events
    const isContainer = noun.has(TraitType.CONTAINER);
    const isDoor = noun.has(TraitType.DOOR);
    const isSupporter = noun.has(TraitType.SUPPORTER);
    const contents = isContainer ? context.world.getContents(noun.id) : [];
    
    // Build the opened event data with atomic snapshots
    const eventData: OpenedEventData = {
      targetId: noun.id,
      targetName: noun.name,
      containerId: noun.id,
      containerName: noun.name,
      isContainer,
      isDoor,
      isSupporter,
      hasContents: contents.length > 0,
      contentsCount: contents.length,
      contentsIds: contents.map(e => e.id),
      revealedItems: contents.length,
      // Add atomic event snapshots
      targetSnapshot: captureEntitySnapshot(noun, context.world, true),
      contentsSnapshots: contents.map(e => captureEntitySnapshot(e, context.world, true)),
      // Add 'item' for backward compatibility with tests
      item: noun.name
    } as OpenedEventData & { item: string; targetSnapshot?: any; contentsSnapshots?: any[] };
    
    // Determine success message based on what was revealed
    let messageId = 'opened';
    let params: Record<string, any> = {
      item: noun.name
    };
    
    // Special handling for empty containers
    if (isContainer && contents.length === 0) {
      messageId = 'its_empty';
      params = {
        container: noun.name
      };
    }
    
    // Build and return all events
    const events: ISemanticEvent[] = [];
    
    // Add the domain event (opened)
    events.push(context.event('opened', {
      targetId: noun.id,
      targetName: noun.name,
      customMessage: result.openMessage,
      sound: result.openSound,
      revealsContents: result.revealsContents
    }));
    
    // Add the action event (if.event.opened)
    events.push(context.event('if.event.opened', eventData));
    
    // Add success event
    events.push(context.event('action.success', {
      actionId: context.action.id,
      messageId,
      params: params
    }));
    
    return events;
  }
};
