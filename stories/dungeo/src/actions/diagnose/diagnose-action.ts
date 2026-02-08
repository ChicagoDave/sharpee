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

    events.push(context.event('dungeo.event.diagnose', {
      woundLevel: sharedData.woundLevel,
      strengthLevel: sharedData.strengthLevel,
      deaths: sharedData.deaths,
      turnsToHeal: sharedData.turnsToHeal,
    }));

    return events;
  }
};
