/**
 * Diagnose Action
 *
 * Reports the player's current state of health using the canonical
 * MDL melee wound system (melee.137:302-324).
 *
 * Uses meleeWoundAdjust (ASTRENGTH) from player.attributes
 * and getDiagnosis() from the melee engine.
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { StandardCapabilities } from '@sharpee/world-model';
import { DIAGNOSE_ACTION_ID, DiagnoseMessages } from './types';
import { getDiagnosis, CURE_WAIT } from '../../combat/melee';
import { MELEE_STATE, CURE_STATE } from '../../combat/melee-state';

interface DiagnoseSharedData {
  woundLevel: number;     // 0 = healthy, positive = wound depth
  strengthLevel: number;  // Remaining fight-strength (base + wounds)
  deaths: number;
  turnsToHeal: number;
}

function getDiagnoseSharedData(context: ActionContext): DiagnoseSharedData {
  return context.sharedData as DiagnoseSharedData;
}

export const diagnoseAction: Action = {
  id: DIAGNOSE_ACTION_ID,
  group: 'meta',

  validate(context: ActionContext): ValidationResult {
    return { valid: true };
  },

  execute(context: ActionContext): void {
    const { world } = context;
    const player = world.getPlayer();
    const sharedData = getDiagnoseSharedData(context);

    if (!player) {
      sharedData.woundLevel = 0;
      sharedData.strengthLevel = 4;
      sharedData.deaths = 0;
      sharedData.turnsToHeal = 0;
      return;
    }

    // Read melee wound state from player attributes
    const woundAdjust = (player.attributes[MELEE_STATE.WOUND_ADJUST] as number) ?? 0;

    // Get current score for fight-strength calculation
    const scoring = world.getCapability(StandardCapabilities.SCORING);
    const score = scoring?.scoreValue ?? 0;

    // Calculate cure ticks remaining for current heal cycle
    const cureTicks = (world.getStateValue(CURE_STATE.TICKS) as number) || 0;
    const cureTicksRemaining = woundAdjust < 0 ? (CURE_WAIT - cureTicks) : 0;

    // Get death count
    const deaths = (world.getStateValue('dungeo.player.deaths') as number) || 0;

    // Use canonical diagnosis function
    const diagnosis = getDiagnosis(score, woundAdjust, cureTicksRemaining, deaths);

    sharedData.woundLevel = diagnosis.woundDepth;
    sharedData.strengthLevel = diagnosis.remainingStrength;
    sharedData.turnsToHeal = diagnosis.turnsToHeal;
    sharedData.deaths = diagnosis.deaths;
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('action.blocked', {
      actionId: this.id,
      messageId: result.error,
      reason: result.error,
      params: result.params || {}
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const sharedData = getDiagnoseSharedData(context);
    const events: ISemanticEvent[] = [];
    const { woundLevel, strengthLevel, deaths, turnsToHeal } = sharedData;

    // Wound status (canonical MDL melee.137:308-312)
    if (woundLevel === 0) {
      events.push(context.event('game.message', {
        messageId: DiagnoseMessages.PERFECT_HEALTH
      }));
    } else {
      // Wound + cure time as one sentence
      let woundMsgId: string;
      switch (woundLevel) {
        case 1: woundMsgId = DiagnoseMessages.LIGHT_WOUND_CURE; break;
        case 2: woundMsgId = DiagnoseMessages.SERIOUS_WOUND_CURE; break;
        case 3: woundMsgId = DiagnoseMessages.SEVERAL_WOUNDS_CURE; break;
        default: woundMsgId = DiagnoseMessages.SERIOUS_WOUNDS_CURE; break;
      }
      events.push(context.event('game.message', {
        messageId: woundMsgId,
        params: { turns: turnsToHeal }
      }));
    }

    // Strength/resilience status (canonical MDL melee.137:316-320)
    let strengthMsgId: string;
    switch (strengthLevel) {
      case 0: strengthMsgId = DiagnoseMessages.DEATHS_DOOR; break;
      case 1: strengthMsgId = DiagnoseMessages.ONE_MORE_WOUND; break;
      case 2: strengthMsgId = DiagnoseMessages.SERIOUS_WOUND_KILL; break;
      case 3: strengthMsgId = DiagnoseMessages.SURVIVE_SERIOUS; break;
      default: strengthMsgId = DiagnoseMessages.STRONG; break;
    }
    events.push(context.event('game.message', {
      messageId: strengthMsgId
    }));

    // Death count (canonical MDL melee.137:321-323)
    if (deaths === 1) {
      events.push(context.event('game.message', {
        messageId: DiagnoseMessages.KILLED_ONCE
      }));
    } else if (deaths === 2) {
      events.push(context.event('game.message', {
        messageId: DiagnoseMessages.KILLED_TWICE
      }));
    } else if (deaths > 2) {
      events.push(context.event('game.message', {
        messageId: DiagnoseMessages.KILLED_MANY,
        params: { count: deaths }
      }));
    }

    return events;
  }
};
