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
 *
 * Interceptor consultation (ADR-118) runs through the shared lifecycle
 * engine (ADR-228) via `climbingLifecycle` — no hand-rolled hook plumbing.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types.js';
import { ActionMetadata } from '../../../validation/index.js';
import { ScopeLevel } from '../../../scope/types.js';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, ClimbableBehavior } from '@sharpee/world-model';
import { IFActions } from '../../constants.js';
import { ClimbedEventData } from './climbing-events.js';
import { nounPhraseFor } from '../../../utils/index.js';
import {
  ActionLifecycleDescriptor,
  resolveLifecycle,
  getLifecycleState,
  runPreValidate,
  runPostValidate,
  runPostExecute,
  runPostReport,
  runOnBlocked,
  blockedMessageId
} from '../../lifecycle/index.js';

/**
 * Interceptor surface (ADR-228): the climbed object is the only consultable
 * entity of a CLIMB command. Directional climbing ("climb up") has no direct
 * object, so the slot resolves to undefined — zero consultations.
 */
export const climbingLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.CLIMBING,
  slots: [
    {
      id: 'target',
      actionIds: [IFActions.CLIMBING],
      resolve: (ctx) => ctx.command.directObject?.entity
    }
  ]
};

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

    // No target or direction specified — defensive early return, no hooks
    if (!direction && !target) {
      return { valid: false, error: 'no_target' };
    }

    const state = resolveLifecycle(context, climbingLifecycle);
    const preVeto = runPreValidate(context, state);
    if (preVeto) return preVeto;

    // Handle directional climbing (climb up, climb down) or object climbing
    const result = (direction && !target)
      ? validateDirectionalClimbing(direction, context)
      : validateObjectClimbing(target, context);
    if (!result.valid) return result;

    // Canonical placement (ADR-228): postValidate runs after ALL standard validation
    const postVeto = runPostValidate(context, state);
    if (postVeto) return postVeto;

    return result;
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

    const state = getLifecycleState(context);
    if (state) runPostExecute(context, state);
  },

  /**
   * Generate events when validation fails
   */
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const target = context.command.directObject?.entity;
    const direction = context.command.parsed.extras?.direction as string;
    const events: ISemanticEvent[] = [context.event('if.event.climbed', {
      blocked: true,
      messageId: blockedMessageId(context, result),
      // params carry EntityInfo for the formatter chain (ADR-158)
      params: { target: target ? nounPhraseFor(target) : undefined, ...result.params },
      reason: result.error,
      targetId: target?.id,
      targetName: target?.name,
      direction
    })];

    if (result.error) {
      const state = getLifecycleState(context);
      if (state) runOnBlocked(context, state, events, 'if.event.climbed', result.error);
    }

    return events;
  },

  /**
   * Report phase - generates all events after successful execution
   */
  report(context: ActionContext): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];
    const sharedData = getClimbingSharedData(context);

    if (sharedData.mode === 'directional') {
      // Directional climbing - determine message
      const messageId = sharedData.direction === 'up' ? 'climbed_up' : 'climbed_down';

      // Emit climbed event with messageId for text rendering
      events.push(context.event('if.event.climbed', {
        messageId: `${context.action.id}.${messageId}`,
        params: { direction: sharedData.direction },
        direction: sharedData.direction,
        method: 'directional',
        destinationId: sharedData.destinationId
      } as ClimbedEventData & { messageId: string; params: Record<string, any> }));

      // Movement event if there's a destination
      if (sharedData.destinationId) {
        events.push(context.event('if.event.moved', {
          direction: sharedData.direction,
          fromRoom: sharedData.fromLocationId,
          toRoom: sharedData.destinationId,
          method: 'climbing'
        }));
      }
    } else {
      // Object climbing - emit climbed event with messageId for text rendering
      // params carry EntityInfo for the formatter chain (ADR-158)
      const target = context.command.directObject?.entity;
      events.push(context.event('if.event.climbed', {
        messageId: `${context.action.id}.climbed_onto`,
        params: { target: target ? nounPhraseFor(target) : { name: sharedData.targetName ?? '' } },
        targetId: sharedData.targetId,
        targetName: sharedData.targetName,
        method: 'onto'
      } as ClimbedEventData & { messageId: string; params: Record<string, any>; targetName?: string }));

      // Entered event for climbing onto
      events.push(context.event('if.event.entered', {
        targetId: sharedData.targetId,
        method: 'climbing',
        preposition: 'onto'
      }));
    }

    const state = getLifecycleState(context);
    if (state) runPostReport(context, state, events, 'if.event.climbed');

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
    return { valid: false, error: 'not_climbable', params: { object: nounPhraseFor(target) } };
  }

  // Check if already on/in the target
  const currentLocation = context.world.getLocation(context.player.id);
  if (currentLocation === target.id) {
    return { valid: false, error: 'already_there', params: { place: nounPhraseFor(target) } };
  }

  return { valid: true };
}
