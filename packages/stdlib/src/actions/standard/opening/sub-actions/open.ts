/**
 * Open sub-action - handles the core opening logic
 * 
 * This is a thin wrapper around OpenableBehavior that focuses on
 * the essential state change (isOpen = true).
 */

import { Action, ActionContext, ValidationResult } from '../../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, OpenableBehavior, LockableBehavior, IOpenResult } from '@sharpee/world-model';
import { IFActions } from '../../../constants';
import { captureEntitySnapshot } from '../../../base/snapshot-utils';
import { buildEventData } from '../../../data-builder-types';
import { openedDataConfig } from '../opening-data';

export const openSubAction: Action = {
  id: `${IFActions.OPENING}.open`,
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
        error: 'not_openable',
        params: { item: noun.name }
      };
    }
    
    if (!OpenableBehavior.canOpen(noun)) {
      return { 
        valid: false, 
        error: 'already_open',
        params: { item: noun.name }
      };
    }
    
    if (noun.has(TraitType.LOCKABLE) && LockableBehavior.isLocked(noun)) {
      return { 
        valid: false, 
        error: 'locked',
        params: { item: noun.name }
      };
    }
    
    return { valid: true };
  },
  
  execute(context: ActionContext): void {
    const noun = context.command.directObject?.entity || (context.command as any).entity;
    const result: IOpenResult = OpenableBehavior.open(noun);
    (context as any)._openResult = result;
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
    const result = (context as any)._openResult as IOpenResult;
    
    if (!result.success) {
      if (result.wasOpen) {
        return [context.event('action.error', {
          actionId: context.action.id,
          messageId: 'already_open',
          reason: 'already_open',
          params: { item: noun.name }
        })];
      }
      
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'cannot_open',
        reason: 'cannot_open',
        params: { item: noun.name }
      })];
    }
    
    // Opening succeeded - generate events
    const events: ISemanticEvent[] = [];
    
    // Domain event
    events.push(context.event('opened', {
      targetId: noun.id,
      targetName: noun.name
    }));
    
    // Action event with full data
    const eventData = buildEventData(openedDataConfig, context);
    const isContainer = noun.has(TraitType.CONTAINER);
    const isDoor = noun.has(TraitType.DOOR);
    const isSupporter = noun.has(TraitType.SUPPORTER);
    const contents = isContainer ? context.world.getContents(noun.id) : [];
    
    const fullEventData = {
      ...eventData,
      containerId: noun.id,
      containerName: noun.name,
      isContainer,
      isDoor,
      isSupporter,
      hasContents: contents.length > 0,
      contentsCount: contents.length,
      contentsIds: contents.map(e => e.id),
      revealedItems: contents.length,
      item: noun.name
    };
    
    events.push(context.event('if.event.opened', fullEventData));
    
    // Success event
    let messageId = 'opened';
    let params: Record<string, any> = {
      item: noun.name
    };
    
    if (isContainer && contents.length === 0) {
      messageId = 'its_empty';
      params = {
        container: noun.name
      };
    }
    
    events.push(context.event('action.success', {
      actionId: context.action.id,
      messageId,
      params: params
    }));
    
    return events;
  }
};