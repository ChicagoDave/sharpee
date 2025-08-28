/**
 * Push sub-action - handles the actual pushing of objects
 */

import { Action, ActionContext, ValidationResult } from '../../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { IFEntity, TraitType, PushableTrait, SwitchableTrait } from '@sharpee/world-model';
import { PushedEventData } from '../pushing-events';
import { IFActions } from '../../../constants';

export const pushSubAction: Action = {
  id: `${IFActions.PUSHING}.push`,
  requiredMessages: [],
  group: 'device_manipulation',
  
  validate(context: ActionContext): ValidationResult {
    const target = context.command.directObject?.entity || (context.command as any).entity;
    
    if (!target) {
      return {
        valid: false,
        error: 'no_target'
      };
    }
    
    // Check if object has PUSHABLE trait
    if (!target.has(TraitType.PUSHABLE)) {
      return {
        valid: false,
        error: 'pushing_does_nothing',
        params: { target: target.name }
      };
    }
    
    // Check max pushes
    const pushableTrait = target.get(TraitType.PUSHABLE) as PushableTrait;
    if (pushableTrait.maxPushes && pushableTrait.pushCount >= pushableTrait.maxPushes) {
      return {
        valid: false,
        error: 'wont_budge',
        params: { target: target.name }
      };
    }
    
    return { valid: true };
  },
  
  execute(context: ActionContext): void {
    const target = context.command.directObject?.entity || (context.command as any).entity;
    if (!target) return;
    
    const pushableTrait = target.get(TraitType.PUSHABLE) as PushableTrait;
    const direction = context.command.parsed?.extras?.direction as string;
    
    // Update push count
    pushableTrait.pushCount = (pushableTrait.pushCount || 0) + 1;
    
    // Handle based on push type
    switch (pushableTrait.pushType) {
      case 'button':
        // Check if it's also switchable and toggle it
        if (target.has(TraitType.SWITCHABLE)) {
          const switchable = target.get(TraitType.SWITCHABLE) as SwitchableTrait;
          switchable.isOn = !switchable.isOn;
        }
        
        // Set state based on repeatability
        // Default to repeatable (activated) unless explicitly set to false
        if (pushableTrait.repeatable === false) {
          pushableTrait.state = 'pushed';
        } else {
          pushableTrait.state = 'activated';
        }
        break;
        
      case 'heavy':
      case 'moveable':
        if (direction) {
          pushableTrait.state = 'pushed';
        }
        break;
        
      default:
        break;
    }
    
    // Store result for report
    (context as any)._pushResult = {
      success: true,
      target,
      pushableTrait,
      direction
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
    const result = (context as any)._pushResult;
    if (!result || !result.success) {
      return [];
    }
    
    const { target, pushableTrait, direction } = result;
    
    // Initialize event data
    const eventData: PushedEventData = {
      target: target.id,
      targetName: target.name,
      direction: direction,
      pushType: pushableTrait.pushType
    };
    
    let messageId: string;
    const messageParams: Record<string, any> = {};
    
    // Handle based on push type
    switch (pushableTrait.pushType) {
      case 'button':
        eventData.activated = true;
        
        // Check if it's also switchable
        if (target.has(TraitType.SWITCHABLE)) {
          const switchable = target.get(TraitType.SWITCHABLE) as SwitchableTrait;
          eventData.willToggle = true;
          eventData.currentState = !switchable.isOn; // It was toggled in execute
          eventData.newState = switchable.isOn;
          
          // Choose message based on whether it has BUTTON trait
          if (target.has(TraitType.BUTTON)) {
            messageId = 'button_clicks';
          } else {
            messageId = 'switch_toggled';
          }
          
          messageParams.target = target.name;
          messageParams.newState = switchable.isOn ? 'on' : 'off';
        } else {
          // Non-switchable button
          messageId = 'button_pushed';
          messageParams.target = target.name;
        }
        
        // Add push sound if specified
        if (pushableTrait.pushSound) {
          eventData.sound = pushableTrait.pushSound;
        }
        break;
        
      case 'heavy':
        // Heavy objects might require strength
        if (pushableTrait.requiresStrength) {
          eventData.requiresStrength = pushableTrait.requiresStrength;
        }
        
        if (direction) {
          eventData.moved = true;
          eventData.moveDirection = direction;
          messageId = 'pushed_with_effort';
          messageParams.target = target.name;
          messageParams.direction = direction;
        } else {
          eventData.moved = false;
          eventData.nudged = true;
          messageId = 'wont_budge';
          messageParams.target = target.name;
        }
        break;
        
      case 'moveable':
        // Moveable objects can be pushed around
        if (direction) {
          eventData.moved = true;
          eventData.moveDirection = direction;
          
          // Check if pushing reveals a passage
          if (pushableTrait.revealsPassage) {
            eventData.revealsPassage = true;
            messageId = 'reveals_passage';
          } else {
            messageId = 'pushed_direction';
          }
          
          messageParams.target = target.name;
          messageParams.direction = direction;
        } else {
          eventData.moved = false;
          eventData.nudged = true;
          messageId = 'pushed_nudged';
          messageParams.target = target.name;
        }
        
        // Add push sound if specified
        if (pushableTrait.pushSound) {
          eventData.sound = pushableTrait.pushSound;
        }
        break;
        
      default:
        // Fallback for unknown push types
        messageId = 'pushing_does_nothing';
        messageParams.target = target.name;
        break;
    }
    
    // Emit custom effects if specified
    if (pushableTrait.effects?.onPush) {
      events.push(context.event(pushableTrait.effects.onPush, { 
        target: target.id 
      }));
    }
    
    // Check for max pushes reached
    if (pushableTrait.maxPushes && pushableTrait.pushCount === pushableTrait.maxPushes && pushableTrait.effects?.onMaxPushes) {
      events.push(context.event(pushableTrait.effects.onMaxPushes, { 
        target: target.id 
      }));
    }
    
    // Emit the PUSHED event for world model
    events.push(context.event('if.event.pushed', eventData));
    
    // Add success message
    events.push(context.event('action.success', {
      actionId: IFActions.PUSHING,
      messageId: messageId,
      params: messageParams
    }));
    
    return events;
  }
};