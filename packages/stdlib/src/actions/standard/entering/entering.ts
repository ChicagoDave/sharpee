/**
 * Entering action - enter containers, supporters, or other enterable objects
 * 
 * This action handles entering objects that have the ENTRY trait or
 * are containers/supporters marked as enterable.
 */

import { Action, EnhancedActionContext } from '../../enhanced-types';
import { SemanticEvent } from '@sharpee/core';
import { TraitType, EntryTrait, ContainerTrait, SupporterTrait } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { EnteredEventData } from './entering-events';

export const enteringAction: Action = {
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
  
  execute(context: EnhancedActionContext): SemanticEvent[] {
    const actor = context.player;
    const target = context.command.directObject?.entity;
    
    // Validate target
    if (!target) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'no_target',
        reason: 'no_target'
      })];
    }
    
    // Check if already inside the target
    const currentLocation = context.world.getLocation(actor.id);
    if (currentLocation === target.id) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'already_inside',
        reason: 'already_inside',
        params: { place: target.name }
      })];
    }
    
    // Determine if object is enterable and get preposition
    let isEnterable = false;
    let preposition: 'in' | 'on' = 'in';
    let maxOccupants: number | undefined;
    let currentOccupants: string[] = [];
    
    // Check for ENTRY trait first (highest priority)
    if (target.has(TraitType.ENTRY)) {
      const entryTrait = target.get(TraitType.ENTRY) as EntryTrait;
      if (entryTrait.canEnter) {
        isEnterable = true;
        preposition = (entryTrait.preposition || 'in') as 'in' | 'on';
        maxOccupants = entryTrait.maxOccupants;
        currentOccupants = entryTrait.occupants || [];
      } else {
        // Entry trait exists but entry is not allowed
        return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'cant_enter',
        params: { 
            place: target.name,
            reason: entryTrait.blockedMessage || 'blocked'
          }
      })];
      }
    }
    // Check if it's an enterable container
    else if (target.has(TraitType.CONTAINER)) {
      const containerTrait = target.get(TraitType.CONTAINER) as ContainerTrait;
      if (containerTrait.enterable) {
        isEnterable = true;
        preposition = 'in';
        // For containers, check current contents as occupants
        currentOccupants = context.world.getContents(target.id)
          .filter(e => e.has(TraitType.ACTOR))
          .map(e => e.id);
      }
    }
    // Check if it's an enterable supporter
    else if (target.has(TraitType.SUPPORTER)) {
      const supporterTrait = target.get(TraitType.SUPPORTER) as SupporterTrait;
      if (supporterTrait.enterable) {
        isEnterable = true;
        preposition = 'on';
        // For supporters, check current contents as occupants
        currentOccupants = context.world.getContents(target.id)
          .filter(e => e.has(TraitType.ACTOR))
          .map(e => e.id);
      }
    }
    
    // If not enterable, fail
    if (!isEnterable) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'not_enterable',
        reason: 'not_enterable',
        params: { place: target.name }
      })];
    }
    
    // Check maximum occupancy
    if (maxOccupants !== undefined && currentOccupants.length >= maxOccupants) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'too_full',
        reason: 'too_full',
        params: { 
          place: target.name,
          occupants: currentOccupants.length,
          max: maxOccupants
        }
      })];
    }
    
    // Check if container needs to be open
    if (target.has(TraitType.CONTAINER) && target.has(TraitType.OPENABLE)) {
      const openableTrait = target.get(TraitType.OPENABLE) as { isOpen?: boolean };
      if (!openableTrait.isOpen) {
        return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'container_closed',
        reason: 'container_closed',
        params: { container: target.name }
      })];
      }
    }
    
    // Build event data
    const params: Record<string, any> = {
      place: target.name,
      preposition
    };
    
    // Add entry trait specific data if present
    let posture: string | undefined;
    if (target.has(TraitType.ENTRY)) {
      const entryTrait = target.get(TraitType.ENTRY) as EntryTrait;
      if (entryTrait.posture) {
        posture = entryTrait.posture;
        params.posture = posture;
      }
    }
    
    const events: SemanticEvent[] = [];
    
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
  }
};
