/**
 * Entering action - enter containers, supporters, or other enterable objects
 * 
 * This action handles entering objects that have the ENTRY trait or
 * are containers/supporters marked as enterable.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { 
  TraitType, 
  EntryTrait, 
  ContainerTrait, 
  SupporterTrait,
  EntryBehavior,
  ContainerBehavior,
  SupporterBehavior,
  OpenableBehavior
} from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { EnteredEventData } from './entering-events';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';

export const enteringAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.ENTERING,
  requiredMessages: [
    'no_target',
    'not_enterable',
    'already_inside',
    'container_closed',
    'too_full',
    'entered',
    'entered_on',
    'cant_enter'
  ],
  group: 'movement',
  
  validate(context: ActionContext): ValidationResult {
    const actor = context.player;
    const target = context.command.directObject?.entity;
    
    // Validate target
    if (!target) {
      return { 
        valid: false, 
        error: 'no_target'
      };
    }
    
    // Check if already inside the target
    const currentLocation = context.world.getLocation(actor.id);
    if (currentLocation === target.id) {
      return { 
        valid: false, 
        error: 'already_inside',
        params: { place: target.name }
      };
    }
    
    // Check for ENTRY trait first (highest priority) and use behavior
    if (target.has(TraitType.ENTRY)) {
      if (!EntryBehavior.canEnter(target, actor)) {
        const reason = EntryBehavior.getBlockedReason(target, actor);
        const entryTrait = target.get(TraitType.ENTRY) as EntryTrait;
        
        if (reason === 'full') {
          return { 
            valid: false, 
            error: 'too_full',
            params: { 
              place: target.name,
              occupants: EntryBehavior.getOccupants(target).length,
              max: entryTrait.maxOccupants
            }
          };
        } else if (reason === 'closed') {
          return { 
            valid: false, 
            error: 'container_closed',
            params: { container: target.name }
          };
        } else if (reason === 'entry_blocked') {
          return { 
            valid: false, 
            error: 'cant_enter',
            params: { 
              place: target.name,
              reason: entryTrait.blockedMessage || 'blocked'
            }
          };
        } else {
          return { 
            valid: false, 
            error: 'cant_enter',
            params: { 
              place: target.name,
              reason: reason
            }
          };
        }
      }
      return { valid: true };
    }
    
    // Check if it's an enterable container
    if (target.has(TraitType.CONTAINER)) {
      const containerTrait = target.get(TraitType.CONTAINER) as ContainerTrait;
      if (!containerTrait.enterable) {
        return { 
          valid: false, 
          error: 'not_enterable',
          params: { place: target.name }
        };
      }
      
      // Check if container needs to be open
      if (target.has(TraitType.OPENABLE) && !OpenableBehavior.isOpen(target)) {
        return { 
          valid: false, 
          error: 'container_closed',
          params: { container: target.name }
        };
      }
      
      // Check occupancy for containers
      const currentOccupants = context.world.getContents(target.id)
        .filter(e => e.has(TraitType.ACTOR));
      // Containers generally don't have occupancy limits, but check capacity
      if (!ContainerBehavior.canAccept(target, actor, context.world)) {
        return { 
          valid: false, 
          error: 'too_full',
          params: { 
            place: target.name
          }
        };
      }
      
      return { valid: true };
    }
    
    // Check if it's an enterable supporter
    if (target.has(TraitType.SUPPORTER)) {
      const supporterTrait = target.get(TraitType.SUPPORTER) as SupporterTrait;
      if (!supporterTrait.enterable) {
        return { 
          valid: false, 
          error: 'not_enterable',
          params: { place: target.name }
        };
      }
      
      // Check capacity for supporters
      if (!SupporterBehavior.canAccept(target, actor, context.world)) {
        return { 
          valid: false, 
          error: 'too_full',
          params: { 
            place: target.name
          }
        };
      }
      
      return { valid: true };
    }
    
    // Not enterable
    return { 
      valid: false, 
      error: 'not_enterable',
      params: { place: target.name }
    };
  },
  
  execute(context: ActionContext): ISemanticEvent[] {
    const actor = context.player;
    const target = context.command.directObject?.entity!;
    const currentLocation = context.world.getLocation(actor.id);
    
    // Determine preposition and posture based on target type
    let preposition: 'in' | 'on' = 'in';
    let posture: string | undefined;
    
    // Get details based on trait type
    if (target.has(TraitType.ENTRY)) {
      const entryTrait = target.get(TraitType.ENTRY) as EntryTrait;
      preposition = (entryTrait.preposition || 'in') as 'in' | 'on';
      posture = entryTrait.posture;
      
      // Update occupants in Entry trait using behavior
      // Note: EntryBehavior.enter() returns events but we'll generate our own
      // So we just update the occupants directly
      entryTrait.occupants = entryTrait.occupants || [];
      if (!entryTrait.occupants.includes(actor.id)) {
        entryTrait.occupants.push(actor.id);
      }
    } else if (target.has(TraitType.CONTAINER)) {
      preposition = 'in';
    } else if (target.has(TraitType.SUPPORTER)) {
      preposition = 'on';
    }
    
    // Move the actor to the target
    context.world.moveEntity(actor.id, target.id);
    
    // Build event data
    const params: Record<string, any> = {
      place: target.name,
      preposition
    };
    
    if (posture) {
      params.posture = posture;
    }
    
    const events: ISemanticEvent[] = [];
    
    // Create the ENTERED event for world model updates
    const enteredData: EnteredEventData = {
      targetId: target.id,
      fromLocation: currentLocation,
      preposition,
      posture
    };
    
    events.push(context.event('if.event.entered', enteredData));
    
    // Create success message
    const messageId = preposition === 'on' ? 'entered_on' : 'entered';
    events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId: messageId,
        params: params
      }));
    
    return events;
  },
  
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  }
};
