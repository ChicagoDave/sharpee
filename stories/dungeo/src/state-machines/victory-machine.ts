/**
 * Victory State Machine
 *
 * Triggers when the player enters the Treasury of Zork during the endgame.
 * Awards 35 points, displays victory messages, and ends the game.
 *
 * States:
 *   playing → game in progress (default)
 *   victory → player has won (terminal)
 *
 * Trigger: if.event.actor_moved with toRoom matching Treasury
 * Guard: game.endgameStarted must be true
 *
 * Replaces: registerVictoryHandler daemon from victory-handler.ts
 */

import { StateMachineDefinition, CustomEffect } from '@sharpee/plugin-state-machine';

export const VictoryMessages = {
  ENTER_TREASURY: 'dungeo.victory.enter_treasury',
  VICTORY_TEXT: 'dungeo.victory.text',
  FINAL_SCORE: 'dungeo.victory.final_score',
  CONGRATULATIONS: 'dungeo.victory.congratulations',
} as const;

function makeVictoryEffect(): CustomEffect {
  return {
    type: 'custom',
    execute: (world, _bindings, _playerId) => {
      // Award 35 points for entering Treasury
      const currentScore = (world.getStateValue('scoring.endgameScore') as number) || 0;
      const finalScore = currentScore + 35;
      world.setStateValue('scoring.endgameScore', finalScore);

      // Mark game as won and ended
      world.setStateValue('game.victory', true);
      world.setStateValue('game.ended', true);

      // Get main game score for total
      const mainScore = (world.getStateValue('scoring.score') as number) || 0;
      const totalScore = mainScore + finalScore;

      return {
        messages: [
          { messageId: VictoryMessages.ENTER_TREASURY },
          { messageId: VictoryMessages.VICTORY_TEXT },
          {
            messageId: VictoryMessages.FINAL_SCORE,
            params: {
              endgameScore: finalScore,
              mainScore,
              totalScore,
            },
          },
          { messageId: VictoryMessages.CONGRATULATIONS },
        ],
        events: [{
          type: 'game.victory',
          data: {
            totalScore,
            endgameScore: finalScore,
            mainScore,
          },
        }],
      };
    },
  };
}

export function createVictoryMachine(treasuryId: string): StateMachineDefinition {
  return {
    id: 'dungeo.victory',
    description: 'Triggers victory when player enters Treasury of Zork during endgame',
    initialState: 'playing',

    states: {
      playing: {
        description: 'Game in progress',
        transitions: [{
          target: 'victory',
          trigger: {
            type: 'event',
            eventId: 'if.event.actor_moved',
            filter: { toRoom: treasuryId },
          },
          guard: {
            type: 'state',
            key: 'game.endgameStarted',
            value: true,
          },
          effects: [
            makeVictoryEffect(),
          ],
        }],
      },

      victory: {
        description: 'Player has won the game',
        terminal: true,
      },
    },
  };
}
