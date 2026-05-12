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
}
