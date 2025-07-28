/**
 * Switching on action - turns on devices and lights
 * 
 * This action validates conditions for switching something on and returns
 * appropriate events. It NEVER mutates state directly.
 */

import { Action, EnhancedActionContext } from '../../enhanced-types';
import { SemanticEvent } from '@sharpee/core';
import { TraitType } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { SwitchedOnEventData } from './switching_on-events';

export const switchingOnAction: Action = {
  id: IFActions.SWITCHING_ON,
  requiredMessages: [
    'no_target',
    'not_visible',
    'not_reachable',
    'not_switchable',
    'already_on',
    'no_power',
    'switched_on',
    'light_on',
    'device_humming',
    'temporary_activation',
    'with_sound',
    'door_opens',
    'illuminates_darkness'
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
    
    // Check if already on
    if (switchableData.isOn) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'already_on',
        reason: 'already_on',
        params: { target: noun.name }
      })];
    }
    
    // Check power requirements
    if (switchableData.requiresPower && !switchableData.hasPower) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'no_power',
        reason: 'no_power',
        params: { target: noun.name }
      })];
    }
    
    // Build event data
    const eventData: SwitchedOnEventData = {
      target: noun.id,
      targetName: noun.name
    };
    
    const params: Record<string, any> = {
      target: noun.name
    };
    
    // Determine appropriate message based on device type and effects
    let messageId = 'switched_on';
    
    // Add information about what type of device was switched on
    if (noun.has(TraitType.LIGHT_SOURCE)) {
      eventData.isLightSource = true;
      const lightTrait = noun.get(TraitType.LIGHT_SOURCE) as any;
      eventData.lightRadius = lightTrait.radius || 1;
      eventData.lightIntensity = lightTrait.intensity || 'normal';
      
      // Check if this will illuminate the room
      const actorRoom = context.world.getContainingRoom(actor.id);
      const deviceRoom = context.world.getContainingRoom(noun.id);
      const deviceLocation = context.world.getLocation?.(noun.id);
      
      if (actorRoom && deviceRoom && actorRoom.id === deviceRoom.id) {
        eventData.willIlluminateLocation = true;
        
        // Check if the room was dark
        const roomContents = context.world.getContents(actorRoom.id);
        const otherLights = roomContents.filter(item => 
          item.id !== noun.id && 
          item.has(TraitType.LIGHT_SOURCE) && 
          item.has(TraitType.SWITCHABLE) &&
          (item.get(TraitType.SWITCHABLE) as any).isOn
        );
        
        if (otherLights.length === 0) {
          messageId = 'illuminates_darkness';
        } else {
          messageId = 'light_on';
        }
      }
    }
    
    // Check for special sounds
    if (switchableData.onSound) {
      eventData.sound = switchableData.onSound;
      params.sound = switchableData.onSound;
      messageId = 'with_sound';
    } else if (!eventData.isLightSource) {
      // Non-light devices might hum
      messageId = 'device_humming';
    }
    
    // Check for temporary activation
    if (switchableData.autoOffTime > 0) {
      eventData.autoOffTime = switchableData.autoOffTime;
      eventData.temporary = true;
      messageId = 'temporary_activation';
    }
    
    if (switchableData.powerConsumption) {
      eventData.powerConsumption = switchableData.powerConsumption;
    }
    
    if (switchableData.runningSound) {
      eventData.continuousSound = switchableData.runningSound;
    }
    
    // Check for side effects
    if (noun.has(TraitType.CONTAINER) && noun.has(TraitType.OPENABLE)) {
      // Some devices might open when turned on (e.g., automatic doors)
      const openableTrait = noun.get(TraitType.OPENABLE) as any;
      if (!openableTrait.isOpen) {
        eventData.willOpen = true;
        messageId = 'door_opens';
      }
    }
    
    // Create events
    const events: SemanticEvent[] = [];
    
    // Create the SWITCHED_ON event for world model
    events.push(context.event('if.event.switched_on', eventData));
    
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
