/**
 * Pulling action - pull objects, levers, cords, or attached items
 * 
 * This action handles pulling objects, which can result in:
 * - Activating levers or switches
 * - Pulling cords or ropes
 * - Moving heavy objects (opposite of push)
 * - Detaching attached items
 */

import { Action, EnhancedActionContext } from '../../enhanced-types';
import { SemanticEvent } from '@sharpee/core';
import { 
  TraitType, 
  PullableTrait, 
  LeverTrait, 
  CordTrait, 
  BellPullTrait, 
  AttachedTrait 
} from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { PulledEventData } from './pulling-events';

export const pullingAction: Action = {
  id: IFActions.PULLING,
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
  
  execute(context: EnhancedActionContext): SemanticEvent[] {
    const actor = context.player;
    const target = context.command.directObject?.entity;
    const direction = context.command.parsed.extras?.direction as string;
    
    // Must have something to pull
    if (!target) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'no_target',
        reason: 'no_target'
      })];
    }
    
    // Check if target is visible
    if (!context.canSee(target)) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'not_visible',
        reason: 'not_visible',
        params: { target: target.name }
      })];
    }
    
    // Check if target is reachable
    if (!context.canReach(target)) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'not_reachable',
        reason: 'not_reachable',
        params: { target: target.name }
      })];
    }
    
    // Can't pull worn items
    if (target.has(TraitType.WEARABLE)) {
      const wearableLocation = context.world.getLocation(target.id);
      if (wearableLocation === actor.id) {
        return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'wearing_it',
        reason: 'wearing_it',
        params: { target: target.name }
      })];
      }
    }
    
    // Check if object is pullable
    if (!target.has(TraitType.PULLABLE)) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'not_pullable',
        reason: 'not_pullable',
        params: { target: target.name }
      })];
    }
    
    const pullableTrait = target.get(TraitType.PULLABLE) as PullableTrait;
    
    // Check if already at max pulls
    if (pullableTrait.maxPulls && pullableTrait.pullCount >= pullableTrait.maxPulls) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'max_pulls_reached',
        reason: 'max_pulls_reached',
        params: { target: target.name }
      })];
    }
    
    // Check if not repeatable and already pulled
    if (!pullableTrait.repeatable && pullableTrait.pullCount > 0) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'already_pulled',
        reason: 'already_pulled',
        params: { target: target.name }
      })];
    }
    
    // Check strength requirements
    if (pullableTrait.requiresStrength) {
      // For now, we'll assume the player has standard strength
      // Games can extend this to check actor strength
      const playerStrength = 10; // Default strength
      if (pullableTrait.requiresStrength > playerStrength) {
        return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'too_heavy',
        reason: 'too_heavy',
        params: { 
            target: target.name,
            requiredStrength: pullableTrait.requiresStrength 
          }
      })];
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
    
    // Handle different pull types based on traits
    switch (pullableTrait.pullType) {
      case 'lever':
        eventData.activated = true;
        
        // Check for lever trait
        if (target.has(TraitType.LEVER)) {
          const leverTrait = target.get(TraitType.LEVER) as LeverTrait;
          
          // Check if stuck
          if (leverTrait.stuck) {
            return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'lever_stuck',
        reason: 'lever_stuck',
        params: { target: target.name }
      })];
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
          if (cordTrait.breakable && pullableTrait.requiresStrength) {
            const pullForce = 15; // Default pull force
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
    
    // Create events
    const events: SemanticEvent[] = [];
    
    // Create the PULLED event for world model
    events.push(context.event('if.event.pulled', eventData));
    
    // Add success message
    events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId: messageId,
        params: params
      }));
    
    // Handle special effects
    if (pullableTrait.detachesOnPull && eventData.detached) {
      events.push(context.event('if.event.detached', {
        item: target.id,
        from: eventData.attachedTo
      }));
    }
    
    if (eventData.rings && eventData.audibleDistance) {
      events.push(context.event('if.event.sound', {
        source: target.id,
        sound: eventData.bellSound,
        distance: eventData.audibleDistance
      }));
    }
    
    return events;
  },
  
  group: "device_manipulation"
};
