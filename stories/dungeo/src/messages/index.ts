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
}
