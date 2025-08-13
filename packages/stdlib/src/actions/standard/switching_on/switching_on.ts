/**
 * Switching on action - turns on devices and lights
 * 
 * This action validates conditions for switching something on and returns
 * appropriate events. It delegates state changes to SwitchableBehavior.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { SemanticEvent } from '@sharpee/core';
import { TraitType, SwitchableBehavior } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ScopeLevel } from '../../../scope';
import { SwitchedOnEventData } from './switching_on-events';

export const switchingOnAction: Action & { metadata: ActionMetadata } = {
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
  
  validate(context: ActionContext): ValidationResult {
    const noun = context.command.directObject?.entity;
    
    if (!noun) {
      return { valid: false, error: 'no_target' };
    }
    
    if (!noun.has(TraitType.SWITCHABLE)) {
      return { valid: false, error: 'not_switchable', params: { target: noun.name } };
    }
    
    if (!SwitchableBehavior.canSwitchOn(noun)) {
      const switchable = noun.get(TraitType.SWITCHABLE) as any;
      if (switchable.isOn) {
        return { valid: false, error: 'already_on', params: { target: noun.name } };
      }
      if (switchable.requiresPower && !switchable.hasPower) {
        return { valid: false, error: 'no_power', params: { target: noun.name } };
      }
    }
    
    return { valid: true };
  },
  
  execute(context: ActionContext): SemanticEvent[] {
    const actor = context.player;
    const noun = context.command.directObject?.entity!;
    
    // Delegate state change to behavior
    const result = SwitchableBehavior.switchOn(noun);
    
    // Handle failure cases (defensive checks)
    if (!result.success) {
      if (result.wasOn) {
        return [context.event('action.error', {
          actionId: context.action.id,
          messageId: 'already_on',
          reason: 'already_on',
          params: { target: noun.name }
        })];
      }
      if (result.noPower) {
        return [context.event('action.error', {
          actionId: context.action.id,
          messageId: 'no_power',
          reason: 'no_power',
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
    if (!eventData.isLightSource) {
      // Non-light devices might hum
      messageId = 'device_humming';
    }
    
    // Check for temporary activation
    if (result.autoOffTime && result.autoOffTime > 0) {
      eventData.autoOffTime = result.autoOffTime;
      eventData.temporary = true;
      messageId = 'temporary_activation';
    }
    
    if (result.powerConsumption) {
      eventData.powerConsumption = result.powerConsumption;
    }
    
    if (result.runningSound) {
      eventData.continuousSound = result.runningSound;
    }
    
    // Add any custom sounds
    if (result.onSound) {
      eventData.sound = result.onSound;
      params.sound = result.onSound;
      if (!eventData.isLightSource) {
        messageId = 'with_sound';
      }
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
  
  group: "device_manipulation",
  
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  }
};
