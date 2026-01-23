/**
 * Connecting Mirrors action - establish a portal connection between two mirrors
 * Requires Blood of Silver
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { MirrorTrait, MirrorBehavior, BloodSilverTrait, BloodSilverBehavior } from '../../traits';
import { BloodActions } from '../constants';
import { ConnectedMirrorsEventData } from './connectingMirrors-events';
import { ActionMetadata } from '@sharpee/stdlib';
import { ScopeLevel } from '@sharpee/stdlib';

export const connectingMirrorsAction: Action & { metadata: ActionMetadata } = {
  id: BloodActions.CONNECTING_MIRRORS,
  requiredMessages: [
    'no_silver_blood',
    'silver_blood_inactive',
    'no_first_mirror',
    'no_second_mirror',
    'cant_reach_first',
    'cant_reach_second',
    'mirror_broken',
    'mirrors_connected',
    'connection_replaced'
  ],
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: true,
    directObjectScope: ScopeLevel.REACHABLE,
    indirectObjectScope: ScopeLevel.VISIBLE
  },
  group: 'mirror_connection',
  
  /**
   * Validate whether the connect mirrors action can be executed
   */
  validate(context: ActionContext): ValidationResult {
    const actor = context.world.getPlayer();
    const mirror1 = context.command.directObject?.entity;
    const mirror2 = context.command.indirectObject?.entity;
    
    // Check for Silver blood
    const silverTrait = actor?.getTrait<BloodSilverTrait>('bloodSilver');
    if (!silverTrait) {
      return { 
        valid: false, 
        error: 'no_silver_blood'
      };
    }
    
    // Silver trait doesn't have active property - just having it is enough
    
    // Check mirrors exist
    if (!mirror1) {
      return { 
        valid: false, 
        error: 'no_first_mirror'
      };
    }
    
    if (!mirror2) {
      return { 
        valid: false, 
        error: 'no_second_mirror'
      };
    }
    
    const trait1 = mirror1.getTrait<MirrorTrait>('mirror');
    const trait2 = mirror2.getTrait<MirrorTrait>('mirror');
    
    if (!trait1 || !trait2) {
      return { 
        valid: false, 
        error: 'not_mirrors'
      };
    }
    
    // Check neither is broken
    if (trait1.isBroken || trait2.isBroken) {
      return { 
        valid: false, 
        error: 'mirror_broken'
      };
    }
    
    return { valid: true };
  },
  
  /**
   * Execute the connect mirrors action
   */
  execute(context: ActionContext): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];
    const actor = context.world.getPlayer();
    const mirror1 = context.command.directObject!.entity;
    const mirror2 = context.command.indirectObject!.entity;
    
    const trait1 = mirror1.getTrait<MirrorTrait>('mirror')!;
    const trait2 = mirror2.getTrait<MirrorTrait>('mirror')!;
    
    // Check if replacing existing connections
    const hadConnection1 = trait1.connections.size > 0;
    const hadConnection2 = trait2.connections.size > 0;
    const oldConnection1 = Array.from(trait1.connections.keys())[0] || null;
    const oldConnection2 = Array.from(trait2.connections.keys())[0] || null;
    
    // Create the connection
    if (!actor) return [];
    MirrorBehavior.connectMirrors(mirror1, mirror2, actor);
    
    // Record mirror use by Silver carrier
    BloodSilverBehavior.recordMirrorUse(actor, mirror1);
    BloodSilverBehavior.recordMirrorUse(actor, mirror2);
    
    // Create connection event
    const message = (hadConnection1 || hadConnection2) ? 'connection_replaced' : 'mirrors_connected';
    
    events.push({
      id: `blood.mirrors_connected.${Date.now()}`,
      type: 'blood.event.mirrors_connected',
      timestamp: Date.now(),
      entities: { actor: actor.id, target: mirror1.id, instrument: mirror2.id },
      data: {
        actorId: actor.id,
        mirror1Id: mirror1.id,
        mirror2Id: mirror2.id,
        message,
        replacedConnections: (hadConnection1 || hadConnection2) ? {
          mirror1Previous: oldConnection1,
          mirror2Previous: oldConnection2
        } : undefined
      } as ConnectedMirrorsEventData
    });
    
    // If connections were broken, emit events for those
    if (oldConnection1 && oldConnection1 !== mirror2.id) {
      events.push({
        id: `blood.connection_broken.${Date.now()}.1`,
        type: 'blood.event.connection_broken',
        timestamp: Date.now(),
        entities: { target: mirror1.id },
        data: {
          mirrorId: mirror1.id,
          disconnectedFrom: oldConnection1
        }
      });
    }
    
    if (oldConnection2 && oldConnection2 !== mirror1.id) {
      events.push({
        id: `blood.connection_broken.${Date.now()}.2`,
        type: 'blood.event.connection_broken',
        timestamp: Date.now(),
        entities: { target: mirror2.id },
        data: {
          mirrorId: mirror2.id,
          disconnectedFrom: oldConnection2
        }
      });
    }
    
    return events;
  }
};