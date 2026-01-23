/**
 * Touching Moon action - activate Blood of Moon invisibility
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
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
    const actor = context.world.getPlayer();
    const moonTrait = actor?.getTrait<BloodMoonTrait>('bloodMoon');
    
    if (!moonTrait) {
      return { 
        valid: false, 
        error: 'no_moon_blood'
      };
    }
    
    // Moon trait doesn't have active property - just having it is enough
    
    if (moonTrait.isInvisible) {
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
  execute(context: ActionContext): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];
    const actor = context.world.getPlayer();
    if (!actor) return [];
    
    // Activate invisibility
    BloodMoonBehavior.becomeInvisible(actor);
    
    // Create invisibility event
    events.push({
      id: `blood.became_invisible.${Date.now()}`,
      type: 'blood.event.became_invisible',
      timestamp: Date.now(),
      entities: { actor: actor.id },
      data: {
        actorId: actor.id,
        message: 'became_invisible'
      } as TouchedMoonEventData
    });
    
    // Notify scope system of invisibility change
    events.push({
      id: `blood.invisibility_changed.${Date.now()}`,
      type: 'blood.event.invisibility_changed',
      timestamp: Date.now(),
      entities: { actor: actor.id },
      data: {
        entityId: actor.id,
        invisible: true
      }
    });
    
    return events;
  }
};