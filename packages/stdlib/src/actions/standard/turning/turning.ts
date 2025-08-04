/**
 * Turning action - turn dials, knobs, wheels, cranks, or keys
 * 
 * This action handles turning objects, which can result in:
 * - Adjusting device settings (dials, knobs)
 * - Activating mechanisms (wheels, cranks)
 * - Opening/closing valves
 * - General rotation feedback
 */

import { Action, ActionContext } from '../../enhanced-types';
import { SemanticEvent } from '@sharpee/core';
import { 
  TraitType, 
  TurnableTrait
} from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { TurnedEventData } from './turning-events';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';

export const turningAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.TURNING,
  requiredMessages: [
    'no_target',
    'not_visible',
    'not_reachable',
    'wearing_it',
    'cant_turn_that',
    'dial_turned',
    'dial_set',
    'dial_adjusted',
    'knob_turned',
    'knob_clicks',
    'knob_toggled',
    'wheel_turned',
    'crank_turned',
    'mechanism_grinds',
    'requires_more_turns',
    'mechanism_activated',
    'valve_opened',
    'valve_closed',
    'flow_changes',
    'key_needs_lock',
    'key_turned',
    'turned',
    'rotated',
    'spun',
    'nothing_happens'
  ],
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  },
  
  execute(context: ActionContext): SemanticEvent[] {
    const actor = context.player;
    const target = context.command.directObject?.entity;
    const direction = context.command.parsed.extras?.direction as string; // left, right, clockwise, etc.
    const setting = context.command.parsed.extras?.setting as string; // to specific value
    
    // Must have something to turn
    if (!target) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'no_target',
        reason: 'no_target'
      })];
    }
    
    // Scope validation is now handled by CommandValidator
    
    // Can't turn worn items
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
    
    // Check if object is turnable
    if (!target.has(TraitType.TURNABLE)) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'cant_turn_that',
        reason: 'cant_turn_that',
        params: { target: target.name }
      })];
    }
    
    // Get the turnable trait
    const turnable = target.get(TraitType.TURNABLE) as TurnableTrait;
    
    // Build event data
    const eventData: TurnedEventData = {
      target: target.id,
      targetName: target.name,
      direction: direction,
      setting: setting,
      turnType: turnable.turnType
    };
    
    const params: Record<string, any> = {
      target: target.name,
      direction: direction,
      setting: setting
    };
    
    let messageId: string = 'nothing_happens';
    
    // Handle turning based on turnable type
    switch (turnable.turnType) {
      case 'dial':
        if (setting && turnable.settings) {
          // Set to specific setting
          if (typeof turnable.settings[0] === 'string') {
            const stringSettings = turnable.settings as string[];
            const settingIndex = stringSettings.indexOf(setting);
            if (settingIndex !== -1) {
              eventData.previousSetting = turnable.currentSetting;
              eventData.newSetting = setting;
              messageId = 'dial_set';
            } else {
              // Invalid setting
              return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'cant_turn_that',
        reason: 'cant_turn_that',
        params: params
      })];
            }
          }
        } else if (direction && turnable.settings) {
          // Adjust by direction
          if (typeof turnable.settings[0] === 'string') {
            const stringSettings = turnable.settings as string[];
            const currentIndex = stringSettings.indexOf(turnable.currentSetting as string);
            const adjustment = (direction === 'right' || direction === 'clockwise') ? 1 : -1;
            const newIndex = Math.max(0, Math.min(stringSettings.length - 1, currentIndex + adjustment));
            
            eventData.previousSetting = turnable.currentSetting;
            eventData.newSetting = stringSettings[newIndex];
            eventData.adjustedBy = adjustment;
            messageId = 'dial_adjusted';
          } else if (typeof turnable.settings[0] === 'number') {
            const numSettings = turnable.settings as number[];
            const currentIndex = numSettings.indexOf(turnable.currentSetting as number);
            const adjustment = (direction === 'right' || direction === 'clockwise') ? 1 : -1;
            const newIndex = Math.max(0, Math.min(numSettings.length - 1, currentIndex + adjustment));
            
            eventData.previousSetting = turnable.currentSetting;
            eventData.newSetting = numSettings[newIndex];
            eventData.adjustedBy = adjustment;
            messageId = 'dial_adjusted';
          }
        } else if (direction && typeof turnable.currentSetting === 'number') {
          // Numeric adjustment
          const adjustment = (direction === 'right' || direction === 'clockwise') ? 
            (turnable.stepSize || 1) : -(turnable.stepSize || 1);
          const newValue = (turnable.currentSetting as number) + adjustment;
          
          // Apply min/max constraints
          const constrainedValue = Math.max(
            turnable.minValue ?? -Infinity,
            Math.min(turnable.maxValue ?? Infinity, newValue)
          );
          
          eventData.previousSetting = turnable.currentSetting;
          eventData.newSetting = constrainedValue;
          eventData.adjustedBy = adjustment;
          messageId = 'dial_adjusted';
        } else {
          messageId = 'dial_turned';
        }
        break;
        
      case 'knob':
        // Check if knob controls a switchable device
        if (target.has(TraitType.SWITCHABLE)) {
          const switchable = target.get(TraitType.SWITCHABLE) as { isOn?: boolean };
          eventData.willToggle = true;
          eventData.currentState = switchable.isOn;
          eventData.newState = !switchable.isOn;
          params.newState = switchable.isOn ? 'off' : 'on';
          messageId = 'knob_toggled';
        } else if (turnable.settings) {
          // Knob with settings
          messageId = 'knob_clicks';
          eventData.clicked = true;
        } else {
          messageId = 'knob_turned';
        }
        break;
        
      case 'wheel':
        // Wheels might require multiple turns
        if (turnable.turnsRequired && turnable.turnsRequired > 1) {
          const turnsMade = (turnable.turnsMade || 0) + 1;
          eventData.turnsMade = turnsMade;
          eventData.turnsRequired = turnable.turnsRequired;
          
          if (turnsMade >= turnable.turnsRequired) {
            eventData.mechanismActivated = true;
            messageId = 'mechanism_activated';
            
            // Reset turns if not continuous
            if (!turnable.springLoaded) {
              eventData.turnsReset = true;
            }
          } else {
            eventData.mechanismActivated = false;
            eventData.turnsRemaining = turnable.turnsRequired - turnsMade;
            messageId = 'requires_more_turns';
          }
        } else {
          // Single turn activation
          eventData.mechanismActivated = true;
          messageId = 'wheel_turned';
        }
        
        // Add activation data if configured
        if (turnable.activates) {
          eventData.activatesId = turnable.activates;
        }
        break;
        
      case 'crank':
        // Cranks typically need continuous turning
        eventData.requiresContinuous = true;
        
        if (turnable.turnsRequired) {
          const turnsMade = (turnable.turnsMade || 0) + 1;
          eventData.turnsMade = turnsMade;
          eventData.turnsRequired = turnable.turnsRequired;
          
          if (turnsMade >= turnable.turnsRequired) {
            eventData.mechanismActivated = true;
            messageId = 'mechanism_activated';
          } else {
            messageId = 'mechanism_grinds';
          }
        } else {
          messageId = 'mechanism_grinds';
        }
        
        if (turnable.activates) {
          eventData.activatesId = turnable.activates;
        }
        break;
        
      case 'valve':
        // Valves control flow based on direction
        if (turnable.bidirectional && direction) {
          const opening = (direction === 'left' || direction === 'counterclockwise');
          eventData.opens = opening;
          eventData.flowChanged = true;
          messageId = opening ? 'valve_opened' : 'valve_closed';
          
          // Check if valve has specific settings
          if (turnable.settings && typeof turnable.settings[0] === 'string') {
            const stringSettings = turnable.settings as string[];
            const currentIndex = stringSettings.indexOf(turnable.currentSetting as string);
            if (currentIndex !== -1) {
              const newIndex = opening ? 
                Math.min(stringSettings.length - 1, currentIndex + 1) :
                Math.max(0, currentIndex - 1);
              eventData.previousSetting = turnable.currentSetting;
              eventData.newSetting = stringSettings[newIndex];
            }
          }
        } else {
          messageId = 'flow_changes';
          eventData.flowChanged = true;
        }
        break;
    }
    
    // Check if turnable is jammed
    if (turnable.jammed) {
      eventData.jammed = true;
      messageId = 'cant_turn_that';
    }
    
    // Add success indicators
    eventData.turned = true;
    
    // Handle custom effects
    if (turnable.effects) {
      if (turnable.effects.onTurn) {
        eventData.customEffect = turnable.effects.onTurn;
      }
      
      if (turnable.effects.onComplete && eventData.mechanismActivated) {
        eventData.completionEffect = turnable.effects.onComplete;
      }
      
      if (turnable.effects.onSettingChange && eventData.newSetting !== undefined) {
        eventData.settingChangeEffect = turnable.effects.onSettingChange;
      }
    }
    
    // Handle turn sound
    if (turnable.turnSound) {
      eventData.sound = turnable.turnSound;
    }
    
    // Use verb-specific messages for generic turns
    if (messageId === 'nothing_happens' || messageId === 'turned' || 
        messageId === 'knob_turned' || messageId === 'wheel_turned' || 
        messageId === 'crank_turned' || messageId === 'turnable_handled') {
      const verb = context.command.parsed.structure.verb?.text.toLowerCase() || 'turn';
      switch (verb) {
        case 'rotate':
          messageId = 'rotated';
          break;
        case 'spin':
          messageId = 'spun';
          break;
        case 'twist':
          messageId = 'twisted';
          break;
        default:
          // Keep the original message
          break;
      }
    }
    
    // Create events
    const events: SemanticEvent[] = [];
    
    // Create the TURNED event for world model
    events.push(context.event('if.event.turned', eventData));
    
    // Add success message
    events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId: messageId,
        params: params
      }));
    
    return events;
  },
  
  group: "device_manipulation"
};
