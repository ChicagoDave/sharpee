/**
 * Touching Moon action - activate Blood of Moon invisibility
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { SemanticEvent } from '@sharpee/core';
import { BloodMoonTrait, BloodMoonBehavior } from '../../traits';
import { BloodActions } from '../constants';
import { TouchedMoonEventData } from './touchingMoon-events';
import { ActionMetadata } from '@sharpee/stdlib';

export const touchingMoonAction: Action & { metadata: ActionMetadata } = {
  id: BloodActions.TOUCHING_MOON,
  requiredMessages: [
    'no_moon_blood',
    'already_invisible',
    'became_invisible',
    'moon_blood_inactive'
  ],
  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false
  },
  group: 'moon_abilities',
  
  /**
   * Validate whether the touch moon action can be executed
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
    
    if (!moonTrait.active) {
      return { 
        valid: false, 
        error: 'moon_blood_inactive'
      };
    }
    
    if (moonTrait.invisible) {
      return { 
        valid: false, 
        error: 'already_invisible'
      };
    }
    
    return { valid: true };
  },
  
  /**
   * Execute the touch moon action
   */
  execute(context: ActionContext): SemanticEvent[] {
    const events: SemanticEvent[] = [];
    const actor = context.actor;
    
    // Activate invisibility
    BloodMoonBehavior.becomeInvisible(actor);
    
    // Create invisibility event
    events.push({
      id: 'blood.event.became_invisible',
      type: 'blood.event.became_invisible',
      timestamp: Date.now(),
      data: {
        actorId: actor.id,
        message: 'became_invisible'
      } as TouchedMoonEventData
    });
    
    // Notify scope system of invisibility change
    events.push({
      id: 'blood.event.invisibility_changed',
      type: 'blood.event.invisibility_changed',
      timestamp: Date.now(),
      data: {
        entityId: actor.id,
        invisible: true
      }
    });
    
    return events;
  }
};