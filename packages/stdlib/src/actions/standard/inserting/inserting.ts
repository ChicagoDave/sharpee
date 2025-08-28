/**
 * Inserting action - insert objects specifically into containers
 * 
 * This action is container-specific, unlike putting which handles both
 * containers and supporters. It's more explicit about the container relationship.
 * In many cases, this delegates to the putting action with 'in' preposition.
 * 
 * MIGRATED: To three-phase pattern (validate/execute/report) for atomic events
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { buildEventData } from '../../data-builder-types';
import { insertedDataConfig } from './inserting-data';
import { puttingAction } from '../putting';
import { createActionContext } from '../../enhanced-context';
import { captureEntitySnapshot } from '../../base/snapshot-utils';
import { insert, IInsertResult } from './sub-actions/insert';

interface InsertingState {
  item: any;
  container: any;
  puttingValidation: ValidationResult;
}

export const insertingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.INSERTING,
  requiredMessages: [
    'no_target',
    'no_destination',
    'not_held',
    'not_insertable',
    'not_container',
    'already_there',
    'inserted',
    'wont_fit',
    'container_closed'
  ],
  group: 'object_manipulation',
  
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: true,
    directObjectScope: ScopeLevel.CARRIED,
    indirectObjectScope: ScopeLevel.REACHABLE
  },
  
  validate(context: ActionContext): ValidationResult {
    const item = context.command.directObject?.entity;
    const container = context.command.indirectObject?.entity;
    
    // Validate we have an item
    if (!item) {
      return {
        valid: false,
        error: 'no_target'
      };
    }
    
    // Validate we have a destination
    if (!container) {
      return {
        valid: false,
        error: 'no_destination',
        params: { item: item.name }
      };
    }
    
    // Create modified command with 'in' preposition for delegation to putting
    const modifiedCommand = {
      ...context.command,
      parsed: {
        ...context.command.parsed,
        structure: {
          ...context.command.parsed.structure,
          preposition: { 
            tokens: [], 
            text: 'in' 
          }
        },
        preposition: 'in'
      }
    };
    
    // Create a new context for the putting action with the modified command
    const modifiedContext = createActionContext(
      context.world,
      context.player,
      puttingAction,
      modifiedCommand
    );
    
    // Delegate validation to putting action
    const puttingValidation = puttingAction.validate(modifiedContext);
    
    if (!puttingValidation.valid) {
      return puttingValidation as ValidationResult;
    }
    
    return {
      valid: true
    };
  },
  
  execute(context: ActionContext): void {
    const item = context.command.directObject!.entity!;
    const container = context.command.indirectObject!.entity!;
    
    // Use sub-action to perform the actual state mutation
    const insertResult: IInsertResult = insert(item, container, context.world);
    (context as any)._insertResult = insertResult;
    
    // Also execute putting action for compatibility with existing event system
    const modifiedCommand = {
      ...context.command,
      parsed: {
        ...context.command.parsed,
        structure: {
          ...context.command.parsed.structure,
          preposition: { 
            tokens: [], 
            text: 'in' 
          }
        },
        preposition: 'in' // Add this for backward compatibility with tests
      }
    };
    
    // Create a new context for the putting action with the modified command
    const modifiedContext = createActionContext(
      context.world,
      context.player,
      puttingAction,
      modifiedCommand
    );
    
    // Store modified context for report phase
    (context as any)._modifiedContext = modifiedContext;
    
    // Execute putting action for event generation
    puttingAction.execute(modifiedContext);
  },

  /**
   * Report events after inserting
   * Delegates to putting action's report
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
          reason: validationResult.error || 'validation_failed',
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
    
    const modifiedContext = (context as any)._modifiedContext;
    
    if (!modifiedContext) {
      // Shouldn't happen, but handle gracefully
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'cant_insert',
        reason: 'cant_insert',
        params: {}
      })];
    }
    
    // Delegate to putting action's report
    if ('report' in puttingAction && typeof puttingAction.report === 'function') {
      return puttingAction.report(modifiedContext);
    }
    
    // Shouldn't happen since putting is migrated
    return [];
  }
};
