/**
 * Entering action - enter containers, supporters, or other enterable objects
 * 
 * This action handles entering objects that have the ENTRY trait or
 * are containers/supporters marked as enterable.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { 
  TraitType, 
  ContainerTrait, 
  SupporterTrait,
  ContainerBehavior,
  SupporterBehavior,
  OpenableBehavior
} from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { EnteredEventData } from './entering-events';

interface EnteringExecutionState {
  targetId: string;
  targetName: string;
  fromLocation?: string;
  preposition: 'in' | 'on';
}
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';

export const enteringAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.ENTERING,
  requiredMessages: [
    'no_target',
    'not_enterable',
    'already_inside',
    'container_closed',
    'too_full',
    'entered',
    'entered_on',
    'cant_enter'
  ],
  group: 'movement',
  
  validate(context: ActionContext): ValidationResult {
    const actor = context.player;
    const target = context.command.directObject?.entity;
    
    // Validate target
    if (!target) {
      return { 
        valid: false, 
        error: 'no_target'
      };
    }
    
    // Check if already inside the target
    const currentLocation = context.world.getLocation(actor.id);
    if (currentLocation === target.id) {
      return { 
        valid: false, 
        error: 'already_inside',
        params: { place: target.name }
      };
    }
    
    // Check if it's an enterable container
    if (target.has(TraitType.CONTAINER)) {
      const containerTrait = target.get(TraitType.CONTAINER) as ContainerTrait;
      if (!containerTrait.enterable) {
        return { 
          valid: false, 
          error: 'not_enterable',
          params: { place: target.name }
        };
      }
      
      // Check if container needs to be open
      if (target.has(TraitType.OPENABLE) && !OpenableBehavior.isOpen(target)) {
        return { 
          valid: false, 
          error: 'container_closed',
          params: { container: target.name }
        };
      }
      
      // Check capacity for containers
      if (!ContainerBehavior.canAccept(target, actor, context.world)) {
        return { 
          valid: false, 
          error: 'too_full',
          params: { 
            place: target.name
          }
        };
      }
      
      return { valid: true };
    }
    
    // Check if it's an enterable supporter
    if (target.has(TraitType.SUPPORTER)) {
      const supporterTrait = target.get(TraitType.SUPPORTER) as SupporterTrait;
      if (!supporterTrait.enterable) {
        return { 
          valid: false, 
          error: 'not_enterable',
          params: { place: target.name }
        };
      }
      
      // Check capacity for supporters
      if (!SupporterBehavior.canAccept(target, actor, context.world)) {
        return { 
          valid: false, 
          error: 'too_full',
          params: { 
            place: target.name
          }
        };
      }
      
      return { valid: true };
    }
    
    // Not enterable (not a container or supporter)
    return { 
      valid: false, 
      error: 'not_enterable',
      params: { place: target.name }
    };
  },
  
  /**
   * Execute the enter action - performs mutations only
   * Assumes validation has already passed
   */
  execute(context: ActionContext): void {
    const actor = context.player;
    const target = context.command.directObject!.entity!; // Safe because validate ensures it exists
    const currentLocation = context.world.getLocation(actor.id);
    
    // Determine preposition based on target type
    let preposition: 'in' | 'on' = 'in';
    
    if (target.has(TraitType.SUPPORTER)) {
      preposition = 'on';
    }
    
    // Simply move the actor to the target - that's all!
    context.world.moveEntity(actor.id, target.id);
    
    // Store state for report phase
    const state: EnteringExecutionState = {
      targetId: target.id,
      targetName: target.name,
      fromLocation: currentLocation,
      preposition
    };
    (context as any)._enteringState = state;
  },
  
  /**
   * Report phase - generates all events after successful execution
   * Handles validation errors, execution errors, and success events
   */
  report(context: ActionContext, validationResult?: ValidationResult, executionError?: Error): ISemanticEvent[] {
    // Handle validation errors
    if (validationResult && !validationResult.valid) {
      return [
        context.event('action.error', {
          actionId: context.action.id,
          messageId: validationResult.error || 'action_failed',
          params: validationResult.params || {}
        })
      ];
    }
    
    // Handle execution errors
    if (executionError) {
      return [
        context.event('action.error', {
          actionId: context.action.id,
          messageId: 'action_failed',
          params: {
            error: executionError.message
          }
        })
      ];
    }
    
    // Get stored state from execute phase
    const state = (context as any)._enteringState as EnteringExecutionState | undefined;
    if (!state) {
      // This shouldn't happen, but handle gracefully
      return [
        context.event('action.error', {
          actionId: context.action.id,
          messageId: 'action_failed',
          params: {
            error: 'Missing state from execute phase'
          }
        })
      ];
    }
    
    const events: ISemanticEvent[] = [];
    
    // Create the ENTERED event for world model updates
    const enteredData: EnteredEventData = {
      targetId: state.targetId,
      fromLocation: state.fromLocation,
      preposition: state.preposition
    };
    
    events.push(context.event('if.event.entered', enteredData));
    
    // Build params for success message
    const params: Record<string, any> = {
      place: state.targetName,
      preposition: state.preposition
    };
    
    // Create success message
    const messageId = state.preposition === 'on' ? 'entered_on' : 'entered';
    events.push(context.event('action.success', {
      actionId: context.action.id,
      messageId: messageId,
      params: params
    }));
    
    return events;
  },
  
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  }
};
