/**
 * Hiding action — enter concealment behind/under/on/inside a hiding spot (ADR-148)
 *
 * Adds ConcealedStateTrait to the player entity, making them invisible
 * to NPCs via the visibility capability system.
 *
 * Uses four-phase pattern:
 * 1. validate: Target must have ConcealmentTrait with matching position
 * 2. execute: Add ConcealedStateTrait to player
 * 3. report: Emit if.event.player_concealed
 * 4. blocked: Emit error message (nothing_to_hide, cant_hide_there, already_hidden)
 *
 * Public interface: hidingAction.
 * Owner context: @sharpee/stdlib / actions / hiding
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import {
  ConcealmentTrait,
  ConcealmentPosition,
  ConcealedStateTrait,
  isConcealed,
} from '@sharpee/world-model';
import { PlayerConcealedEventData } from './hiding-events';

/**
 * Shared data passed between phases.
 */
interface HidingSharedData {
  targetId?: string;
  targetName?: string;
  position?: ConcealmentPosition;
  quality?: ConcealmentTrait['quality'];
}

function getHidingSharedData(context: ActionContext): HidingSharedData {
  return context.sharedData as HidingSharedData;
}

export const hidingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.HIDING,

  requiredMessages: [
    'behind',
    'under',
    'on',
    'inside',
    'nothing_to_hide',
    'cant_hide_there',
    'already_hidden',
  ],

  group: 'interaction',

  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
  },

  validate(context: ActionContext): ValidationResult {
    const player = context.player;

    // Already concealed?
    if (isConcealed(player)) {
      return { valid: false, error: 'already_hidden' };
    }

    // Get the target entity
    const target = context.command.directObject?.entity;
    if (!target) {
      return { valid: false, error: 'nothing_to_hide' };
    }

    // Target must have ConcealmentTrait
    const concealmentTrait = target.get(ConcealmentTrait.type) as ConcealmentTrait | undefined;
    if (!concealmentTrait) {
      return {
        valid: false,
        error: 'nothing_to_hide',
        params: { target: target.name },
      };
    }

    // Get the requested position from grammar default semantics (via extras)
    const position = context.command.parsed.extras?.position as ConcealmentPosition | undefined;
    if (!position) {
      return { valid: false, error: 'nothing_to_hide' };
    }

    // Check position is supported
    if (!concealmentTrait.supportsPosition(position)) {
      return {
        valid: false,
        error: 'cant_hide_there',
        params: { target: target.name, position },
      };
    }

    // Store data for execute/report phases
    const sharedData = getHidingSharedData(context);
    sharedData.targetId = target.id;
    sharedData.targetName = target.name;
    sharedData.position = position;
    sharedData.quality = concealmentTrait.quality;

    return { valid: true };
  },

  execute(context: ActionContext): void {
    const sharedData = getHidingSharedData(context);
    const player = context.player;

    // Add ConcealedStateTrait — this IS the concealment state
    player.add(new ConcealedStateTrait({
      targetId: sharedData.targetId!,
      position: sharedData.position!,
      quality: sharedData.quality!,
    }));
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('if.event.hide_blocked', {
      blocked: true,
      messageId: `${context.action.id}.${result.error}`,
      params: result.params || {},
      reason: result.error,
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const sharedData = getHidingSharedData(context);

    return [context.event('if.event.player_concealed', {
      messageId: `${context.action.id}.${sharedData.position}`,
      targetId: sharedData.targetId,
      targetName: sharedData.targetName,
      position: sharedData.position,
      quality: sharedData.quality,
    } as PlayerConcealedEventData & { messageId: string; targetName: string })];
  },
};
