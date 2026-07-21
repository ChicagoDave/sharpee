/**
 * ACCUSE action — the player makes a formal accusation.
 *
 * Usage: ACCUSE [suspect] WITH [weapon] IN [location]
 * Three attempts maximum. Hints on first two failures, game over on third.
 *
 * Public interface: createAccuseAction(), AccuseActionHandle, ACCUSE_ACTION_ID
 * Owner: thealderman story
 *
 * ADR-248: accusation state and the randomized solution live in a closure
 * created per `createAccuseAction()` call (owned by the story instance),
 * never at module level — a fresh `createStory()` gets fully fresh state.
 */

import { Action } from '@sharpee/stdlib';
import type { ActionContext, ValidationResult } from '@sharpee/stdlib';
import type { ISemanticEvent } from '@sharpee/core';
import { MSG } from '../messages';

export const ACCUSE_ACTION_ID = 'alderman.action.accuse';

/**
 * A per-story-instance accuse action plus its solution setter.
 */
export interface AccuseActionHandle {
  /** The ACCUSE action to register via `getCustomActions()`. */
  action: Action;
  /**
   * Configures the correct solution for this playthrough.
   *
   * @param killerId - Entity ID of the killer
   * @param weaponId - Entity ID of the murder weapon
   * @param locationId - Room ID of the murder location
   */
  setSolution(killerId: string, weaponId: string, locationId: string): void;
}

/**
 * Creates a fresh ACCUSE action with its own accusation/solution state.
 *
 * @returns The action and the setter the randomization system wires up.
 */
export function createAccuseAction(): AccuseActionHandle {
  /** Tracks accusation state across turns (per story instance). */
  let accusationCount = 0;

  /** Set by the randomization system at game start. */
  let solution = {
    killerId: '',
    weaponId: '',
    locationId: '',
  };

  const action: Action = {
    id: ACCUSE_ACTION_ID,
    group: 'investigation',

    validate(context: ActionContext): ValidationResult {
      const target = context.command.directObject?.entity;
      if (!target) {
        return { valid: false, error: 'no_target' };
      }
      if (accusationCount >= 3) {
        return { valid: false, error: 'too_many' };
      }
      return { valid: true };
    },

    execute(context: ActionContext): void {
      const target = context.command.directObject?.entity;
      const weapon = context.command.indirectObject?.entity;

      accusationCount++;

      const killerCorrect = target?.id === solution.killerId;
      const weaponCorrect = weapon?.id === solution.weaponId;

      // Location check: player's current room matches murder location
      const playerLocation = context.world.getLocation(context.player.id);
      const locationCorrect = playerLocation === solution.locationId;

      context.sharedData.killerCorrect = killerCorrect;
      context.sharedData.weaponCorrect = weaponCorrect;
      context.sharedData.locationCorrect = locationCorrect;
      context.sharedData.allCorrect = killerCorrect && weaponCorrect && locationCorrect;
      context.sharedData.attempt = accusationCount;
    },

    report(context: ActionContext): ISemanticEvent[] {
      const allCorrect = context.sharedData.allCorrect as boolean;
      const attempt = context.sharedData.attempt as number;

      if (allCorrect) {
        return [context.event('alderman.event.accusation', {
          messageId: MSG.ACCUSE_CORRECT,
          params: {},
          correct: true,
        })];
      }

      // Build hint about which part is wrong
      const hints: string[] = [];
      if (!context.sharedData.killerCorrect) hints.push('suspect');
      if (!context.sharedData.weaponCorrect) hints.push('weapon');
      if (!context.sharedData.locationCorrect) hints.push('location');

      if (attempt >= 3) {
        return [context.event('alderman.event.accusation', {
          messageId: MSG.ACCUSE_WRONG_FINAL,
          params: { killerId: solution.killerId, weaponId: solution.weaponId, locationId: solution.locationId },
          correct: false,
          gameOver: true,
        })];
      }

      return [context.event('alderman.event.accusation', {
        messageId: MSG.ACCUSE_WRONG_HINT,
        params: { wrongPart: hints[0], attempt },
        correct: false,
      })];
    },

    blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
      const messageId = result.error === 'too_many'
        ? MSG.ACCUSE_TOO_MANY
        : MSG.ACCUSE_NO_TARGET;
      return [context.event('alderman.event.accusation', {
        messageId,
        params: {},
        blocked: true,
      })];
    },
  };

  return {
    action,
    setSolution(killerId: string, weaponId: string, locationId: string): void {
      solution = { killerId, weaponId, locationId };
    },
  };
}
