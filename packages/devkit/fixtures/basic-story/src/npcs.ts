/**
 * NPC behavior definitions for the regression test story.
 *
 * Public interface: patrolBotBehavior
 * Owner: npm regression test suite
 */

import { type NpcBehavior, type NpcContext } from '@sharpee/stdlib';
import { definePoint } from '@sharpee/core';

// Declared choice points (ADR-293): every draw names a point the author can
// force, trace, and see in coverage. The speak roll is a yes/no choice
// point; the phrase pick is a plain draw (no outcome classes).
const BOT_SPEAKS_POINT = definePoint('basic-story.patrol-bot.speaks', { classes: ['yes', 'no'] });
const BOT_PHRASE_POINT = definePoint('basic-story.patrol-bot.phrase');

const BOT_PHRASES = [
  'BEEP. Systems nominal.',
  'BOOP. Running diagnostics.',
  'WHIRR. All sectors clear.',
];

/**
 * Patrol Bot — an NPC that randomly speaks when the player is visible.
 * Used to test the engine's actor turn phase + NpcBehavior.
 */
export const patrolBotBehavior: NpcBehavior = {
  id: 'regression-patrol-bot',
  name: 'Patrol Bot',
  onTurn(context: NpcContext): void {
    if (!context.playerVisible) return;
    if (context.random.chance(BOT_SPEAKS_POINT, 0.6)) {
      context.narrate({ text: context.random.pick(BOT_PHRASE_POINT, BOT_PHRASES) });
    }
  },
  onPlayerEnters(context: NpcContext): void {
    context.narrate({ text: 'The maintenance bot swivels its optical sensor toward you.' });
  },
};
