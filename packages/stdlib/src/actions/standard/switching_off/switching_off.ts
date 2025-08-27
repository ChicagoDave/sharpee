/**
 * Switching off action - turns off devices and lights
 * 
 * This action validates conditions for switching something off and returns
 * appropriate events. It delegates state changes to SwitchableBehavior.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, SwitchableBehavior } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ScopeLevel } from '../../../scope';
import { SwitchedOffEventData } from './switching_off-events';
import { analyzeSwitchingContext, determineSwitchingMessage } from '../switching-shared';

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
  
  execute(context: ActionContext): ISemanticEvent[] {
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
    
    // Analyze the switching context
    const analysis = analyzeSwitchingContext(context, noun);
    
    // Build event data
    const eventData: SwitchedOffEventData = {
      target: noun.id,
      targetName: noun.name
    };
    
    const params: Record<string, any> = {
      target: noun.name
    };
    
    // Add light source data if applicable
    if (analysis.isLightSource) {
      eventData.isLightSource = true;
      
      if (analysis.isInSameRoom && analysis.willAffectDarkness) {
        eventData.willDarkenLocation = true;
      }
    }
    
    // Add temporary and power data
    if (hadAutoOff) {
      eventData.wasTemporary = true;
      eventData.remainingTime = remainingTime;
      params.remainingTime = remainingTime;
    }
    
    if (powerConsumption) {
      eventData.powerFreed = powerConsumption;
    }
    
    if (result.offSound) {
      eventData.sound = result.offSound;
      params.sound = result.offSound;
    } else if (hadRunningSound) {
      eventData.stoppedSound = hadRunningSound;
    }
    
    // Check for side effects
    let willClose = false;
    if (noun.has(TraitType.CONTAINER) && noun.has(TraitType.OPENABLE)) {
      const openableTrait = noun.get(TraitType.OPENABLE) as any;
      if (openableTrait.isOpen && openableTrait.autoCloseOnOff) {
        eventData.willClose = true;
        willClose = true;
      }
    }
    
    // Determine appropriate message
    const messageId = determineSwitchingMessage(
      false, // isOn = false
      analysis,
      result.offSound,
      hadAutoOff,
      hadRunningSound,
      willClose
    );
    
    // Create events
    const events: ISemanticEvent[] = [];
    
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