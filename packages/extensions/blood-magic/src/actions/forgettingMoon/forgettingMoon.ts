/**
 * Forgetting Moon action - deactivate Blood of Moon invisibility
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { SemanticEvent } from '@sharpee/core';
import { BloodMoonTrait, BloodMoonBehavior } from '../../traits';
import { BloodActions } from '../constants';
import { ForgotMoonEventData } from './forgettingMoon-events';
import { ActionMetadata } from '@sharpee/stdlib';

export const forgettingMoonAction: Action & { metadata: ActionMetadata } = {
  id: BloodActions.FORGETTING_MOON,
  requiredMessages: [
    'no_moon_blood',
    'not_invisible',
    'became_visible'
  ],
  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false
  },
  group: 'moon_abilities',
  
  /**
   * Validate whether the forget moon action can be executed
   */
  validate(context: ActionContext): ValidationResult {
    const actor = context.actor;
    const moonTrait = actor.getTrait<BloodMoonTrait>('bloodMoon');
    
    if (!moonTrait) {
      return { 
        valid: false, 
        error: 'no_moon_blood'
      };
    }
    
    if (!moonTrait.invisible) {
      return { 
        valid: false, 
        error: 'not_invisible'
      };
    }
    
    return { valid: true };
  },
  
  /**
   * Execute the forget moon action
   */
  execute(context: ActionContext): SemanticEvent[] {
    const events: SemanticEvent[] = [];
    const actor = context.actor;
    
    // Deactivate invisibility
    BloodMoonBehavior.becomeVisible(actor);
    
    // Create visibility event
    events.push({
      id: 'blood.event.became_visible',
      type: 'blood.event.became_visible',
      timestamp: Date.now(),
      data: {
        actorId: actor.id,
        message: 'became_visible'
      } as ForgotMoonEventData
    });
    
    // Notify scope system of invisibility change
    events.push({
      id: 'blood.event.invisibility_changed',
      type: 'blood.event.invisibility_changed',
      timestamp: Date.now(),
      data: {
        entityId: actor.id,
        invisible: false
      }
    });
    
    return events;
  }
};