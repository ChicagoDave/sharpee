/**
 * Message registration module for Dungeo
 *
 * This module exports functions to register all story-specific messages
 * with the language provider. Messages are organized by category:
 *
 * - npc-messages.ts: NPC-related (Thief, Cyclops, Troll, Robot, DM)
 * - scheduler-messages.ts: Timed events (lantern, candles, dam, balloon)
 * - action-messages.ts: Action-specific (SAY, RING, BREAK, BURN, etc.)
 * - puzzle-messages.ts: Multi-step puzzles (Royal, Mirror, Laser, etc.)
 * - object-messages.ts: Object-specific and miscellaneous
 *
 * Usage:
 *   import { registerAllMessages } from './messages';
 *
 *   extendLanguage(language: LanguageProvider): void {
 *     registerAllMessages(language);
 *   }
 */

import type { LanguageProvider } from '@sharpee/lang-en-us';

// Import registration functions from each category
import { registerNpcMessages } from './npc-messages';
import { registerSchedulerMessages } from './scheduler-messages';
import { registerActionMessages } from './action-messages';
import { registerPuzzleMessages } from './puzzle-messages';
import { registerObjectMessages } from './object-messages';

// Re-export individual registration functions for selective use
export { registerNpcMessages } from './npc-messages';
export { registerSchedulerMessages } from './scheduler-messages';
export { registerActionMessages } from './action-messages';
export { registerPuzzleMessages } from './puzzle-messages';
export { registerObjectMessages } from './object-messages';

/**
 * Register all Dungeo messages with the language provider.
 *
 * This is the main entry point for message registration. It calls all
 * category-specific registration functions in order.
 *
 * @param language - The language provider to register messages with
 */
export function registerAllMessages(language: LanguageProvider): void {
  // Register messages by category
  registerNpcMessages(language);
  registerSchedulerMessages(language);
  registerActionMessages(language);
  registerPuzzleMessages(language);
  registerObjectMessages(language);

  // Game lifecycle messages
  registerGameMessages(language);
}

/**
 * Register game lifecycle messages (opening banner, etc.)
 * These override the platform defaults with Dungeo-specific content.
 */
function registerGameMessages(language: LanguageProvider): void {
  // Override platform "You take X from Y" with canonical Zork "Taken."
  // Mainframe Zork always says "Taken." regardless of source (room, container, supporter)
  language.addMessage('if.action.taking.taken_from', 'Taken.');

  // Opening banner — handled by the engine's `handleGameStarted` from
  // structured story config (title, version, engineVersion, description,
  // credits[]). This template fills the story-specific tail that
  // follows the banner spacer.
  language.addMessage(
    'game.banner.story-tail',
    'Type HELP for instructions, ABOUT for credits.',
  );

  // VERSION command — keeps the legacy single-string format for now.
  // Splits into one block per line via `createBlocks` downstream.
  language.addMessage(
    'if.action.version',
    `{title}

Story v{version} (built {buildDate})
Sharpee v{engineVersion}

A port of Mainframe Zork (1981)
By {author}
Ported by David Cornelson

Type HELP for instructions, ABOUT for credits.`,
  );

  // HELP — the stdlib help action emits messageIds if.action.help.first_time /
  // if.action.help.general, which have no registered templates; the engine's
  // canonical fallback handler renders to the 'help.text' block key, which the
  // stdlib main channel does not route (MAIN_KEYS). Registering the text here
  // sends it through the messageId path as action.result, which IS routed.
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
  TURN ON / TURN OFF something - Operate a switch or device.
  READ something - Read text on an object.

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
  language.addMessage('if.action.help.first_time', HELP_TEXT);
  language.addMessage('if.action.help.general', HELP_TEXT);

  // ABOUT / INFO / CREDITS — same routing gap as HELP: the stdlib about action
  // emits if.action.about.success (unregistered) and the engine's banner
  // fallback renders to 'about.text', which main does not route. Params come
  // from the event's nested params (title, author, description, portedBy, …).
  language.addMessage(
    'if.action.about.success',
    `{verbatim:title}

{verbatim:description}
By {verbatim:author}
Ported by {verbatim:portedBy}

Sharpee v{verbatim:engineVersion}`,
  );

  // SAVE / UNDO — narrated by the platform since 2026-07-02: the prose
  // pipeline renders platform.* completion events via lang-en-us messages
  // registered under the event type ("Saved.", "Previous turn undone.", …).
  // The former story-side workarounds (if.event.save_requested template and
  // the actions/undo override) were removed with that fix.
}
