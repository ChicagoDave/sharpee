/**
 * Turn Bolt Action - Story-specific action for dam bolt
 *
 * Per FORTRAN source:
 * - Requires wrench to turn
 * - Only turns if yellow button was pressed (GATEF=TRUE)
 * - Toggles dam open/closed (LWTIDF)
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { IdentityTrait, IFEntity } from '@sharpee/world-model';
import { TURN_BOLT_ACTION_ID, TurnBoltMessages } from './types';
import { DAM_STATE_KEY, DamState, startDamDraining } from '../../scheduler/dam-fuse';

// We need access to scheduler for starting draining
let schedulerRef: any = null;
let reservoirIdRef: string = '';

/**
 * Set the scheduler reference for starting draining sequence
 */
export function setTurnBoltScheduler(scheduler: any, reservoirId: string): void {
  schedulerRef = scheduler;
  reservoirIdRef = reservoirId;
}

/**
 * Check if an entity is the bolt
 */
function isBolt(entity: IFEntity): boolean {
  const identity = entity.get(IdentityTrait);
  if (!identity) return false;

  const name = identity.name?.toLowerCase() || '';
  return name === 'bolt';
}

/**
 * Check if an entity is the wrench
 */
function isWrench(entity: IFEntity): boolean {
  const identity = entity.get(IdentityTrait);
  if (!identity) return false;

  const name = identity.name?.toLowerCase() || '';
  const aliases = identity.aliases || [];

  return name.includes('wrench') || aliases.some((a: string) => a.toLowerCase().includes('wrench'));
}

/**
 * Find wrench in player inventory
 */
function findWrenchInInventory(context: ActionContext): IFEntity | undefined {
  const { world, player } = context;
  const inventory = world.getContents(player.id);

  for (const item of inventory) {
    if (isWrench(item)) {
      return item;
    }
  }

  return undefined;
}

/**
 * Turn Bolt Action Definition
 */
export const turnBoltAction: Action = {
  id: TURN_BOLT_ACTION_ID,
  group: 'manipulation',

  validate(context: ActionContext): ValidationResult {
    const { world, player } = context;

    // Find bolt in current room (literal pattern doesn't pass entity)
    const playerLocation = world.getLocation(player.id);
    if (!playerLocation) {
      return {
        valid: false,
        error: TurnBoltMessages.NOT_A_BOLT
      };
    }

    const roomContents = world.getContents(playerLocation);
    const target = roomContents.find(e => isBolt(e));

    if (!target) {
      return {
        valid: false,
        error: TurnBoltMessages.NOT_A_BOLT
      };
    }

    // Check for instrument (with X) - try to find wrench in inventory if not specified
    let toolEntity: IFEntity | undefined = findWrenchInInventory(context);

    if (!toolEntity) {
      return {
        valid: false,
        error: TurnBoltMessages.NO_TOOL
      };
    }

    // Check if tool is the wrench
    if (!isWrench(toolEntity)) {
      const toolIdentity = toolEntity.get(IdentityTrait);
      context.sharedData.wrongTool = toolIdentity?.name || 'that';
      return {
        valid: false,
        error: TurnBoltMessages.WRONG_TOOL
      };
    }

    // Check if yellow button was pressed (GATEF=TRUE)
    const damState = world.getCapability(DAM_STATE_KEY) as DamState | null;
    if (!damState?.buttonPressed) {
      return {
        valid: false,
        error: TurnBoltMessages.WONT_TURN
      };
    }

    // Store target for execute phase
    context.sharedData.boltTarget = target;
    context.sharedData.damState = damState;

    return { valid: true };
  },

  execute(context: ActionContext): void {
    const { world, sharedData } = context;

    const damState = sharedData.damState as DamState;
    if (!damState) {
      return;
    }

    // Toggle dam state
    if (damState.isDrained) {
      // Close dam (refill)
      damState.isDrained = false;
      damState.isDraining = false;
      sharedData.resultMessage = TurnBoltMessages.GATES_CLOSE;
      // TODO: Handle refilling logic if needed
    } else if (!damState.isDraining) {
      // Open dam (start draining)
      if (schedulerRef && reservoirIdRef) {
        const events = startDamDraining(schedulerRef, world as any, reservoirIdRef);
        sharedData.drainingEvents = events;
      }
      sharedData.resultMessage = TurnBoltMessages.GATES_OPEN;
    } else {
      // Already draining, nothing to do
      sharedData.resultMessage = TurnBoltMessages.GATES_OPEN;
    }
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const { sharedData } = context;

    // Handle wrong tool message with tool name
    if (result.error === TurnBoltMessages.WRONG_TOOL && sharedData.wrongTool) {
      return [context.event('action.blocked', {
        actionId: TURN_BOLT_ACTION_ID,
        messageId: TurnBoltMessages.WRONG_TOOL,
        reason: result.error,
        tool: sharedData.wrongTool
      })];
    }

    return [context.event('action.blocked', {
      actionId: TURN_BOLT_ACTION_ID,
      messageId: result.error || TurnBoltMessages.NOT_A_BOLT,
      reason: result.error
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const { sharedData } = context;
    const events: ISemanticEvent[] = [];

    const messageId = sharedData.resultMessage || TurnBoltMessages.GATES_OPEN;

    events.push(context.event('game.message', {
      messageId
    }));

    // Add any draining events
    if (sharedData.drainingEvents) {
      events.push(...(sharedData.drainingEvents as ISemanticEvent[]));
    }

    return events;
  }
};
