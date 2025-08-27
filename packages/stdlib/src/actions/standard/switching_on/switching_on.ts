/**
 * Switching on action - turns on devices and lights
 * 
 * This action validates conditions for switching something on and returns
 * appropriate events. It delegates state changes to SwitchableBehavior.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, SwitchableBehavior } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ScopeLevel } from '../../../scope';
import { SwitchedOnEventData } from './switching_on-events';
import { analyzeSwitchingContext, determineSwitchingMessage } from '../switching-shared';

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
  
  execute(context: ActionContext): ISemanticEvent[] {
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
    
    // Analyze the switching context
    const analysis = analyzeSwitchingContext(context, noun);
    
    // Build event data
    const eventData: SwitchedOnEventData = {
      target: noun.id,
      targetName: noun.name
    };
    
    const params: Record<string, any> = {
      target: noun.name
    };
    
    // Add light source data if applicable
    if (analysis.isLightSource) {
      eventData.isLightSource = true;
      eventData.lightRadius = analysis.lightRadius;
      eventData.lightIntensity = analysis.lightIntensity;
      
      if (analysis.isInSameRoom && analysis.willAffectDarkness) {
        eventData.willIlluminateLocation = true;
      }
    }
    
    // Check for temporary activation
    if (result.autoOffTime && result.autoOffTime > 0) {
      eventData.autoOffTime = result.autoOffTime;
      eventData.temporary = true;
    }
    
    // Add power and sound data
    if (result.powerConsumption) {
      eventData.powerConsumption = result.powerConsumption;
    }
    
    if (result.runningSound) {
      eventData.continuousSound = result.runningSound;
    }
    
    if (result.onSound) {
      eventData.sound = result.onSound;
      params.sound = result.onSound;
    }
    
    // Check for side effects
    let willOpen = false;
    if (noun.has(TraitType.CONTAINER) && noun.has(TraitType.OPENABLE)) {
      const openableTrait = noun.get(TraitType.OPENABLE) as any;
      if (!openableTrait.isOpen) {
        eventData.willOpen = true;
        willOpen = true;
      }
    }
    
    // Determine appropriate message
    const messageId = determineSwitchingMessage(
      true, // isOn
      analysis,
      result.onSound,
      !!(result.autoOffTime && result.autoOffTime > 0),
      undefined, // no running sound when turning on
      willOpen
    );
    
    // Create events
    const events: ISemanticEvent[] = [];
    
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