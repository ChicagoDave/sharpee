/**
 * NPC behavior definitions for the regression test story.
 *
 * Public interface: patrolBotBehavior
 * Owner: npm regression test suite
 */

import { NpcBehavior, NpcContext, NpcAction } from '@sharpee/stdlib';

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
    if (context.random.chance(0.6)) {
      return [
        {
          type: 'speak',
          messageId: 'npc.speech',
          data: {
            npcName: 'maintenance bot',
            text: context.random.pick(BOT_PHRASES),
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
          npcName: 'maintenance bot',
          text: 'The maintenance bot swivels its optical sensor toward you.',
        },
      },
    ];
  },
};
