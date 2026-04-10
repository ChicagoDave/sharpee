/**
 * Revealing action — voluntarily end concealment (ADR-148)
 *
 * Removes ConcealedStateTrait from the player entity.
 * Grammar: "stand up", "come out", "reveal myself", "unhide", "stop hiding"
 *
 * Uses four-phase pattern:
 * 1. validate: Player must be concealed
 * 2. execute: Remove ConcealedStateTrait
 * 3. report: Emit if.event.player_revealed with reason 'explicit'
 * 4. blocked: Emit error (not_hidden)
 *
 * Public interface: revealingAction.
 * Owner context: @sharpee/stdlib / actions / hiding
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import {
  ConcealedStateTrait,
  getConcealmentState,
  isConcealed,
} from '@sharpee/world-model';
import { PlayerRevealedEventData } from './hiding-events';

/**
 * Shared data passed between phases.
 */
interface RevealingSharedData {
  wasHidingBehind?: string;
  position?: string;
}

function getRevealingSharedData(context: ActionContext): RevealingSharedData {
  return context.sharedData as RevealingSharedData;
}

export const revealingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.REVEALING,

  requiredMessages: [
    'revealed',
    'not_hidden',
  ],

  group: 'interaction',

  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false,
  },

  validate(context: ActionContext): ValidationResult {
    const player = context.player;

    if (!isConcealed(player)) {
      return { valid: false, error: 'not_hidden' };
    }

    // Store current concealment info for report
    const concealment = getConcealmentState(player);
    const sharedData = getRevealingSharedData(context);
    sharedData.wasHidingBehind = concealment?.targetId;
    sharedData.position = concealment?.position;

    return { valid: true };
  },

  execute(context: ActionContext): void {
    const player = context.player;
    player.remove(ConcealedStateTrait.type);
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('if.event.reveal_blocked', {
      blocked: true,
      messageId: `${context.action.id}.${result.error}`,
      params: result.params || {},
      reason: result.error,
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    return [context.event('if.event.player_revealed', {
      messageId: `${context.action.id}.revealed`,
      reason: 'explicit',
    } as PlayerRevealedEventData & { messageId: string })];
  },
};
