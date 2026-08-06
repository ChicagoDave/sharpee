/**
 * NPC behavior definitions for the regression test story.
 *
 * Public interface: patrolBotBehavior
 * Owner: npm regression test suite
 */

import { type NpcBehavior, type NpcContext, type NpcAction } from '@sharpee/stdlib';
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
 * Used to test NpcPlugin + NpcBehavior.
 */
export const patrolBotBehavior: NpcBehavior = {
  id: 'regression-patrol-bot',
  name: 'Patrol Bot',
  onTurn(context: NpcContext): NpcAction[] {
    if (!context.playerVisible) return [];
    if (context.random.chance(BOT_SPEAKS_POINT, 0.6)) {
      return [
        {
          type: 'speak',
          messageId: 'npc.speech',
          data: {
            text: context.random.pick(BOT_PHRASE_POINT, BOT_PHRASES),
          },
        },
      ];
    }
    return [];
  },
  onPlayerEnters(): NpcAction[] {
    return [
      {
        type: 'emote',
        messageId: 'npc.emote',
        data: {
          text: 'The maintenance bot swivels its optical sensor toward you.',
        },
      },
    ];
  },
};
