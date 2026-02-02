/**
 * Help Event Handler
 *
 * Handles if.event.help_displayed to produce help text output.
 * Content based on the PR-IF "How to Play Interactive Fiction" card.
 *
 * @see ADR-096 Text Service Architecture
 */

import type { ITextBlock } from '@sharpee/text-blocks';
import type { ISemanticEvent } from '@sharpee/core';
import { createBlock } from '../stages/assemble.js';
import type { HandlerContext } from './types.js';

const HELP_TEXT = `HOW TO PLAY INTERACTIVE FICTION

Interactive fiction is a conversation between you and the game. You type commands; the game describes what happens.

MOVING AROUND
  Type a direction to move: NORTH (N), SOUTH (S), EAST (E), WEST (W),
  NORTHEAST (NE), NORTHWEST (NW), SOUTHEAST (SE), SOUTHWEST (SW),
  UP (U), DOWN (D), IN, OUT, ENTER, EXIT.

LOOKING AND EXAMINING
  LOOK (L) - Describe your surroundings.
  EXAMINE (X) something - Look closely at an object.

INTERACTING WITH OBJECTS
  TAKE (GET) something - Pick it up.
  DROP something - Put it down.
  OPEN / CLOSE something - Open or close a door, container, etc.
  PUT something IN / ON something - Place an object in a container or on a surface.
  LOCK / UNLOCK something WITH something - Lock or unlock with a key.
  TURN ON / TURN OFF something - Operate a switch or device.
  WEAR / TAKE OFF something - Put on or remove clothing.
  EAT / DRINK something - Consume food or drink.
  READ something - Read text on an object.
  SEARCH something - Search a container or area.
  LOOK UNDER / LOOK BEHIND something - Check hidden spots.

TALKING TO CHARACTERS
  TALK TO someone - Start a conversation.
  ASK someone ABOUT something - Ask about a topic.
  TELL someone ABOUT something - Tell them something.
  GIVE something TO someone - Hand over an item.
  SHOW something TO someone - Display an item.

OTHER COMMANDS
  INVENTORY (I) - List what you're carrying.
  WAIT (Z) - Let time pass.
  AGAIN (G) - Repeat your last command.
  SCORE - Check your progress.
  SAVE / RESTORE - Save or load your game.
  UNDO - Take back your last move.
  QUIT - End the game.
  ABOUT - Information about this game.

When in doubt, EXAMINE everything.`;

/**
 * Handle if.event.help_displayed to produce help text.
 */
export function handleHelpDisplayed(
  _event: ISemanticEvent,
  _context: HandlerContext
): ITextBlock[] {
  return [createBlock('help.text', HELP_TEXT)];
}
