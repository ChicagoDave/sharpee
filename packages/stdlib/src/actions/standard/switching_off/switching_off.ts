/**
 * Switching off action - turns off devices and lights
 * 
 * This action validates conditions for switching something off and returns
 * appropriate events. It delegates state changes to SwitchableBehavior.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { SemanticEvent } from '@sharpee/core';
import { TraitType, SwitchableBehavior } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ScopeLevel } from '../../../scope';
import { SwitchedOffEventData } from './switching_off-events';

export const switchingOffAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.SWITCHING_OFF,
  requiredMessages: [
    'no_target',
    'not_visible',
    'not_reachable',
    'not_switchable',
    'already_off',
    'switched_off',
    'light_off',
    'light_off_still_lit',
    'device_stops',
    'silence_falls',
    'with_sound',
    'door_closes',
    'was_temporary'
  ],
  
  validate(context: ActionContext): ValidationResult {
    const noun = context.command.directObject?.entity;
    
    if (!noun) {
      return { valid: false, error: 'no_target' };
    }
    
    if (!noun.has(TraitType.SWITCHABLE)) {
      return { valid: false, error: 'not_switchable', params: { target: noun.name } };
    }
    
    if (!SwitchableBehavior.canSwitchOff(noun)) {
      return { valid: false, error: 'already_off', params: { target: noun.name } };
    }
    
    return { valid: true };
  },
  
  execute(context: ActionContext): SemanticEvent[] {
    const actor = context.player;
    const noun = context.command.directObject?.entity!;
    
    // Get the switchable data before turning off for checking state
    const switchableTrait = noun.get(TraitType.SWITCHABLE);
    const switchableData = switchableTrait as any;
    const hadAutoOff = switchableData.autoOffCounter > 0;
    const remainingTime = switchableData.autoOffCounter;
    const hadRunningSound = switchableData.runningSound;
    const powerConsumption = switchableData.powerConsumption;
    
    // Delegate state change to behavior
    const result = SwitchableBehavior.switchOff(noun);
    
    // Handle failure cases (defensive checks)
    if (!result.success) {
      if (result.wasOff) {
        return [context.event('action.error', {
          actionId: context.action.id,
          messageId: 'already_off',
          reason: 'already_off',
          params: { target: noun.name }
        })];
      }
      // Shouldn't happen if validate worked
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'not_switchable',
        reason: 'not_switchable',
        params: { target: noun.name }
      })];
    }
    
    // Build event data
    const eventData: SwitchedOffEventData = {
      target: noun.id,
      targetName: noun.name
    };
    
    const params: Record<string, any> = {
      target: noun.name
    };
    
    // Determine appropriate message based on device type and effects
    let messageId = 'switched_off';
    
    // Add information about what type of device was switched off
    if (noun.has(TraitType.LIGHT_SOURCE)) {
      eventData.isLightSource = true;
      
      // Check if this will darken the room
      const actorRoom = context.world.getContainingRoom(actor.id);
      const deviceRoom = context.world.getContainingRoom(noun.id);
      const deviceLocation = context.world.getLocation?.(noun.id);
      
      if (actorRoom && deviceRoom && actorRoom.id === deviceRoom.id) {
        // Need to check if there are other light sources in the room
        const roomContents = context.world.getContents(actorRoom.id);
        const otherLights = roomContents.filter(item => 
          item.id !== noun.id && 
          item.has(TraitType.LIGHT_SOURCE) && 
          item.has(TraitType.SWITCHABLE) &&
          (item.get(TraitType.SWITCHABLE) as any).isOn
        );
        
        // Also check if player is carrying other lights
        const carriedItems = context.world.getContents(actor.id);
        const carriedLights = carriedItems.filter(item =>
          item.id !== noun.id &&
          item.has(TraitType.LIGHT_SOURCE) &&
          item.has(TraitType.SWITCHABLE) &&
          (item.get(TraitType.SWITCHABLE) as any).isOn
        );
        
        if (otherLights.length === 0 && carriedLights.length === 0) {
          eventData.willDarkenLocation = true;
          messageId = 'light_off';
        } else {
          messageId = 'light_off_still_lit';
        }
      }
    }
    
    // Check for special sounds
    if (result.offSound) {
      eventData.sound = result.offSound;
      params.sound = result.offSound;
      messageId = 'with_sound';
    } else if (hadRunningSound) {
      eventData.stoppedSound = hadRunningSound;
      messageId = 'silence_falls';
    } else if (!eventData.isLightSource) {
      // Non-light devices might power down
      messageId = 'device_stops';
    }
    
    // Check if this was temporary
    if (hadAutoOff) {
      eventData.wasTemporary = true;
      eventData.remainingTime = remainingTime; // Use the value we saved before turning off
      params.remainingTime = remainingTime;
      messageId = 'was_temporary';
    }
    
    // Include power freed if device consumed power
    if (powerConsumption) {
      eventData.powerFreed = powerConsumption;
    }
    
    // Check for side effects
    if (noun.has(TraitType.CONTAINER) && noun.has(TraitType.OPENABLE)) {
      // Some devices might close when turned off (e.g., automatic doors)
      const openableTrait = noun.get(TraitType.OPENABLE) as any;
      if (openableTrait.isOpen && openableTrait.autoCloseOnOff) {
        eventData.willClose = true;
        messageId = 'door_closes';
      }
    }
    
    // Create events
    const events: SemanticEvent[] = [];
    
    // Create the SWITCHED_OFF event for world model
    events.push(context.event('if.event.switched_off', eventData));
    
    // Add success message
    events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId: messageId,
        params: params
      }));
    
    return events;
  },
  
  group: "device_manipulation",
  
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  }
};
