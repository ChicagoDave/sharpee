/**
 * Deadly-room death action (ADR-224) — the generic redirect target.
 *
 * Not parseable: it has no grammar. The deadly-room command transformer redirects a
 * lethal verb here, threading the death `cause`/`messageId` through the parsed
 * command's `extras`. `execute` applies the lethal transition via `killPlayer`
 * (mutation belongs in execute, ADR-051) and `report` emits the canonical death
 * event it produced. Folds MDL's story-specific falls-death action into one platform
 * primitive shared by every deadly room.
 *
 * Public interface: `deadlyRoomDeathAction`.
 * Owner context: `@sharpee/stdlib` — the player-death primitive (ADR-224).
 */

import { ISemanticEvent } from '@sharpee/core';
import { Action, ActionContext, ValidationResult } from '../../enhanced-types.js';
import {
  killPlayer,
  DEADLY_ROOM_DEATH_ACTION_ID,
  DEADLY_ROOM_CAUSE_KEY,
  DEADLY_ROOM_MESSAGE_KEY,
} from '../../../death/index.js';

/** Cross-phase state: the death event produced in `execute`, emitted in `report`. */
interface DeadlyRoomDeathSharedData {
  deadlyRoomDeathEvent?: ISemanticEvent | null;
}

export const deadlyRoomDeathAction: Action = {
  id: DEADLY_ROOM_DEATH_ACTION_ID,
  group: 'special',

  validate(_context: ActionContext): ValidationResult {
    // Death is inevitable once redirected here — the transformer already decided.
    return { valid: true };
  },

  execute(context: ActionContext): void {
    const extras = context.command.parsed?.extras ?? {};
    const cause = (extras[DEADLY_ROOM_CAUSE_KEY] as string | undefined) ?? 'hazard';
    const messageId = extras[DEADLY_ROOM_MESSAGE_KEY] as string | undefined;

    const event = killPlayer(context.world, context.player, {
      cause,
      messageId,
      terminal: true,
    });
    (context.sharedData as DeadlyRoomDeathSharedData).deadlyRoomDeathEvent = event;
  },

  blocked(_context: ActionContext, _result: ValidationResult): ISemanticEvent[] {
    return [];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const event = (context.sharedData as DeadlyRoomDeathSharedData).deadlyRoomDeathEvent;
    return event ? [event] : [];
  },
};
