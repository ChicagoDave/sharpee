/**
 * Forgetting Moon action - deactivate Blood of Moon invisibility
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
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
    const actor = context.world.getPlayer();
    const moonTrait = actor?.getTrait<BloodMoonTrait>('bloodMoon');
    
    if (!moonTrait) {
      return { 
        valid: false, 
        error: 'no_moon_blood'
      };
    }
    
    if (!moonTrait.isInvisible) {
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
  execute(context: ActionContext): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];
    const actor = context.world.getPlayer();
    if (!actor) return [];
    
    // Deactivate invisibility
    BloodMoonBehavior.becomeVisible(actor);
    
    // Create visibility event
    events.push({
      id: `blood.became_visible.${Date.now()}`,
      type: 'blood.event.became_visible',
      timestamp: Date.now(),
      entities: { actor: actor.id },
      data: {
        actorId: actor.id,
        message: 'became_visible'
      } as ForgotMoonEventData
    });
    
    // Notify scope system of invisibility change
    events.push({
      id: `blood.invisibility_changed.${Date.now()}`,
      type: 'blood.event.invisibility_changed',
      timestamp: Date.now(),
      entities: { actor: actor.id },
      data: {
        entityId: actor.id,
        invisible: false
      }
    });
    
    return events;
  }
};