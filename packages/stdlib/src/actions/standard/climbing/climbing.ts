/**
 * Climbing action - climb objects or in directions
 *
 * This action handles climbing objects (trees, ladders, etc.) or climbing
 * in directions (up, down). It can result in movement or just changing position.
 *
 * Uses four-phase pattern:
 * 1. validate: Check if climbing is possible (valid direction/climbable object)
 * 2. execute: Perform world mutation (move player to destination/onto object)
 * 3. blocked: Generate events when validation fails
 * 4. report: Generate success events
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, ClimbableBehavior } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ClimbedEventData } from './climbing-events';

/**
 * Shared data passed between execute and report phases
 */
interface ClimbingSharedData {
  mode: 'directional' | 'object';
  direction?: string;         // 'up' or 'down' for directional climbing
  targetId?: string;          // target entity ID for object climbing
  targetName?: string;        // target name for messages
  destinationId?: string;     // destination room ID for directional climbing
  fromLocationId?: string;    // current location before climbing
}

function getClimbingSharedData(context: ActionContext): ClimbingSharedData {
  return context.sharedData as ClimbingSharedData;
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

  /**
   * Execute the climbing action - performs mutations only
   * Assumes validation has already passed
   */
  execute(context: ActionContext): void {
    const target = context.command.directObject?.entity;
    const direction = context.command.parsed.extras?.direction as string;
    const sharedData = getClimbingSharedData(context);

    // Store current location for all modes
    sharedData.fromLocationId = context.currentLocation.id;

    if (direction && !target) {
      // Directional climbing
      const normalizedDirection = direction.toLowerCase();
      sharedData.mode = 'directional';
      sharedData.direction = normalizedDirection;

      // Get destination from room exits
      const room = context.currentLocation;
      const roomTrait = room.get(TraitType.ROOM) as { exits?: Record<string, any> } | undefined;
      const exits = roomTrait?.exits || {};

      if (normalizedDirection === 'up' && exits.up) {
        sharedData.destinationId = exits.up.to || exits.up.destination;
      } else if (normalizedDirection === 'down' && exits.down) {
        sharedData.destinationId = exits.down.to || exits.down.destination;
      }

      // Perform the move if there's a destination
      if (sharedData.destinationId) {
        context.world.moveEntity(context.player.id, sharedData.destinationId);
      }
    } else if (target) {
      // Object climbing
      sharedData.mode = 'object';
      sharedData.targetId = target.id;
      sharedData.targetName = target.name;

      // Move player onto the target
      context.world.moveEntity(context.player.id, target.id);
    }
  },

  /**
   * Generate events when validation fails
   */
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('action.blocked', {
      actionId: this.id,
      messageId: result.error,
      reason: result.error,
      params: result.params || {}
    })];
  },

  /**
   * Report phase - generates all events after successful execution
   */
  report(context: ActionContext): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];
    const sharedData = getClimbingSharedData(context);

    if (sharedData.mode === 'directional') {
      // Directional climbing events
      const climbedData: ClimbedEventData = {
        direction: sharedData.direction,
        method: 'directional',
        destinationId: sharedData.destinationId
      };
      events.push(context.event('if.event.climbed', climbedData));

      // Movement event if there's a destination
      if (sharedData.destinationId) {
        events.push(context.event('if.event.moved', {
          direction: sharedData.direction,
          fromRoom: sharedData.fromLocationId,
          toRoom: sharedData.destinationId,
          method: 'climbing'
        }));
      }

      // Success message
      const messageId = sharedData.direction === 'up' ? 'climbed_up' : 'climbed_down';
      events.push(context.event('action.success', {
        actionId: this.id,
        messageId: messageId,
        params: { direction: sharedData.direction }
      }));
    } else {
      // Object climbing events
      const climbedData: ClimbedEventData = {
        targetId: sharedData.targetId,
        method: 'onto'
      };
      events.push(context.event('if.event.climbed', climbedData));

      // Entered event for climbing onto
      events.push(context.event('if.event.entered', {
        targetId: sharedData.targetId,
        method: 'climbing',
        preposition: 'onto'
      }));

      // Success message
      events.push(context.event('action.success', {
        actionId: this.id,
        messageId: 'climbed_onto',
        params: { object: sharedData.targetName }
      }));
    }

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
  if (!currentLocation.has(TraitType.ROOM)) {
    return { valid: false, error: 'cant_go_that_way', params: { direction: normalizedDirection } };
  }

  // Check if there's an exit in that direction
  const roomTrait = currentLocation.get(TraitType.ROOM) as { exits?: Record<string, any> };
  if (!roomTrait.exits || !roomTrait.exits[normalizedDirection]) {
    return { valid: false, error: 'cant_go_that_way', params: { direction: normalizedDirection } };
  }

  return { valid: true };
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

  // Check if it has the CLIMBABLE trait
  if (target.has(TraitType.CLIMBABLE)) {
    const result = ClimbableBehavior.climb(target);
    if (result.success) {
      isClimbable = true;
    }
  } else if (target.has(TraitType.SUPPORTER)) {
    // Also allow climbing onto enterable supporters
    const supporterTrait = target.get(TraitType.SUPPORTER) as { enterable?: boolean };
    if (supporterTrait.enterable) {
      isClimbable = true;
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

  return { valid: true };
}
