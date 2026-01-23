/**
 * Diagnose Action
 *
 * Reports the player's current state of health.
 * Matches the 1981 Mainframe Zork DIAGNOSE output.
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { CombatantTrait } from '@sharpee/world-model';
import { DIAGNOSE_ACTION_ID, DiagnoseMessages } from './types';

interface DiagnoseSharedData {
  health: number;
  maxHealth: number;
  woundLevel: number;  // 0 = healthy, 1-4 = wound severity
  strengthLevel: number;  // How much damage can be taken
  deaths: number;
  turnsToHeal?: number;
}

function getDiagnoseSharedData(context: ActionContext): DiagnoseSharedData {
  return context.sharedData as DiagnoseSharedData;
}

export const diagnoseAction: Action = {
  id: DIAGNOSE_ACTION_ID,
  group: 'meta',

  validate(context: ActionContext): ValidationResult {
    // Diagnose always succeeds
    return { valid: true };
  },

  execute(context: ActionContext): void {
    const { world } = context;
    const player = world.getPlayer();
    const sharedData = getDiagnoseSharedData(context);

    if (!player) {
      sharedData.health = 100;
      sharedData.maxHealth = 100;
      sharedData.woundLevel = 0;
      sharedData.strengthLevel = 4;
      sharedData.deaths = 0;
      return;
    }

    // Get combatant trait for health info
    const combatant = player.get<CombatantTrait>('combatant');

    if (combatant) {
      sharedData.health = combatant.health;
      sharedData.maxHealth = combatant.maxHealth;

      // Calculate wound level based on health percentage
      // MDL uses negative ASTRENGTH values for wounds
      // We'll map health percentage to wound levels
      const healthPercent = combatant.health / combatant.maxHealth;

      if (healthPercent >= 1.0) {
        sharedData.woundLevel = 0;  // Perfect health
      } else if (healthPercent >= 0.75) {
        sharedData.woundLevel = 1;  // Light wound
      } else if (healthPercent >= 0.5) {
        sharedData.woundLevel = 2;  // Serious wound
      } else if (healthPercent >= 0.25) {
        sharedData.woundLevel = 3;  // Several wounds
      } else {
        sharedData.woundLevel = 4;  // Serious wounds
      }

      // Strength level indicates how much more damage can be taken
      // Map remaining health to strength levels
      if (combatant.health <= 0) {
        sharedData.strengthLevel = 0;  // Death's door
      } else if (combatant.health <= 10) {
        sharedData.strengthLevel = 1;  // One more wound kills
      } else if (combatant.health <= 25) {
        sharedData.strengthLevel = 2;  // Serious wound kills
      } else if (combatant.health <= 50) {
        sharedData.strengthLevel = 3;  // Can survive one serious
      } else {
        sharedData.strengthLevel = 4;  // Strong
      }

      // Calculate turns to heal (30 turns per wound level)
      if (sharedData.woundLevel > 0) {
        sharedData.turnsToHeal = 30 * sharedData.woundLevel;
      }
    } else {
      // Default healthy state if no combatant trait
      sharedData.health = 100;
      sharedData.maxHealth = 100;
      sharedData.woundLevel = 0;
      sharedData.strengthLevel = 4;
    }

    // Get death count from world state
    sharedData.deaths = (world.getStateValue('dungeo.player.deaths') as number) || 0;
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

    // Emit diagnose event with all health data
    events.push(context.event('dungeo.event.diagnose', {
      health: sharedData.health,
      maxHealth: sharedData.maxHealth,
      woundLevel: sharedData.woundLevel,
      strengthLevel: sharedData.strengthLevel,
      deaths: sharedData.deaths,
      turnsToHeal: sharedData.turnsToHeal,
    }));

    return events;
  }
};
