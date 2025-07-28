/**
 * Climbing action - climb objects or in directions
 * 
 * This action handles climbing objects (trees, ladders, etc.) or climbing
 * in directions (up, down). It can result in movement or just changing position.
 */

import { Action, EnhancedActionContext } from '../../enhanced-types';
import { SemanticEvent } from '@sharpee/core';
import { TraitType, EntryTrait } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ClimbedEventData } from './climbing-events';

export const climbingAction: Action = {
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
  
  execute(context: EnhancedActionContext): SemanticEvent[] {
    const actor = context.player;
    const target = context.command.directObject?.entity;
    const direction = context.command.parsed.extras?.direction as string;
    
    // Handle directional climbing (climb up, climb down)
    if (direction && !target) {
      return handleDirectionalClimbing(direction, context);
    }
    
    // Handle object climbing
    if (target) {
      return handleObjectClimbing(target, context);
    }
    
    // No target or direction specified
    return [context.event('action.error', {
        actionId: climbingAction.id,
        messageId: 'no_target',
        reason: 'no_target'
      })];
  }
};

/**
 * Handle climbing in a direction (up/down)
 */
function handleDirectionalClimbing(
  direction: string, 
  context: EnhancedActionContext
): SemanticEvent[] {
  // Normalize direction
  const normalizedDirection = direction.toLowerCase();
  
  // Only handle up/down for climbing
  if (normalizedDirection !== 'up' && normalizedDirection !== 'down') {
    return [context.event('action.error', {
        actionId: climbingAction.id,
        messageId: 'cant_go_that_way',
        reason: 'cant_go_that_way',
        params: { direction }
      })];
  }
  
  // Get current location
  const currentLocation = context.currentLocation;
  if (!currentLocation.hasTrait(TraitType.ROOM)) {
    return [context.event('action.error', {
        actionId: climbingAction.id,
        messageId: 'cant_go_that_way',
        reason: 'cant_go_that_way',
        params: { direction: normalizedDirection }
      })];
  }
  
  // Check if there's an exit in that direction
  const roomTrait = currentLocation.getTrait(TraitType.ROOM) as { exits?: Record<string, any> };
  if (!roomTrait.exits || !roomTrait.exits[normalizedDirection]) {
    return [context.event('action.error', {
        actionId: climbingAction.id,
        messageId: 'cant_go_that_way',
        reason: 'cant_go_that_way',
        params: { direction: normalizedDirection }
      })];
  }
  
  // Get destination
  const exitConfig = roomTrait.exits[normalizedDirection];
  const destinationId = exitConfig.to;
  
  const events: SemanticEvent[] = [];
  
  // Create the CLIMBED event for world model updates
  const climbedData: ClimbedEventData = {
    direction: normalizedDirection,
    method: 'directional',
    destinationId
  };
  events.push(context.event('if.event.climbed', climbedData));
  
  // Create movement events
  events.push(context.event('if.event.moved', {
    direction: normalizedDirection,
    fromRoom: currentLocation.id,
    toRoom: destinationId,
    method: 'climbing'
  }));
  
  // Create success message
  const messageId = normalizedDirection === 'up' ? 'climbed_up' : 'climbed_down';
  events.push(context.event('action.success', {
        actionId: climbingAction.id,
        messageId: messageId,
        params: {}
      }));
  
  return events;
}

/**
 * Handle climbing a specific object
 */
function handleObjectClimbing(
  target: any,
  context: EnhancedActionContext
): SemanticEvent[] {
  // Check if object is climbable
  let isClimbable = false;
  let destination: string | undefined;
  
  // Check if it's an enterable object (climb onto)
  if (target.hasTrait(TraitType.ENTRY)) {
    const entryTrait = target.getTrait(TraitType.ENTRY) as EntryTrait;
    if (entryTrait.canEnter) {
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
    return [context.event('action.error', {
        actionId: climbingAction.id,
        messageId: 'not_climbable',
        reason: 'not_climbable',
        params: { object: target.name }
      })];
  }
  
  // Check if already on/in the target
  const currentLocation = context.world.getLocation(context.player.id);
  if (currentLocation === target.id) {
    return [context.event('action.error', {
        actionId: climbingAction.id,
        messageId: 'already_there',
        reason: 'already_there',
        params: { place: target.name }
      })];
  }
  
  const events: SemanticEvent[] = [];
  
  // Create CLIMBED event for world model updates
  const climbedData: ClimbedEventData = {
    targetId: target.id,
    method: 'onto'
  };
  events.push(context.event('if.event.climbed', climbedData));
  
  // If climbing onto something, also generate ENTERED event
  if (destination) {
    events.push(context.event('if.event.entered', {
      targetId: destination,
      method: 'climbing',
      preposition: 'onto'
    }));
  }
  
  // Create success message
  events.push(context.event('action.success', {
        actionId: climbingAction.id,
        messageId: 'climbed_onto',
        params: { object: target.name }
      }));
  
  return events;
}
