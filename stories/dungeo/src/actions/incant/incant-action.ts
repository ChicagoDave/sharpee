/**
 * INCANT Action
 *
 * Hidden cheat command from mainframe Dungeon that teleports the player
 * directly to the endgame. Uses challenge-response authentication with
 * the ENCRYP algorithm (key: ECORMS).
 *
 * Usage: INCANT <challenge> <response>
 * Examples:
 *   INCANT MHORAM DFNOBO
 *   INCANT DNZHUO IDEQTQ
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { IdentityTrait } from '@sharpee/world-model';
import { INCANT_ACTION_ID, IncantMessages } from './types';

/**
 * Port of ENCRYP subroutine from dso7.F by R. M. Supnik.
 * Computes the expected response for a given challenge.
 */
function encryp(challenge: string): string {
  const KEY = 'ECORMS';

  // Pad/truncate to 6 characters
  const inw = challenge.toUpperCase().padEnd(6, ' ').substring(0, 6);

  // Convert key to 1-26 range (A=1, B=2, ... Z=26)
  const ukeyw = KEY.split('').map(c => c.charCodeAt(0) - 64);

  // Handle input with cycling for short strings
  const uinw: number[] = [];
  let j = 0;
  const clean = inw.trim() || ' ';

  for (let i = 0; i < 6; i++) {
    let c = j < inw.length ? inw[j] : ' ';
    if (c.charCodeAt(0) <= 64) {
      j = 0;
      c = clean[0];
    }
    uinw.push(c.charCodeAt(0) - 64);
    j = (j + 1) % clean.length;
  }

  // Compute sums and initial mask
  const sumInput = uinw.reduce((a, b) => a + b, 0);
  const sumKey = ukeyw.reduce((a, b) => a + b, 0);
  let usum = (sumInput % 8) + (8 * (sumKey % 8));

  // Encrypt each character
  const result: string[] = [];
  for (let i = 0; i < 6; i++) {
    let val = ((uinw[i] ^ ukeyw[i]) ^ usum) & 31;
    usum = (usum + 1) % 32;
    if (val > 26) {
      val = val % 26;
    }
    val = Math.max(1, val);
    result.push(String.fromCharCode(val + 64));
  }

  return result.join('');
}

/**
 * Extract challenge and response from command
 */
function extractArgs(context: ActionContext): { challenge: string; response: string } | null {
  const rawInput = context.command.parsed?.rawInput?.toUpperCase() || '';

  // Match: INCANT <word1> <word2>
  const match = rawInput.match(/^INCANT\s+(\w+)\s+(\w+)/i);
  if (match) {
    return { challenge: match[1].toUpperCase(), response: match[2].toUpperCase() };
  }

  return null;
}

/**
 * INCANT action implementation
 */
export const incantAction: Action = {
  id: INCANT_ACTION_ID,
  group: 'meta',

  validate(context: ActionContext): ValidationResult {
    const args = extractArgs(context);

    if (!args) {
      return {
        valid: false,
        error: IncantMessages.syntax
      };
    }

    // Compute expected response
    const expectedResponse = encryp(args.challenge);

    if (args.response !== expectedResponse) {
      return {
        valid: false,
        error: IncantMessages.failure
      };
    }

    return { valid: true };
  },

  execute(context: ActionContext): void {
    const { world, player } = context;

    // Set endgame started flag
    world.setStateValue('game.endgameStarted', true);

    // Disable saving
    world.setStateValue('game.savingDisabled', true);

    // Reset score to 15/100 endgame points
    world.setStateValue('scoring.endgameScore', 15);
    world.setStateValue('scoring.endgameMaxScore', 100);

    // Try to find the elvish sword and give it to the player
    const allEntities = world.getAllEntities();
    const sword = allEntities.find(e => {
      const identity = e.get(IdentityTrait);
      return identity?.name?.toLowerCase().includes('elvish sword') ||
             identity?.aliases?.some((a: string) => a.toLowerCase().includes('elvish sword'));
    });

    if (sword) {
      const inventory = world.getContents(player.id);
      const hasSword = inventory.some(e => e.id === sword.id);
      if (!hasSword) {
        world.moveEntity(sword.id, player.id);
      }
    }

    // Teleport to Top of Stairs (if it exists)
    const topOfStairsId = world.getStateValue('endgame.topOfStairsId') as string | undefined;
    if (topOfStairsId) {
      world.moveEntity(player.id, topOfStairsId);
    } else {
      // If endgame rooms don't exist yet, just set a pending flag
      world.setStateValue('endgame.pendingTeleport', true);
    }

    context.sharedData.incantSuccess = true;
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('action.blocked', {
      actionId: INCANT_ACTION_ID,
      messageId: result.error || IncantMessages.failure,
      reason: result.error
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const { sharedData } = context;
    const events: ISemanticEvent[] = [];

    if (sharedData.incantSuccess) {
      events.push(context.event('game.message', {
        messageId: IncantMessages.success
      }));
    }

    return events;
  }
};

// Export for testing
export { encryp };
