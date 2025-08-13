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
import { SemanticEvent } from '@sharpee/core';
import { TraitType, PushableTrait, SwitchableTrait, IFEntity } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ScopeLevel } from '../../../scope/types';
import { PushedEventData } from './pushing-events';

interface PushingState {
  target: IFEntity;
  pushableTrait: PushableTrait;
  direction?: string;
  messageId: string;
  eventData: PushedEventData;
  finalMessageParams: Record<string, any>;
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
    const direction = context.command.parsed.extras?.direction as string;

    // Must have something to push
    if (!target) {
      return {
        valid: false,
        error: 'no_target'
      };
    }

    // Scope validation is handled by CommandValidator

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

    // Get pushable trait data
    const pushableTraitData = target.get(TraitType.PUSHABLE);
    if (!pushableTraitData) {
      // This shouldn't happen since we checked has(PUSHABLE), but TypeScript needs this
      return {
        valid: false,
        error: 'pushing_does_nothing'
      };
    }
    const pushableTrait = pushableTraitData as PushableTrait;

    // Initialize event data
    const eventData: PushedEventData = {
      target: target.id,
      targetName: target.name,
      direction: direction,
      pushType: pushableTrait.pushType
    };

    const params: Record<string, any> = {
      target: target.name,
      direction: direction
    };

    let messageId: string;

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
            params.newState = switchable.isOn ? 'off' : 'on';
          }

          // Choose message based on whether it has BUTTON trait
          if (target.has(TraitType.BUTTON)) {
            messageId = 'button_clicks';
          } else {
            messageId = 'switch_toggled';
          }
        } else {
          // Non-switchable button
          messageId = 'button_pushed';
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
          params.requiresStrength = pushableTrait.requiresStrength;

          // For now, assume player has enough strength
          // TODO: Add strength checking when player traits are implemented
        }

        if (direction) {
          eventData.moved = true;
          eventData.moveDirection = direction;
          messageId = 'pushed_with_effort';
        } else {
          eventData.moved = false;
          eventData.nudged = true;
          messageId = 'wont_budge';
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
        } else {
          eventData.moved = false;
          eventData.nudged = true;
          messageId = 'pushed_nudged';
        }

        // Add push sound if specified
        if (pushableTrait.pushSound) {
          eventData.sound = pushableTrait.pushSound;
        }
        break;

      default:
        // Fallback for unknown push types
        messageId = 'pushing_does_nothing';
        break;
    }

    // Create minimal message params based on message type
    const finalMessageParams: Record<string, any> = {};

    // Only include the parameters needed for each specific message
    switch (messageId) {
      case 'button_clicks':
      case 'button_pushed':
        finalMessageParams.target = target.name;
        break;
      case 'switch_toggled':
        finalMessageParams.target = target.name;
        finalMessageParams.newState = params.newState;
        break;
      case 'pushed_direction':
      case 'reveals_passage':
        finalMessageParams.target = target.name;
        finalMessageParams.direction = direction;
        break;
      case 'pushed_with_effort':
        finalMessageParams.target = target.name;
        if (direction) {
          finalMessageParams.direction = direction;
        }
        break;
      case 'too_heavy':
        finalMessageParams.target = target.name;
        if (params.requiresStrength) {
          finalMessageParams.requiresStrength = params.requiresStrength;
        }
        break;
      default:
        finalMessageParams.target = target.name;
        break;
    }

    return {
      valid: true
    };
  },

  execute(context: ActionContext): SemanticEvent[] {
    const events: SemanticEvent[] = [];
    const actor = context.player;
    const target = context.command.directObject?.entity;
    const direction = context.command.parsed.extras?.direction as string;
    
    if (!target || !target.has(TraitType.PUSHABLE)) {
      return [];
    }
    
    const pushableTrait = target.get(TraitType.PUSHABLE) as PushableTrait;
    
    // Initialize event data
    const eventData: PushedEventData = {
      target: target.id,
      targetName: target.name,
      direction: direction,
      pushType: pushableTrait.pushType
    };
    
    const params: Record<string, any> = {
      target: target.name,
      direction: direction
    };
    
    let messageId: string;
    
    // Handle based on push type
    switch (pushableTrait.pushType) {
      case 'button':
        // Buttons activate when pushed
        eventData.activated = true;
        
        // Check if it's also switchable
        if (target.has(TraitType.SWITCHABLE)) {
          const switchableData = target.get(TraitType.SWITCHABLE);
          if (switchableData) {
            const switchable = switchableData as { isOn?: boolean };
            eventData.willToggle = true;
            eventData.currentState = switchable.isOn;
            eventData.newState = !switchable.isOn;
            messageId = 'button_toggles';
          } else {
            messageId = 'button_pressed';
          }
        } else {
          messageId = 'button_clicks';
        }
        
        // Add button sound if specified
        if (pushableTrait.pushSound) {
          eventData.sound = pushableTrait.pushSound;
        }
        break;
        
      case 'heavy':
        // Heavy objects require more effort
        if (pushableTrait.requiresStrength) {
          params.requiresStrength = pushableTrait.requiresStrength;
          // For now, assume player has enough strength
        }
        
        if (direction) {
          eventData.moved = true;
          eventData.moveDirection = direction;
          messageId = 'pushed_with_effort';
        } else {
          eventData.moved = false;
          eventData.nudged = true;
          messageId = 'wont_budge';
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
        } else {
          eventData.moved = false;
          eventData.nudged = true;
          messageId = 'pushed_nudged';
        }
        
        // Add push sound if specified
        if (pushableTrait.pushSound) {
          eventData.sound = pushableTrait.pushSound;
        }
        break;
        
      default:
        // Fallback for unknown push types or objects without specific push type
        eventData.moved = false;
        
        if (pushableTrait.requiresStrength) {
          params.requiresStrength = pushableTrait.requiresStrength;
          messageId = 'too_heavy';
        } else {
          messageId = 'wont_budge';
        }
        break;
    }
    
    // Create minimal message params based on message type
    const finalMessageParams: Record<string, any> = {};
    
    switch (messageId) {
      case 'button_toggles':
      case 'button_pressed':
      case 'button_clicks':
        finalMessageParams.button = target.name;
        break;
      case 'pushed_direction':
      case 'pushed_with_effort':
        finalMessageParams.target = target.name;
        finalMessageParams.direction = direction;
        break;
      case 'too_heavy':
        finalMessageParams.target = target.name;
        if (params.requiresStrength) {
          finalMessageParams.requiresStrength = params.requiresStrength;
        }
        break;
      default:
        finalMessageParams.target = target.name;
        break;
    }
    
    // Create the PUSHED event for world model
    events.push(context.event('if.event.pushed', eventData));
    
    // Add success message
    events.push(context.event('action.success', {
      actionId: context.action.id,
      messageId: messageId,
      params: finalMessageParams
    }));
    
    return events;
  },

  group: "device_manipulation"
};
