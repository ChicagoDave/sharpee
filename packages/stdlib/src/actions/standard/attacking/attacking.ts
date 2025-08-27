/**
 * Attacking action - hostile action against NPCs or objects
 * 
 * This action handles combat or destructive actions.
 * It's deliberately simple - games can extend with combat systems.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { AttackedEventData } from './attacking-events';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';

export const attackingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.ATTACKING,
  group: "interaction",
  
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  },

  requiredMessages: [
    'no_target',
    'not_visible',
    'not_reachable',
    'self',
    'not_holding_weapon',
    'attacked',
    'attacked_with',
    'hit',
    'hit_with',
    'struck',
    'struck_with',
    'punched',
    'kicked',
    'unarmed_attack',
    'defends',
    'dodges',
    'retaliates',
    'flees',
    'peaceful_solution',
    'unnecessary_violence'
  ],

  validate(context: ActionContext): ValidationResult {
    const actor = context.player;
    const target = context.command.directObject?.entity;
    const weapon = context.command.indirectObject?.entity;
    
    // Must have a target
    if (!target) {
      return { valid: false, error: 'no_target' };
    }
    
    // Check if target is visible
    if (!context.canSee(target)) {
      return { valid: false, error: 'not_visible', params: { target: target.name } };
    }
    
    // Check if target is reachable
    if (!context.canReach(target)) {
      return { valid: false, error: 'not_reachable', params: { target: target.name } };
    }
    
    // Prevent attacking self
    if (target.id === actor.id) {
      return { valid: false, error: 'self' };
    }
    
    // Check if using a weapon
    if (weapon) {
      // Check if holding the weapon
      const weaponLocation = context.world.getLocation(weapon.id);
      if (weaponLocation !== actor.id) {
        return { valid: false, error: 'not_holding_weapon', params: { weapon: weapon.name } };
      }
    }
    
    // Peaceful games might discourage violence
    if ((context as any).world.isPeaceful) {
      return { valid: false, error: 'peaceful_solution' };
    }
    
    return { valid: true };
  },
  
  execute(context: ActionContext): ISemanticEvent[] {
    const target = context.command.directObject!.entity!;
    const weapon = context.command.indirectObject?.entity;
    const verb = context.command.parsed.action || 'attack';
    
    const events: ISemanticEvent[] = [];
    
    // Build event data
    const eventData: AttackedEventData = {
      target: target.id,
      targetName: target.name,
      weapon: weapon?.id,
      weaponName: weapon?.name,
      unarmed: !weapon
    };
    
    const params: Record<string, any> = {
      target: target.name,
      weapon: weapon?.name
    };
    
    // Determine message based on verb and weapon
    let messageId = 'attacked';
    if (target.has(TraitType.ACTOR)) {
      eventData.targetType = 'actor';
      eventData.hostile = true;
      
      if (!weapon) {
        switch (verb) {
          case 'punch':
            messageId = 'punched';
            break;
          case 'kick':
            messageId = 'kicked';
            break;
          case 'hit':
            messageId = 'hit';
            break;
          case 'strike':
            messageId = 'struck';
            break;
          default:
            messageId = 'unarmed_attack';
        }
      } else {
        switch (verb) {
          case 'hit':
            messageId = 'hit_with';
            break;
          case 'strike':
            messageId = 'struck_with';
            break;
          default:
            messageId = 'attacked_with';
        }
      }
    } else {
      eventData.targetType = 'object';
      messageId = weapon ? 'attacked_with' : 'attacked';
    }
    
    // Create ATTACKED event for world model
    events.push(context.event('if.event.attacked', eventData));
    
    // Add success message
    events.push(context.event('action.success', {
      actionId: this.id,
      messageId: messageId,
      params: params
    }));
    
    // Add target reaction for actors (deterministic based on ID)
    if (target.has(TraitType.ACTOR)) {
      const reactions = ['defends', 'dodges', 'retaliates', 'flees'];
      const hashCode = target.id.split('').reduce((a: number, b: string) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      const reactionIndex = Math.abs(hashCode) % reactions.length;
      const reaction = reactions[reactionIndex];
      
      events.push(context.event('action.success', {
        actionId: this.id,
        messageId: reaction,
        params: params
      }));
    }
    
    return events;
  }
};