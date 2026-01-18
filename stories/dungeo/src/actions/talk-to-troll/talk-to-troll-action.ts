/**
 * Talk to Troll Action
 *
 * Handles "talk to troll" / "hello troll" - a minor MDL edge case.
 * When troll is incapacitated: "Unfortunately, the troll can't hear you."
 * When troll is alive: Generic non-response.
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { CombatantTrait } from '@sharpee/world-model';

export const TALK_TO_TROLL_ACTION_ID = 'dungeo.action.talk_to_troll';

export const TalkToTrollMessages = {
  CANT_HEAR_YOU: 'dungeo.troll.cant_hear_you',
  GROWLS: 'dungeo.troll.growls_at_player',
} as const;

interface TalkToTrollSharedData {
  trollId?: string;
  isIncapacitated?: boolean;
}

function getSharedData(context: ActionContext): TalkToTrollSharedData {
  return context.sharedData as TalkToTrollSharedData;
}

export const talkToTrollAction: Action = {
  id: TALK_TO_TROLL_ACTION_ID,
  group: 'communication',

  validate(context: ActionContext): ValidationResult {
    const sharedData = getSharedData(context);

    // Find the troll by checking entity name or identity aliases
    const troll = context.world.getAllEntities().find(e => {
      // Check entity's base name
      if (e.name.toLowerCase() === 'troll') return true;
      // Check identity trait aliases
      const identity = e.get('identity') as { name?: string; aliases?: string[] } | undefined;
      if (identity?.aliases?.some(a => a.toLowerCase() === 'troll')) return true;
      return false;
    });

    if (!troll) {
      return {
        valid: false,
        error: 'no_troll',
        params: {}
      };
    }

    // Check if troll is in same location as player
    const trollLocation = context.world.getLocation(troll.id);
    const playerLocation = context.world.getLocation(context.player.id);

    if (trollLocation !== playerLocation) {
      return {
        valid: false,
        error: 'troll_not_here',
        params: {}
      };
    }

    sharedData.trollId = troll.id;

    // Check if troll is incapacitated
    const combatant = troll.get(CombatantTrait);
    sharedData.isIncapacitated = combatant && (!combatant.isAlive || !combatant.isConscious);

    return { valid: true };
  },

  execute(_context: ActionContext): void {
    // No state changes - just produces a message
  },

  report(context: ActionContext): ISemanticEvent[] {
    const sharedData = getSharedData(context);

    const messageId = sharedData.isIncapacitated
      ? TalkToTrollMessages.CANT_HEAR_YOU
      : TalkToTrollMessages.GROWLS;

    return [context.event('action.success', {
      actionId: TALK_TO_TROLL_ACTION_ID,
      messageId
    })];
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    if (result.error === 'troll_not_here' || result.error === 'no_troll') {
      return [context.event('action.blocked', {
        actionId: TALK_TO_TROLL_ACTION_ID,
        messageId: 'core.entity_not_found'
      })];
    }
    return [];
  }
};
