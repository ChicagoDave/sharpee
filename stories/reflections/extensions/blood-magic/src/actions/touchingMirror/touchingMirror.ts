/**
 * Touching Mirror action - touch a mirror to use it or sense connections
 * 
 * This action allows Silver carriers to establish connections or
 * anyone to interact with mirrors.
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { MirrorTrait, MirrorBehavior, BloodSilverTrait, BloodSilverBehavior } from '../../traits';
import { BloodActions } from '../constants';
import { TouchedMirrorEventData } from './touchingMirror-events';
import { ActionMetadata } from '@sharpee/stdlib';
import { ScopeLevel } from '@sharpee/stdlib';

export const touchingMirrorAction: Action & { metadata: ActionMetadata } = {
  id: BloodActions.TOUCHING_MIRROR,
  requiredMessages: [
    'no_mirror',
    'cant_reach',
    'mirror_broken',
    'touched_mirror',
    'silver_senses_connection',
    'silver_no_connection'
  ],
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  },
  group: 'mirror_interaction',
  
  /**
   * Validate whether the touch mirror action can be executed
   */
  validate(context: ActionContext): ValidationResult {
    const mirror = context.command.directObject?.entity;
    
    if (!mirror) {
      return { 
        valid: false, 
        error: 'no_mirror'
      };
    }
    
    const mirrorTrait = mirror.getTrait<MirrorTrait>('mirror');
    if (!mirrorTrait) {
      return { 
        valid: false, 
        error: 'no_mirror'
      };
    }
    
    // Check if mirror is broken
    if (mirrorTrait.isBroken) {
      return { 
        valid: false, 
        error: 'mirror_broken'
      };
    }
    
    return { valid: true };
  },
  
  /**
   * Execute the touch mirror action
   */
  execute(context: ActionContext): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];
    const actor = context.world.getPlayer();
    if (!actor) return [];
    const mirror = context.command.directObject!.entity;
    const mirrorTrait = mirror.getTrait<MirrorTrait>('mirror')!;
    
    // Record the touch
    MirrorBehavior.recordUsage(mirror, actor, 'touched');
    
    // Check if actor is a Silver carrier
    const silverTrait = actor.getTrait<BloodSilverTrait>('bloodSilver');
    if (silverTrait) {
      // Silver carrier can sense connections
      BloodSilverBehavior.recordMirrorUse(actor, mirror);
      
      let message = 'touched_mirror';
      const extraData: any = {};
      
      const connectedTo = mirrorTrait.connections.size > 0 ? 
        Array.from(mirrorTrait.connections.keys())[0] : null;
      if (connectedTo) {
        message = 'silver_senses_connection';
        extraData.connectedTo = connectedTo;
        
        // Check for recent signatures
        const recentSignatures = mirrorTrait.signatures.filter((sig: any) => 
          !MirrorBehavior.hasSignatureFaded(sig, Date.now())
        );
        if (recentSignatures.length > 0) {
          extraData.signatures = recentSignatures;
        }
      } else {
        message = 'silver_no_connection';
      }
      
      events.push({
        id: `blood.touched_mirror.${Date.now()}`,
        type: 'blood.event.touched_mirror',
        timestamp: Date.now(),
        entities: { actor: actor.id, target: mirror.id },
        data: {
          actorId: actor.id,
          mirrorId: mirror.id,
          message,
          ...extraData
        } as TouchedMirrorEventData
      });
    } else {
      // Non-Silver carrier just touches the mirror
      events.push({
        id: `blood.touched_mirror.${Date.now()}`,
        type: 'blood.event.touched_mirror',
        timestamp: Date.now(),
        entities: { actor: actor.id, target: mirror.id },
        data: {
          actorId: actor.id,
          mirrorId: mirror.id,
          message: 'touched_mirror'
        } as TouchedMirrorEventData
      });
    }
    
    return events;
  }
};