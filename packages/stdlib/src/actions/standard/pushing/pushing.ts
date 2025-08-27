/**
 * Pushing action - push objects, buttons, or move heavy items
 * 
 * This action handles pushing objects, which can result in:
 * - Moving heavy scenery objects
 * - Activating buttons or switches
 * - Revealing hidden passages
 * - General pushing feedback
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, PushableTrait, SwitchableTrait, IFEntity } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ScopeLevel } from '../../../scope/types';
import { PushedEventData } from './pushing-events';

interface PushAnalysis {
  target: IFEntity;
  pushableTrait: PushableTrait;
  direction?: string;
  messageId: string;
  eventData: PushedEventData;
  messageParams: Record<string, any>;
}

/**
 * Analyzes the push action to determine what happens
 */
function analyzePushAction(context: ActionContext): PushAnalysis | null {
  const target = context.command.directObject?.entity;
  const direction = context.command.parsed.extras?.direction as string;
  
  if (!target || !target.has(TraitType.PUSHABLE)) {
    return null;
  }
  
  const pushableTrait = target.get(TraitType.PUSHABLE) as PushableTrait;
  
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
      // Buttons activate when pushed
      eventData.activated = true;
      
      // Check if it's also switchable
      if (target.has(TraitType.SWITCHABLE)) {
        const switchableData = target.get(TraitType.SWITCHABLE);
        if (switchableData) {
          const switchable = switchableData as SwitchableTrait;
          eventData.willToggle = true;
          eventData.currentState = switchable.isOn;
          eventData.newState = !switchable.isOn;
          
          // Choose message based on whether it has BUTTON trait
          if (target.has(TraitType.BUTTON)) {
            messageId = 'button_clicks';
          } else {
            messageId = 'switch_toggled';
          }
          
          messageParams.target = target.name;
          messageParams.newState = switchable.isOn ? 'off' : 'on';
        } else {
          messageId = 'button_pushed';
          messageParams.target = target.name;
        }
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
  
  return {
    target,
    pushableTrait,
    direction,
    messageId,
    eventData,
    messageParams
  };
}

export const pushingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.PUSHING,
  requiredMessages: [
    'no_target',
    'not_visible',
    'not_reachable',
    'too_heavy',
    'wearing_it',
    'button_pushed',
    'button_clicks',
    'switch_toggled',
    'pushed_direction',
    'pushed_nudged',
    'pushed_with_effort',
    'reveals_passage',
    'wont_budge',
    'pushing_does_nothing',
    'fixed_in_place'
  ],
  
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  },

  validate(context: ActionContext): ValidationResult {
    const actor = context.player;
    const target = context.command.directObject?.entity;

    // Must have something to push
    if (!target) {
      return {
        valid: false,
        error: 'no_target'
      };
    }

    // Can't push worn items
    if (target.has(TraitType.WEARABLE)) {
      const wearableLocation = context.world.getLocation(target.id);
      if (wearableLocation === actor.id) {
        return {
          valid: false,
          error: 'wearing_it'
        };
      }
    }

    // Check if object is pushable
    if (!target.has(TraitType.PUSHABLE)) {
      // Not pushable - check if it's fixed scenery
      if (target.has(TraitType.SCENERY)) {
        return {
          valid: false,
          error: 'fixed_in_place'
        };
      }
      // Regular non-pushable object
      return {
        valid: false,
        error: 'pushing_does_nothing'
      };
    }

    // Analysis will check the rest
    return { valid: true };
  },

  execute(context: ActionContext): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];
    
    // Analyze what happens when we push
    const analysis = analyzePushAction(context);
    if (!analysis) {
      return [];
    }
    
    // Emit the PUSHED event for world model
    events.push(context.event('if.event.pushed', analysis.eventData));
    
    // Add success message
    events.push(context.event('action.success', {
      actionId: context.action.id,
      messageId: analysis.messageId,
      params: analysis.messageParams
    }));
    
    return events;
  },

  group: "device_manipulation"
};