/**
 * Switching off action - turns off devices and lights
 * 
 * This action validates conditions for switching something off and returns
 * appropriate events. It NEVER mutates state directly.
 */

import { Action, EnhancedActionContext } from '../../enhanced-types';
import { SemanticEvent } from '@sharpee/core';
import { TraitType } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { SwitchedOffEventData } from './switching_off-events';

export const switchingOffAction: Action = {
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
  
  execute(context: EnhancedActionContext): SemanticEvent[] {
    const actor = context.player;
    const noun = context.command.directObject?.entity;
    
    // Validate we have a target
    if (!noun) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'no_target',
        reason: 'no_target'
      })];
    }
    
    // Check if visible
    if (!context.canSee(noun)) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'not_visible',
        reason: 'not_visible',
        params: { target: noun.name }
      })];
    }
    
    // Check if reachable
    if (!context.canReach(noun)) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'not_reachable',
        reason: 'not_reachable',
        params: { target: noun.name }
      })];
    }
    
    // Check if it's switchable
    if (!noun.has(TraitType.SWITCHABLE)) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'not_switchable',
        reason: 'not_switchable',
        params: { target: noun.name }
      })];
    }
    
    const switchableTrait = noun.get(TraitType.SWITCHABLE);
    const switchableData = switchableTrait as any;
    
    // Check if already off
    if (!switchableData.isOn) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'already_off',
        reason: 'already_off',
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
    if (switchableData.offSound) {
      eventData.sound = switchableData.offSound;
      params.sound = switchableData.offSound;
      messageId = 'with_sound';
    } else if (switchableData.runningSound) {
      eventData.stoppedSound = switchableData.runningSound;
      messageId = 'silence_falls';
    } else if (!eventData.isLightSource) {
      // Non-light devices might power down
      messageId = 'device_stops';
    }
    
    // Check if this was temporary
    if (switchableData.autoOffCounter) {
      eventData.wasTemporary = true;
      eventData.remainingTime = switchableData.autoOffCounter;
      params.remainingTime = switchableData.autoOffCounter;
      messageId = 'was_temporary';
    }
    
    if (switchableData.powerConsumption) {
      eventData.powerFreed = switchableData.powerConsumption;
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
  
  group: "device_manipulation"
};
