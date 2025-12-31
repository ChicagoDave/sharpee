/**
 * Break Action - Story-specific action for breaking items
 *
 * Used for breaking the empty frame to get the frame piece
 * in the ghost ritual puzzle (ADR-078).
 *
 * Pattern: "break frame", "smash frame", "break :target"
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { IdentityTrait, IFEntity } from '@sharpee/world-model';
import { BREAK_ACTION_ID, BreakMessages } from './types';
import { createFramePiece } from '../../objects/thiefs-canvas-objects';

/**
 * Check if an entity is breakable (currently just the empty frame)
 */
function isBreakable(entity: IFEntity): boolean {
  return (entity as any).isBreakable === true;
}

/**
 * Check if an entity is the empty frame
 */
function isEmptyFrame(entity: IFEntity): boolean {
  return (entity as any).isEmptyFrame === true;
}

/**
 * Get the direct object from context
 */
function getDirectObject(context: ActionContext): { entity?: IFEntity; text?: string } | undefined {
  const structure = context.command.parsed?.structure;
  if (!structure?.directObject) {
    return undefined;
  }

  const text = structure.directObject.text || '';
  const entity = context.world.getAllEntities().find(e => {
    const identity = e.get(IdentityTrait);
    if (!identity) return false;
    const name = identity.name?.toLowerCase() || '';
    const aliases = identity.aliases || [];
    const lowerText = text.toLowerCase();
    return name.includes(lowerText) ||
           lowerText.includes(name) ||
           aliases.some((a: string) => a.toLowerCase().includes(lowerText) || lowerText.includes(a.toLowerCase()));
  });

  return { entity, text };
}

/**
 * Find breakable item in current location or inventory
 */
function findBreakableItem(context: ActionContext): IFEntity | undefined {
  const { world, player } = context;

  // Check player inventory
  const inventory = world.getContents(player.id);
  for (const item of inventory) {
    if (isBreakable(item)) {
      return item;
    }
  }

  // Check current room
  const playerLocation = world.getLocation(player.id);
  if (playerLocation) {
    const roomContents = world.getContents(playerLocation);
    for (const item of roomContents) {
      if (isBreakable(item)) {
        return item;
      }
    }
  }

  return undefined;
}

/**
 * Break Action Definition
 */
export const breakAction: Action = {
  id: BREAK_ACTION_ID,
  group: 'manipulation',

  validate(context: ActionContext): ValidationResult {
    const directObject = getDirectObject(context);

    // If no target specified, try to find a breakable item
    if (!directObject || !directObject.text) {
      const breakable = findBreakableItem(context);
      if (breakable) {
        context.sharedData.breakTarget = breakable;
        return { valid: true };
      }
      return {
        valid: false,
        error: BreakMessages.NO_TARGET
      };
    }

    // Check if target is in scope
    const targetEntity = directObject.entity;
    if (!targetEntity) {
      return {
        valid: false,
        error: BreakMessages.NOT_VISIBLE
      };
    }

    // Check if target is breakable
    if (!isBreakable(targetEntity)) {
      return {
        valid: false,
        error: BreakMessages.CANT_BREAK,
        params: { target: directObject.text }
      };
    }

    // Store target for execute phase
    context.sharedData.breakTarget = targetEntity;
    return { valid: true };
  },

  execute(context: ActionContext): void {
    const { world, player, sharedData } = context;

    const target = sharedData.breakTarget as IFEntity;
    if (!target) {
      return;
    }

    const playerLocation = world.getLocation(player.id) || '';
    const isFrame = isEmptyFrame(target);

    if (isFrame) {
      // Remove the empty frame
      world.removeEntity(target.id);

      // Create the frame piece and place it at player's location
      const framePiece = createFramePiece(world);
      world.moveEntity(framePiece.id, playerLocation);

      sharedData.isFrame = true;
      sharedData.framePieceId = framePiece.id;
    }

    sharedData.playerLocation = playerLocation;
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('action.blocked', {
      actionId: BREAK_ACTION_ID,
      messageId: result.error || BreakMessages.NO_TARGET,
      reason: result.error,
      params: result.params
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const { sharedData } = context;
    const events: ISemanticEvent[] = [];

    const target = sharedData.breakTarget as IFEntity;
    if (!target) {
      return events;
    }

    const identity = target.get(IdentityTrait);
    const targetName = identity?.name || 'item';
    const isFrame = sharedData.isFrame;

    // Emit the break event with appropriate message
    events.push(context.event('game.message', {
      messageId: isFrame ? BreakMessages.BREAK_FRAME : BreakMessages.BREAK_SUCCESS,
      target: targetName,
      framePieceId: sharedData.framePieceId
    }));

    return events;
  }
};
