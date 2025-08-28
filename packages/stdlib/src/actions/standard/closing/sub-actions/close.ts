/**
 * Close sub-action - handles the core closing logic
 * 
 * This is a thin wrapper around OpenableBehavior that focuses on
 * the essential state change (isOpen = false).
 */

import { Action, ActionContext, ValidationResult } from '../../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, OpenableBehavior, ICloseResult } from '@sharpee/world-model';
import { IFActions } from '../../../constants';
import { captureEntitySnapshot } from '../../../base/snapshot-utils';
import { buildEventData } from '../../../data-builder-types';
import { closedDataConfig } from '../closing-data';

export const closeSubAction: Action = {
  id: `${IFActions.CLOSING}.close`,
  requiredMessages: [],
  group: 'container_manipulation',
  
  validate(context: ActionContext): ValidationResult {
    // Handle both command.directObject.entity and command.entity patterns
    const noun = context.command.directObject?.entity || (context.command as any).entity;
    
    if (!noun) {
      return { 
        valid: false, 
        error: 'no_target'
      };
    }
    
    if (!noun.has(TraitType.OPENABLE)) {
      return { 
        valid: false, 
        error: 'not_closable',
        params: { item: noun.name }
      };
    }
    
    if (!OpenableBehavior.canClose(noun)) {
      if (!OpenableBehavior.isOpen(noun)) {
        return { 
          valid: false, 
          error: 'already_closed',
          params: { item: noun.name }
        };
      }
      return { 
        valid: false, 
        error: 'prevents_closing',
        params: { item: noun.name }
      };
    }
    
    return { valid: true };
  },
  
  execute(context: ActionContext): void {
    const noun = context.command.directObject?.entity || (context.command as any).entity;
    const result: ICloseResult = OpenableBehavior.close(noun);
    (context as any)._closeResult = result;
  },
  
  report(context: ActionContext, validationResult?: ValidationResult, executionError?: Error): ISemanticEvent[] {
    if (validationResult && !validationResult.valid) {
      const errorParams = { ...(validationResult.params || {}) };
      
      if (context.command.directObject?.entity) {
        errorParams.targetSnapshot = captureEntitySnapshot(
          context.command.directObject.entity,
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
    
    const noun = context.command.directObject?.entity || (context.command as any).entity;
    const result = (context as any)._closeResult as ICloseResult;
    
    if (!result.success) {
      if (result.wasClosed) {
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
      
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'cannot_close',
        reason: 'cannot_close',
        params: { item: noun.name }
      })];
    }
    
    // Closing succeeded
    const events: ISemanticEvent[] = [];
    
    // Domain event
    events.push(context.event('closed', {
      targetId: noun.id,
      targetName: noun.name
    }));
    
    // Action event with full data
    const eventData = buildEventData(closedDataConfig, context);
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
      targetName: noun.name,
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
    
    // Success event
    events.push(context.event('action.success', {
      actionId: context.action.id,
      messageId: 'closed',
      params: { item: noun.name }
    }));
    
    return events;
  }
};