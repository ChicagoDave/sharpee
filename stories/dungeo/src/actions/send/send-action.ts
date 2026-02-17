/**
 * Send Action - Mail order puzzle
 *
 * When the player types "send for brochure" (as hinted by the matchbook),
 * the order is placed and a delivery mechanism is triggered:
 *
 * 1. "send for brochure" → sets ordered flag
 * 2. Player enters kitchen → arms 3-turn delivery fuse
 * 3. After 3 turns → knock at door, brochure in mailbox
 *
 * The brochure contains the Don Woods Commemorative stamp (1 trophy case point).
 *
 * MDL: act3.199:1436-1440 (SEND verb handler)
 * Pattern: "send for brochure", "send for free brochure", "order brochure"
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { SEND_ACTION_ID, SendMessages } from './types';

// State keys (shared with brochure-fuse.ts)
const BROCHURE_ORDERED_KEY = 'dungeo.brochure.ordered';   // BRFLAG1
const BROCHURE_DELIVERED_KEY = 'dungeo.brochure.delivered'; // BRFLAG2

export const sendAction: Action = {
  id: SEND_ACTION_ID,
  group: 'communication',

  validate(context: ActionContext): ValidationResult {
    const { world } = context;

    // Three states per MDL (act3.199:1437-1440):
    // BRFLAG2 set → "Why? Do you need another one?"
    const delivered = world.getStateValue(BROCHURE_DELIVERED_KEY) as boolean;
    if (delivered) {
      return {
        valid: false,
        error: SendMessages.BROCHURE_ALREADY_RECEIVED
      };
    }

    // BRFLAG1 set → "It's probably on the way."
    const ordered = world.getStateValue(BROCHURE_ORDERED_KEY) as boolean;
    if (ordered) {
      return {
        valid: false,
        error: SendMessages.BROCHURE_ON_WAY
      };
    }

    return { valid: true };
  },

  execute(context: ActionContext): void {
    const { world } = context;

    // Mark as ordered (BRFLAG1)
    // The kitchen-watch daemon in brochure-fuse.ts will arm the delivery fuse
    // when the player next enters the kitchen
    world.setStateValue(BROCHURE_ORDERED_KEY, true);
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('action.blocked', {
      actionId: SEND_ACTION_ID,
      messageId: result.error || SendMessages.NO_TARGET,
      reason: result.error
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    // MDL: "Ok, but you know the postal service..."
    return [
      context.event('game.message', {
        messageId: SendMessages.SEND_FOR_BROCHURE
      })
    ];
  }
};
