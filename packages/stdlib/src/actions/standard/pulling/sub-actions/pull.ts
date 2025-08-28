/**
 * Pull sub-action - handles the actual pulling of objects
 */

import { Action, ActionContext, ValidationResult } from '../../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { IFEntity, TraitType, PullableTrait } from '@sharpee/world-model';
import { PulledEventData } from '../pulling-events';
import { IFActions } from '../../../constants';

export const pullSubAction: Action = {
  id: `${IFActions.PULLING}.pull`,
  requiredMessages: [],
  group: 'interaction',
  
  validate(context: ActionContext): ValidationResult {
    const target = context.command.directObject?.entity || (context.command as any).entity;
    
    if (!target) {
      return {
        valid: false,
        error: 'no_target'
      };
    }
    
    // Check if object has PULLABLE trait
    if (!target.has(TraitType.PULLABLE)) {
      return {
        valid: false,
        error: 'cant_pull_that',
        params: { target: target.name }
      };
    }
    
    // Check max pulls
    const pullableTrait = target.get(TraitType.PULLABLE) as PullableTrait;
    if (pullableTrait.maxPulls && pullableTrait.pullCount >= pullableTrait.maxPulls) {
      return {
        valid: false,
        error: 'already_pulled',
        params: { target: target.name }
      };
    }
    
    return { valid: true };
  },
  
  execute(context: ActionContext): void {
    const target = context.command.directObject?.entity || (context.command as any).entity;
    if (!target) return;
    
    const pullableTrait = target.get(TraitType.PULLABLE) as PullableTrait;
    
    // Update pull count
    const oldState = pullableTrait.state;
    pullableTrait.pullCount = (pullableTrait.pullCount || 0) + 1;
    
    // Handle state changes based on pull type
    switch (pullableTrait.pullType) {
      case 'lever':
        // Toggle lever position if repeatable
        if (pullableTrait.repeatable) {
          pullableTrait.state = pullableTrait.state === 'pulled' ? 'default' : 'pulled';
        } else {
          pullableTrait.state = 'activated';
        }
        break;
        
      case 'cord':
        // Reset state if repeatable
        if (pullableTrait.repeatable) {
          pullableTrait.state = 'default';
        } else {
          pullableTrait.state = 'pulled';
        }
        break;
        
      case 'attached':
      case 'heavy':
      default:
        pullableTrait.state = 'pulled';
        break;
    }
    
    // Check for max pulls and set permanent state
    if (pullableTrait.maxPulls && pullableTrait.pullCount === pullableTrait.maxPulls) {
      if (!pullableTrait.repeatable) {
        pullableTrait.state = 'activated';
      }
    }
    
    // Store result for report
    (context as any)._pullResult = {
      success: true,
      target,
      pullableTrait,
      oldState
    };
  },
  
  report(context: ActionContext, validationResult?: ValidationResult, executionError?: Error): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];
    
    // Handle validation errors
    if (validationResult && !validationResult.valid) {
      return [
        context.event('action.error', {
          actionId: context.action.id,
          messageId: validationResult.error!,
          params: validationResult.params
        })
      ];
    }
    
    // Handle execution errors
    if (executionError) {
      return [
        context.event('action.error', {
          actionId: context.action.id,
          messageId: 'action_failed',
          params: { error: executionError.message }
        })
      ];
    }
    
    // Get stored result
    const result = (context as any)._pullResult;
    if (!result || !result.success) {
      return [];
    }
    
    const { target, pullableTrait, oldState } = result;
    
    // Build event data
    const eventData: PulledEventData = {
      target: target.id,
      targetName: target.name,
      pullCount: pullableTrait.pullCount,
      pullType: pullableTrait.pullType
    };
    
    let messageId = 'pulled';
    const messageParams: Record<string, any> = { target: target.name };
    
    // Handle based on pull type
    switch (pullableTrait.pullType) {
      case 'lever':
        // Levers change position
        eventData.activated = true;
        
        // Set position based on state transition
        if (oldState === 'default') {
          eventData.oldPosition = 'up';
          eventData.newPosition = 'down';
        } else {
          eventData.oldPosition = 'down';
          eventData.newPosition = 'up';
        }
        break;
        
      case 'cord':
        // Cords might activate something
        if (pullableTrait.activates) {
          eventData.activated = true;
          eventData.activates = pullableTrait.activates;
          
          // Check for bell ringing (if story defines a bell)
          const activatedEntity = context.world.getEntity(pullableTrait.activates);
          if (activatedEntity) {
            // Bell functionality would be handled by story event handlers
            eventData.rings = true;
            eventData.ringsBellId = pullableTrait.activates;
            eventData.bellSound = 'ding';
            eventData.ringCount = 1;
          }
        }
        
        // Add cord tension
        eventData.cordType = 'rope';
        eventData.tension = 'taut';
        break;
        
      case 'attached':
        // Attached objects might detach
        if (pullableTrait.detachesOnPull) {
          eventData.willDetach = true;
          eventData.detached = true;
          
          // Emit detach event
          events.push(context.event('if.event.detached', {
            item: target.id,
            from: context.world.getLocation(target.id)
          }));
          
          // Custom effect on detach
          if (pullableTrait.effects?.onDetach) {
            events.push(context.event(pullableTrait.effects.onDetach, { 
              target: target.id 
            }));
          }
        } else {
          eventData.nudged = true;
        }
        break;
        
      case 'heavy':
        // Heavy objects require strength
        if (pullableTrait.requiresStrength) {
          eventData.moved = true;
        } else {
          eventData.nudged = true;
        }
        break;
        
      default:
        break;
    }
    
    // Add pull sound if specified
    if (pullableTrait.pullSound) {
      eventData.sound = pullableTrait.pullSound;
      events.push(context.event('if.event.sound', {
        source: target.id,
        sound: pullableTrait.pullSound
      }));
    }
    
    // Emit custom effects if specified
    if (pullableTrait.effects?.onPull) {
      events.push(context.event(pullableTrait.effects.onPull, { 
        target: target.id 
      }));
    }
    
    // Check for max pulls reached
    if (pullableTrait.maxPulls && pullableTrait.pullCount === pullableTrait.maxPulls) {
      if (pullableTrait.effects?.onMaxPulls) {
        events.push(context.event(pullableTrait.effects.onMaxPulls, { 
          target: target.id 
        }));
      }
    }
    
    // Emit the PULLED event for world model
    events.push(context.event('if.event.pulled', eventData));
    
    // Add success message
    events.push(context.event('action.success', {
      actionId: IFActions.PULLING,
      messageId: messageId,
      params: messageParams
    }));
    
    return events;
  }
};