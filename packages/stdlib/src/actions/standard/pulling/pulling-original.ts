/**
 * Pulling action - pull objects, levers, cords, or attached items
 * 
 * This action handles pulling objects, which can result in:
 * - Activating levers or switches
 * - Pulling cords or ropes
 * - Moving heavy objects (opposite of push)
 * - Detaching attached items
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { ISemanticEvent } from '@sharpee/core';
import { 
  TraitType, 
  PullableTrait, 
  LeverTrait, 
  CordTrait, 
  BellPullTrait, 
  AttachedTrait,
  IFEntity
} from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ScopeLevel } from '../../../scope/types';
import { PulledEventData } from './pulling-events';

interface PullingState {
  target: IFEntity;
  pullableTrait: PullableTrait;
  direction?: string;
  messageId: string;
  eventData: PulledEventData;
  params: Record<string, any>;
  additionalEvents: Array<{ type: string; data: any }>;
}

export const pullingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.PULLING,
  
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  },
  requiredMessages: [
    'no_target',
    'not_visible',
    'not_reachable',
    'not_pullable',
    'too_heavy',
    'wearing_it',
    'wont_budge',
    'lever_pulled',
    'lever_clicks',
    'lever_toggled',
    'lever_stuck',
    'lever_springs_back',
    'cord_pulled',
    'bell_rings',
    'cord_activates',
    'cord_breaks',
    'comes_loose',
    'firmly_attached',
    'tugging_useless',
    'pulled_direction',
    'pulled_nudged',
    'pulled_with_effort',
    'pulling_does_nothing',
    'fixed_in_place',
    'already_pulled',
    'max_pulls_reached'
  ],
  
  validate(context: ActionContext): ValidationResult {
    const actor = context.player;
    const target = context.command.directObject?.entity;
    const direction = context.command.parsed.extras?.direction as string;
    
    // Must have something to pull
    if (!target) {
      return {
        valid: false,
        error: 'no_target'
      };
    }
    
    // Scope validation is handled by CommandValidator
    
    // Can't pull worn items
    if (target.has(TraitType.WEARABLE)) {
      const wearableLocation = context.world.getLocation(target.id);
      if (wearableLocation === actor.id) {
        return {
          valid: false,
          error: 'wearing_it',
          params: { target: target.name }
        };
      }
    }
    
    // Check if object is pullable
    if (!target.has(TraitType.PULLABLE)) {
      return {
        valid: false,
        error: 'not_pullable',
        params: { target: target.name }
      };
    }
    
    const pullableTrait = target.get(TraitType.PULLABLE) as PullableTrait;
    
    // Check if already at max pulls
    if (pullableTrait.maxPulls && pullableTrait.pullCount >= pullableTrait.maxPulls) {
      return {
        valid: false,
        error: 'max_pulls_reached',
        params: { target: target.name }
      };
    }
    
    // Check if not repeatable and already pulled
    if (!pullableTrait.repeatable && pullableTrait.pullCount > 0) {
      return {
        valid: false,
        error: 'already_pulled',
        params: { target: target.name }
      };
    }
    
    // Check strength requirements (but not for cords or heavy objects - they handle it differently)
    if (pullableTrait.requiresStrength && pullableTrait.pullType !== 'cord' && pullableTrait.pullType !== 'heavy') {
      // For now, we'll assume the player has standard strength
      // Games can extend this to check actor strength
      const playerStrength = 10; // Default strength
      if (pullableTrait.requiresStrength > playerStrength) {
        return {
          valid: false,
          error: 'too_heavy',
          params: { 
            target: target.name,
            requiredStrength: pullableTrait.requiresStrength 
          }
        };
      }
    }
    
    // For heavy objects, check if they're too heavy to move at all
    if (pullableTrait.pullType === 'heavy' && pullableTrait.requiresStrength) {
      const playerStrength = 10; // Default strength
      // Allow pulling with effort up to 4x player strength
      if (pullableTrait.requiresStrength > playerStrength * 4) {
        return {
          valid: false,
          error: 'too_heavy',
          params: { 
            target: target.name,
            requiredStrength: pullableTrait.requiresStrength 
          }
        };
      }
    }
    
    // Build event data
    const eventData: PulledEventData = {
      target: target.id,
      targetName: target.name,
      direction: direction,
      pullType: pullableTrait.pullType,
      pullCount: pullableTrait.pullCount + 1
    };
    
    const params: Record<string, any> = {
      target: target.name,
      direction: direction
    };
    
    let messageId: string = 'pulling_does_nothing';
    const additionalEvents: Array<{ type: string; data: any }> = [];
    
    // Handle different pull types based on traits
    switch (pullableTrait.pullType) {
      case 'lever':
        eventData.activated = true;
        
        // Check for lever trait
        if (target.has(TraitType.LEVER)) {
          const leverTrait = target.get(TraitType.LEVER) as LeverTrait;
          
          // Check if stuck
          if (leverTrait.stuck) {
            return {
              valid: false,
              error: 'lever_stuck',
              params: { target: target.name }
            };
          }
          
          // Toggle position
          const oldPosition = leverTrait.position;
          let newPosition: typeof leverTrait.position;
          
          if (leverTrait.position === 'up') {
            newPosition = 'down';
          } else if (leverTrait.position === 'down') {
            newPosition = 'up';
          } else {
            newPosition = 'neutral';
          }
          
          eventData.oldPosition = oldPosition;
          eventData.newPosition = newPosition;
          eventData.springLoaded = leverTrait.springLoaded;
          
          if (leverTrait.controls) {
            eventData.controls = leverTrait.controls;
          }
          
          if (leverTrait.leverSound) {
            eventData.sound = leverTrait.leverSound;
          }
          
          // Set message based on behavior
          if (leverTrait.springLoaded) {
            messageId = 'lever_springs_back';
          } else if (target.has(TraitType.SWITCHABLE)) {
            messageId = 'lever_toggled';
            const switchable = target.get(TraitType.SWITCHABLE) as { isOn?: boolean };
            eventData.willToggle = true;
            eventData.currentState = switchable.isOn;
            eventData.newState = !switchable.isOn;
          } else {
            messageId = 'lever_clicks';
          }
        } else {
          // Generic lever without lever trait
          messageId = 'lever_pulled';
        }
        break;
        
      case 'cord':
        // Check for cord trait
        if (target.has(TraitType.CORD)) {
          const cordTrait = target.get(TraitType.CORD) as CordTrait;
          
          eventData.cordType = cordTrait.cordType as 'rope' | 'chain' | 'cable' | 'wire' | 'string';
          eventData.tension = cordTrait.tension;
          
          // Check if cord breaks
          if (cordTrait.breakable) {
            // Use requiresStrength as the pull force, or default to 15
            const pullForce = pullableTrait.requiresStrength || 15;
            if (cordTrait.breakStrength && pullForce >= cordTrait.breakStrength) {
              eventData.breaks = true;
              messageId = 'cord_breaks';
              if (cordTrait.breakSound) {
                eventData.sound = cordTrait.breakSound;
              }
              break;
            }
          }
          
          if (cordTrait.pullSound) {
            eventData.sound = cordTrait.pullSound;
          }
          
          if (cordTrait.activates) {
            eventData.activates = cordTrait.activates;
          }
        }
        
        // Check for bell pull trait
        if (target.has(TraitType.BELL_PULL)) {
          const bellPullTrait = target.get(TraitType.BELL_PULL) as BellPullTrait;
          
          if (!bellPullTrait.broken) {
            eventData.rings = true;
            eventData.bellSound = bellPullTrait.bellSound;
            eventData.ringCount = bellPullTrait.ringCount;
            eventData.ringPattern = bellPullTrait.ringPattern;
            eventData.audibleDistance = bellPullTrait.audibleDistance;
            
            if (bellPullTrait.ringsBellId) {
              eventData.ringsBellId = bellPullTrait.ringsBellId;
            }
            
            messageId = 'bell_rings';
          } else {
            messageId = 'cord_pulled';
          }
        } else {
          messageId = 'cord_activates';
        }
        break;
        
      case 'attached':
        // Check for attached trait
        if (target.has(TraitType.ATTACHED)) {
          const attachedTrait = target.get(TraitType.ATTACHED) as AttachedTrait;
          
          eventData.attachmentType = attachedTrait.attachmentType;
          eventData.attachedTo = attachedTrait.attachedTo;
          
          if (attachedTrait.detachable) {
            // Check force requirements
            const pullForce = 15; // Default pull force
            if (!attachedTrait.detachForce || pullForce >= attachedTrait.detachForce) {
              eventData.willDetach = true;
              eventData.detached = true;
              messageId = 'comes_loose';
              
              if (attachedTrait.detachSound) {
                eventData.sound = attachedTrait.detachSound;
              }
              
              if (attachedTrait.onDetach) {
                eventData.onDetach = attachedTrait.onDetach as string;
              }
            } else {
              messageId = attachedTrait.loose ? 'tugging_useless' : 'firmly_attached';
            }
          } else {
            messageId = 'firmly_attached';
          }
        } else {
          // Generic attached without trait
          messageId = 'firmly_attached';
        }
        break;
        
      case 'heavy':
        // Heavy objects that can be moved by pulling
        if (direction) {
          eventData.moved = true;
          eventData.moveDirection = direction;
          messageId = pullableTrait.requiresStrength && pullableTrait.requiresStrength > 30 
            ? 'pulled_with_effort' 
            : 'pulled_direction';
        } else {
          eventData.moved = false;
          eventData.nudged = true;
          messageId = 'pulled_nudged';
        }
        break;
        
      default:
        messageId = 'pulling_does_nothing';
        break;
    }
    
    // Add pull sound if specified
    if (pullableTrait.pullSound && !eventData.sound) {
      eventData.sound = pullableTrait.pullSound;
    }
    
    // Check for custom effects
    if (pullableTrait.effects?.onPull) {
      eventData.customEffect = pullableTrait.effects.onPull;
    }
    
    // Prepare additional events
    if (eventData.detached && eventData.attachedTo) {
      additionalEvents.push({
        type: 'if.event.detached',
        data: {
          item: target.id,
          from: eventData.attachedTo
        }
      });
    }
    
    if (eventData.rings && eventData.audibleDistance) {
      additionalEvents.push({
        type: 'if.event.sound',
        data: {
          source: target.id,
          sound: eventData.bellSound,
          distance: eventData.audibleDistance
        }
      });
    }
    
    return {
      valid: true
    };
  },
  
  execute(context: ActionContext): ISemanticEvent[] {
    // Revalidate and rebuild all data
    const validation = this.validate(context);
    if (!validation.valid) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: validation.error,
        params: validation.params || {}
      })];
    }
    
    const actor = context.player;
    const target = context.command.directObject!.entity!;
    const direction = context.command.parsed.extras?.direction as string;
    const pullableTrait = target.get(TraitType.PULLABLE) as PullableTrait;
    
    // Rebuild event data from context
    const eventData: PulledEventData = {
      target: target.id,
      targetName: target.name,
      direction: direction,
      pullType: pullableTrait.pullType,
      pullCount: pullableTrait.pullCount + 1
    };
    
    const params: Record<string, any> = {
      target: target.name,
      direction: direction
    };
    
    let messageId: string = 'pulling_does_nothing';
    const additionalEvents: Array<{ type: string; data: any }> = [];
    
    // Rebuild all the switch logic from validation
    switch (pullableTrait.pullType) {
      case 'lever':
        eventData.activated = true;
        if (target.has(TraitType.LEVER)) {
          const leverTrait = target.get(TraitType.LEVER) as LeverTrait;
          const oldPosition = leverTrait.position;
          let newPosition: typeof leverTrait.position;
          
          if (leverTrait.position === 'up') {
            newPosition = 'down';
          } else if (leverTrait.position === 'down') {
            newPosition = 'up';
          } else {
            newPosition = 'neutral';
          }
          
          eventData.oldPosition = oldPosition;
          eventData.newPosition = newPosition;
          eventData.springLoaded = leverTrait.springLoaded;
          
          if (leverTrait.controls) {
            eventData.controls = leverTrait.controls;
          }
          
          if (leverTrait.leverSound) {
            eventData.sound = leverTrait.leverSound;
          }
          
          if (leverTrait.springLoaded) {
            messageId = 'lever_springs_back';
          } else if (target.has(TraitType.SWITCHABLE)) {
            messageId = 'lever_toggled';
            const switchable = target.get(TraitType.SWITCHABLE) as { isOn?: boolean };
            eventData.willToggle = true;
            eventData.currentState = switchable.isOn;
            eventData.newState = !switchable.isOn;
          } else {
            messageId = 'lever_clicks';
          }
        } else {
          messageId = 'lever_pulled';
        }
        break;
        
      case 'cord':
        if (target.has(TraitType.CORD)) {
          const cordTrait = target.get(TraitType.CORD) as CordTrait;
          eventData.cordType = cordTrait.cordType as 'rope' | 'chain' | 'cable' | 'wire' | 'string';
          eventData.tension = cordTrait.tension;
          
          if (cordTrait.breakable) {
            const pullForce = pullableTrait.requiresStrength || 15;
            if (cordTrait.breakStrength && pullForce >= cordTrait.breakStrength) {
              eventData.breaks = true;
              messageId = 'cord_breaks';
              if (cordTrait.breakSound) {
                eventData.sound = cordTrait.breakSound;
              }
              break;
            }
          }
          
          if (cordTrait.pullSound) {
            eventData.sound = cordTrait.pullSound;
          }
          
          if (cordTrait.activates) {
            eventData.activates = cordTrait.activates;
          }
        }
        
        if (target.has(TraitType.BELL_PULL)) {
          const bellPullTrait = target.get(TraitType.BELL_PULL) as BellPullTrait;
          
          if (!bellPullTrait.broken) {
            eventData.rings = true;
            eventData.bellSound = bellPullTrait.bellSound;
            eventData.ringCount = bellPullTrait.ringCount;
            eventData.ringPattern = bellPullTrait.ringPattern;
            eventData.audibleDistance = bellPullTrait.audibleDistance;
            
            if (bellPullTrait.ringsBellId) {
              eventData.ringsBellId = bellPullTrait.ringsBellId;
            }
            
            messageId = 'bell_rings';
          } else {
            messageId = 'cord_pulled';
          }
        } else {
          messageId = 'cord_activates';
        }
        break;
        
      case 'attached':
        if (target.has(TraitType.ATTACHED)) {
          const attachedTrait = target.get(TraitType.ATTACHED) as AttachedTrait;
          
          eventData.attachmentType = attachedTrait.attachmentType;
          eventData.attachedTo = attachedTrait.attachedTo;
          
          if (attachedTrait.detachable) {
            const pullForce = 15;
            if (!attachedTrait.detachForce || pullForce >= attachedTrait.detachForce) {
              eventData.willDetach = true;
              eventData.detached = true;
              messageId = 'comes_loose';
              
              if (attachedTrait.detachSound) {
                eventData.sound = attachedTrait.detachSound;
              }
              
              if (attachedTrait.onDetach) {
                eventData.onDetach = attachedTrait.onDetach as string;
              }
            } else {
              messageId = attachedTrait.loose ? 'tugging_useless' : 'firmly_attached';
            }
          } else {
            messageId = 'firmly_attached';
          }
        } else {
          messageId = 'firmly_attached';
        }
        break;
        
      case 'heavy':
        if (direction) {
          eventData.moved = true;
          eventData.moveDirection = direction;
          messageId = pullableTrait.requiresStrength && pullableTrait.requiresStrength > 30 
            ? 'pulled_with_effort' 
            : 'pulled_direction';
        } else {
          eventData.moved = false;
          eventData.nudged = true;
          messageId = 'pulled_nudged';
        }
        break;
        
      default:
        messageId = 'pulling_does_nothing';
        break;
    }
    
    if (pullableTrait.pullSound && !eventData.sound) {
      eventData.sound = pullableTrait.pullSound;
    }
    
    if (pullableTrait.effects?.onPull) {
      eventData.customEffect = pullableTrait.effects.onPull;
    }
    
    if (eventData.detached && eventData.attachedTo) {
      additionalEvents.push({
        type: 'if.event.detached',
        data: {
          item: target.id,
          from: eventData.attachedTo
        }
      });
    }
    
    if (eventData.rings && eventData.audibleDistance) {
      additionalEvents.push({
        type: 'if.event.sound',
        data: {
          source: target.id,
          sound: eventData.bellSound,
          distance: eventData.audibleDistance
        }
      });
    }
    
    const events: ISemanticEvent[] = [];
    
    // Create the PULLED event for world model
    events.push(context.event('if.event.pulled', eventData));
    
    // Add success message
    events.push(context.event('action.success', {
      actionId: context.action.id,
      messageId: messageId,
      params: params
    }));
    
    // Add any additional events
    for (const additionalEvent of additionalEvents) {
      events.push(context.event(additionalEvent.type, additionalEvent.data));
    }
    
    return events;
  },
  
  group: "device_manipulation"
};
