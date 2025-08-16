/**
 * Entering Mirror action - travel through a connected mirror portal
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { SemanticEvent } from '@sharpee/core';
import { MirrorTrait, MirrorBehavior, BloodSilverBehavior } from '../../traits';
import { BloodActions } from '../constants';
import { EnteredMirrorEventData } from './enteringMirror-events';
import { ActionMetadata } from '@sharpee/stdlib';
import { ScopeLevel } from '@sharpee/stdlib';

export const enteringMirrorAction: Action & { metadata: ActionMetadata } = {
  id: BloodActions.ENTERING_MIRROR,
  requiredMessages: [
    'no_mirror',
    'cant_reach',
    'mirror_broken',
    'mirror_not_connected',
    'mirror_face_down',
    'mirror_covered_exit_only',
    'entered_mirror',
    'arrived_through_mirror'
  ],
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  },
  group: 'mirror_travel',
  
  /**
   * Validate whether the enter mirror action can be executed
   */
  validate(context: ActionContext): ValidationResult {
    const mirror = context.command.directObject?.entity;
    
    if (!mirror) {
      return { 
        valid: false, 
        error: 'no_mirror'
      };
    }
    
    // Check if it can be entered
    if (!MirrorBehavior.canEnter(mirror)) {
      const trait = mirror.getTrait<MirrorTrait>('mirror');
      
      if (trait?.state === 'broken') {
        return { valid: false, error: 'mirror_broken' };
      }
      if (trait?.state === 'face-down') {
        return { valid: false, error: 'mirror_face_down' };
      }
      if (!trait?.connectedTo) {
        return { valid: false, error: 'mirror_not_connected' };
      }
    }
    
    return { valid: true };
  },
  
  /**
   * Execute the enter mirror action
   */
  execute(context: ActionContext): SemanticEvent[] {
    const events: SemanticEvent[] = [];
    const actor = context.actor;
    const mirror = context.command.directObject!.entity;
    const mirrorTrait = mirror.getTrait<MirrorTrait>('mirror')!;
    const world = context.world;
    
    // Get the destination mirror
    const destinationMirror = world.getEntity(mirrorTrait.connectedTo!);
    if (!destinationMirror) {
      return [{
        id: 'blood.event.mirror_error',
        type: 'blood.event.mirror_error',
        timestamp: Date.now(),
        data: {
          actorId: actor.id,
          mirrorId: mirror.id,
          error: 'destination_not_found'
        }
      }];
    }
    
    const destTrait = destinationMirror.getTrait<MirrorTrait>('mirror');
    const destinationRoom = destinationMirror.getContainer();
    
    if (!destinationRoom) {
      return [{
        id: 'blood.event.mirror_error',
        type: 'blood.event.mirror_error',
        timestamp: Date.now(),
        data: {
          actorId: actor.id,
          mirrorId: mirror.id,
          error: 'destination_room_not_found'
        }
      }];
    }
    
    // Record usage
    MirrorBehavior.recordUsage(mirror, actor, 'enter');
    MirrorBehavior.recordUsage(destinationMirror, actor, 'enter');
    
    // If actor is Silver carrier, record mirror use
    const silverTrait = actor.getTrait('bloodSilver');
    if (silverTrait) {
      BloodSilverBehavior.recordMirrorUse(actor, mirror);
      BloodSilverBehavior.recordMirrorUse(actor, destinationMirror);
    }
    
    // Create departure event
    events.push({
      id: 'blood.event.entered_mirror',
      type: 'blood.event.entered_mirror',
      timestamp: Date.now(),
      data: {
        actorId: actor.id,
        mirrorId: mirror.id,
        destinationId: destinationMirror.id,
        message: 'entered_mirror'
      } as EnteredMirrorEventData
    });
    
    // Move the actor
    actor.moveTo(destinationRoom);
    
    // Handle different orientations for arrival
    let arrivalMessage = 'arrived_through_mirror';
    if (destTrait?.orientation === 'floor') {
      arrivalMessage = 'emerged_from_floor_mirror';
    } else if (destTrait?.orientation === 'ceiling') {
      arrivalMessage = 'fell_from_ceiling_mirror';
    }
    
    // Create arrival event
    events.push({
      id: 'blood.event.arrived_through_mirror',
      type: 'blood.event.arrived_through_mirror',
      timestamp: Date.now(),
      data: {
        actorId: actor.id,
        mirrorId: destinationMirror.id,
        sourceId: mirror.id,
        message: arrivalMessage
      }
    });
    
    // Trigger ripple detection for any Silver carriers
    events.push({
      id: 'blood.event.mirror_ripple',
      type: 'blood.event.mirror_ripple',
      timestamp: Date.now(),
      data: {
        mirrorId: mirror.id,
        connectedMirrorId: destinationMirror.id,
        causedBy: actor.id
      }
    });
    
    return events;
  }
};