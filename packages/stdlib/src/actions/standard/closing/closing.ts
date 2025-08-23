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
import { IFActions } from '../../constants';

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
  report(context: ActionContext): ISemanticEvent[] {
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
    
    // Add the action event (if.event.closed) - following same pattern as opening
    // Check for contents if it's a container
    let hasContents = false;
    let contentsCount = 0;
    let contentsIds: string[] = [];
    let contentsSnapshots: any[] = [];
    
    if (noun.has(TraitType.CONTAINER)) {
      const contents = context.world.getContents(noun.id);
      hasContents = contents.length > 0;
      contentsCount = contents.length;
      contentsIds = contents.map(item => item.id);
      contentsSnapshots = contents.map(e => captureEntitySnapshot(e, context.world, true));
    }
    
    const eventData: ClosedEventData = {
      targetId: noun.id,
      targetName: noun.name,
      containerId: noun.id, // Same entity for compatibility
      containerName: noun.name,
      isContainer: noun.has(TraitType.CONTAINER),
      isDoor: noun.has(TraitType.DOOR),
      isSupporter: noun.has(TraitType.SUPPORTER),
      hasContents,
      contentsCount,
      contentsIds,
      // Add atomic event snapshots
      targetSnapshot: captureEntitySnapshot(noun, context.world, true),
      contentsSnapshots,
      // Add 'item' for backward compatibility with tests
      item: noun.name
    } as ClosedEventData & { item: string; targetSnapshot?: any; contentsSnapshots?: any[] };
    
    events.push(context.event('if.event.closed', eventData));
    
    // Add success event
    events.push(context.event('action.success', {
      actionId: context.action.id,
      messageId: 'closed',
      params: { item: noun.name }
    }));
    
    return events;
  }
};
