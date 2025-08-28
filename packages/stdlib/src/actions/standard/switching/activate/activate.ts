/**
 * Activate action - turns on devices and lights (semantic intent for switching_on)
 * 
 * This action validates conditions for switching something on and returns
 * appropriate events. It delegates state changes to SwitchableBehavior.
 */

import { ActionContext, ValidationResult } from '../../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, SwitchableBehavior } from '@sharpee/world-model';
import { IFActions } from '../../../constants';
import { SwitchingBaseAction } from '../switching-base';
import { ActivatedEventData } from './activate-events';

export class ActivateAction extends SwitchingBaseAction {
  readonly id = IFActions.SWITCHING_ON; // Maps to existing constant
  
  readonly requiredMessages = [
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
  ];
  
  validate(context: ActionContext): ValidationResult {
    // Use base validation first
    const baseResult = this.validateBase(context);
    if (!baseResult.valid) {
      return baseResult;
    }
    
    const noun = context.command.directObject!.entity!;
    
    // Check if can switch on
    if (!SwitchableBehavior.canSwitchOn(noun)) {
      const switchable = noun.get(TraitType.SWITCHABLE) as any;
      if (switchable.isOn) {
        return { 
          valid: false, 
          error: 'already_on', 
          params: { target: noun.name } 
        };
      }
      if (switchable.requiresPower && !switchable.hasPower) {
        return { 
          valid: false, 
          error: 'no_power', 
          params: { target: noun.name } 
        };
      }
    }
    
    return { valid: true };
  }
  
  execute(context: ActionContext): ISemanticEvent[] {
    const noun = context.command.directObject!.entity!;
    
    // Delegate state change to behavior
    const result = SwitchableBehavior.switchOn(noun);
    
    // Handle failure cases (defensive checks)
    if (!result.success) {
      if (result.wasOn) {
        return [context.event('action.error', {
          actionId: this.id,
          messageId: 'already_on',
          reason: 'already_on',
          params: { target: noun.name }
        })];
      }
      if (result.noPower) {
        return [context.event('action.error', {
          actionId: this.id,
          messageId: 'no_power',
          reason: 'no_power',
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
    const eventData: ActivatedEventData = {
      target: noun.id,
      targetName: noun.name
    };
    
    // Build params for message
    const params: Record<string, any> = {
      target: noun.name
    };
    
    // Determine appropriate message based on current state
    const messageId = this.determineSwitchingMessage(
      true, // isOn
      analysis,
      undefined, // no sound info
      false, // no temp info
      undefined, // no running sound
      false // no door effects
    );
    
    // Create events
    const events: ISemanticEvent[] = [];
    
    // Create the SWITCHED_ON event for world model
    events.push(context.event('if.event.switched_on', eventData));
    
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
export const activateAction = new ActivateAction();