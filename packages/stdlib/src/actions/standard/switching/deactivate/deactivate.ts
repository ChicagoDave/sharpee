/**
 * Deactivate action - turns off devices and lights (semantic intent for switching_off)
 * 
 * This action validates conditions for switching something off and returns
 * appropriate events. It delegates state changes to SwitchableBehavior.
 */

import { ActionContext, ValidationResult } from '../../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, SwitchableBehavior } from '@sharpee/world-model';
import { IFActions } from '../../../constants';
import { SwitchingBaseAction } from '../switching-base';
import { DeactivatedEventData } from './deactivate-events';

export class DeactivateAction extends SwitchingBaseAction {
  readonly id = IFActions.SWITCHING_OFF; // Maps to existing constant
  
  readonly requiredMessages = [
    'no_target',
    'not_visible',
    'not_reachable',
    'not_switchable',
    'already_off',
    'switched_off',
    'light_off',
    'light_off_still_lit',
    'device_stops',
    'was_temporary',
    'silence_falls',
    'with_sound',
    'door_closes'
  ];
  
  validate(context: ActionContext): ValidationResult {
    // Use base validation first
    const baseResult = this.validateBase(context);
    if (!baseResult.valid) {
      return baseResult;
    }
    
    const noun = context.command.directObject!.entity!;
    
    // Check if can switch off
    if (!SwitchableBehavior.canSwitchOff(noun)) {
      const switchable = noun.get(TraitType.SWITCHABLE) as any;
      if (!switchable.isOn) {
        return { 
          valid: false, 
          error: 'already_off', 
          params: { target: noun.name } 
        };
      }
    }
    
    return { valid: true };
  }
  
  execute(context: ActionContext): ISemanticEvent[] {
    const noun = context.command.directObject!.entity!;
    
    // Store state before switching for message determination
    const switchable = noun.get(TraitType.SWITCHABLE) as any;
    const hadRunningSound = switchable.isOn ? switchable.runningSound : undefined;
    const wasTemporary = switchable.autoOffTime && switchable.autoOffTime > 0;
    
    // Delegate state change to behavior
    const result = SwitchableBehavior.switchOff(noun);
    
    // Handle failure cases (defensive checks)
    if (!result.success) {
      if (result.wasOff) {
        return [context.event('action.error', {
          actionId: this.id,
          messageId: 'already_off',
          reason: 'already_off',
          params: { target: noun.name }
        })];
      }
      // Shouldn't happen if validate worked
      return [context.event('action.error', {
        actionId: this.id,
        messageId: 'not_switchable',
        reason: 'not_switchable',
        params: { target: noun.name }
      })];
    }
    
    // Analyze the switching context for message determination
    const analysis = this.analyzeSwitchingContext(context, noun);
    
    // Build simple event data
    const eventData: DeactivatedEventData = {
      target: noun.id,
      targetName: noun.name
    };
    
    // Build params for message
    const params: Record<string, any> = {
      target: noun.name
    };
    
    // Determine appropriate message based on state
    const messageId = this.determineSwitchingMessage(
      false, // isOff
      analysis,
      undefined, // no sound info
      wasTemporary,
      hadRunningSound,
      false // no door effects
    );
    
    // Create events
    const events: ISemanticEvent[] = [];
    
    // Create the SWITCHED_OFF event for world model
    events.push(context.event('if.event.switched_off', eventData));
    
    // Add success message
    events.push(context.event('action.success', {
      actionId: this.id,
      messageId: messageId,
      params: params
    }));
    
    return events;
  }
}

// Export as singleton instance for backward compatibility
export const deactivateAction = new DeactivateAction();