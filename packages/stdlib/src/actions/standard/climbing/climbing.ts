/**
 * Climbing action - climb objects or in directions
 * 
 * This action handles climbing objects (trees, ladders, etc.) or climbing
 * in directions (up, down). It can result in movement or just changing position.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, EntryTrait, EntryBehavior } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ClimbedEventData } from './climbing-events';

interface ClimbingState {
  mode: 'directional' | 'object';
  direction?: string;
  target?: any;
  destinationId?: string;
  messageId: string;
  params: Record<string, any>;
}

export const climbingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.CLIMBING,
  requiredMessages: [
    'no_target',
    'not_climbable',
    'cant_go_that_way',
    'climbed_up',
    'climbed_down',
    'climbed_onto',
    'already_there',
    'too_high',
    'too_dangerous'
  ],
  group: 'movement',
  
  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  },
  
  validate(context: ActionContext): ValidationResult {
    const actor = context.player;
    const target = context.command.directObject?.entity;
    const direction = context.command.parsed.extras?.direction as string;
    
    // Handle directional climbing (climb up, climb down)
    if (direction && !target) {
      return validateDirectionalClimbing(direction, context);
    }
    
    // Handle object climbing
    if (target) {
      return validateObjectClimbing(target, context);
    }
    
    // No target or direction specified
    return { valid: false, error: 'no_target' };
  },
  
  execute(context: ActionContext): ISemanticEvent[] {
    const result = this.validate(context);
    if (!result.valid) {
      return [context.event('action.error', {
        actionId: this.id,
        messageId: result.error,
        reason: result.error,
        params: result.params
      })];
    }
    
    // Rebuild state from context
    const target = context.command.directObject?.entity;
    const direction = context.command.parsed.extras?.direction as string;
    const events: ISemanticEvent[] = [];
    
    // Determine mode and rebuild relevant data
    let mode: 'directional' | 'object';
    let messageId: string;
    let params: Record<string, any> = {};
    let destinationId: string | undefined;
    
    if (direction && !target) {
      mode = 'directional';
      const normalizedDirection = direction.toLowerCase();
      
      // For directional climbing, we need to check if movement is possible
      // This duplicates some logic from validateDirectionalClimbing
      const room = context.currentLocation;
      const exits = room.has(TraitType.ROOM) ? 
                   (room.get(TraitType.ROOM) as any).exits || {} : {};
      
      if (normalizedDirection === 'up' && exits.up) {
        destinationId = exits.up.to || exits.up.destination;
      } else if (normalizedDirection === 'down' && exits.down) {
        destinationId = exits.down.to || exits.down.destination;
      }
      
      messageId = normalizedDirection === 'up' ? 'climbed_up' : 'climbed_down';
      params.direction = normalizedDirection;
      
      // Create the CLIMBED event for world model updates
      const climbedData: ClimbedEventData = {
        direction: normalizedDirection,
        method: 'directional',
        destinationId: destinationId
      };
      events.push(context.event('if.event.climbed', climbedData));
      
      // Create movement events if there's a destination
      if (destinationId) {
        events.push(context.event('if.event.moved', {
          direction: normalizedDirection,
          fromRoom: context.currentLocation.id,
          toRoom: destinationId,
          method: 'climbing'
        }));
      }
    } else {
      // Climbing onto an object
      mode = 'object';
      messageId = 'climbed_onto';
      params.object = target!.name;
      
      // Create CLIMBED event for world model updates
      const climbedData: ClimbedEventData = {
        targetId: target!.id,
        method: 'onto'
      };
      events.push(context.event('if.event.climbed', climbedData));
      
      // If climbing onto something, also generate ENTERED event
      if (target) {
        events.push(context.event('if.event.entered', {
          targetId: target.id,
          method: 'climbing',
          preposition: 'onto'
        }));
      }
    }
    
    // Create success message
    events.push(context.event('action.success', {
      actionId: this.id,
      messageId: messageId,
      params: params
    }));
    
    return events;
  }
};

/**
 * Validate climbing in a direction (up/down)
 */
function validateDirectionalClimbing(
  direction: string, 
  context: ActionContext
): ValidationResult {
  // Normalize direction
  const normalizedDirection = direction.toLowerCase();
  
  // Only handle up/down for climbing
  if (normalizedDirection !== 'up' && normalizedDirection !== 'down') {
    return { valid: false, error: 'cant_go_that_way', params: { direction } };
  }
  
  // Get current location
  const currentLocation = context.currentLocation;
  if (!currentLocation.hasTrait(TraitType.ROOM)) {
    return { valid: false, error: 'cant_go_that_way', params: { direction: normalizedDirection } };
  }
  
  // Check if there's an exit in that direction
  const roomTrait = currentLocation.getTrait(TraitType.ROOM) as { exits?: Record<string, any> };
  if (!roomTrait.exits || !roomTrait.exits[normalizedDirection]) {
    return { valid: false, error: 'cant_go_that_way', params: { direction: normalizedDirection } };
  }
  
  // Get destination
  const exitConfig = roomTrait.exits[normalizedDirection];
  const destinationId = exitConfig.to;
  
  // Determine message
  const messageId = normalizedDirection === 'up' ? 'climbed_up' : 'climbed_down';
  
  return {
    valid: true
  };
}

/**
 * Validate climbing a specific object
 */
function validateObjectClimbing(
  target: any,
  context: ActionContext
): ValidationResult {
  // Check if object is climbable
  let isClimbable = false;
  let destination: string | undefined;
  
  // Check if it's an enterable object (climb onto) - use behavior if available
  if (target.hasTrait(TraitType.ENTRY)) {
    if (EntryBehavior.canEnter(target, context.player)) {
      isClimbable = true;
      destination = target.id;
    }
  } else if (target.hasTrait(TraitType.SUPPORTER)) {
    const supporterTrait = target.getTrait(TraitType.SUPPORTER) as { enterable?: boolean };
    if (supporterTrait.enterable) {
      isClimbable = true;
      destination = target.id;
    }
  }
  
  if (!isClimbable) {
    return { valid: false, error: 'not_climbable', params: { object: target.name } };
  }
  
  // Check if already on/in the target
  const currentLocation = context.world.getLocation(context.player.id);
  if (currentLocation === target.id) {
    return { valid: false, error: 'already_there', params: { place: target.name } };
  }
  
  return {
    valid: true
  };
}
