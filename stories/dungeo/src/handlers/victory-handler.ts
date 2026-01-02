/**
 * Victory Handler - Treasury of Zork entry
 *
 * When the player enters the Treasury of Zork:
 * 1. Award 35 points (endgame score reaches 100)
 * 2. Display victory message
 * 3. Show final score and rank
 * 4. End the game
 */

import { ISemanticEvent, EntityId } from '@sharpee/core';
import { WorldModel } from '@sharpee/world-model';
import { ISchedulerService, Daemon, SchedulerContext } from '@sharpee/engine';

export const VictoryMessages = {
  ENTER_TREASURY: 'dungeo.victory.enter_treasury',
  VICTORY_TEXT: 'dungeo.victory.text',
  FINAL_SCORE: 'dungeo.victory.final_score',
  CONGRATULATIONS: 'dungeo.victory.congratulations',
} as const;

// State keys
const GAME_VICTORY_KEY = 'game.victory';
const GAME_ENDED_KEY = 'game.ended';
const ENDGAME_SCORE_KEY = 'scoring.endgameScore';

let eventCounter = 0;
function generateEventId(): string {
  return `victory-evt-${Date.now()}-${++eventCounter}`;
}

/**
 * Check if the player is in the Treasury
 */
function isInTreasury(world: WorldModel, treasuryId: EntityId): boolean {
  const player = world.getPlayer();
  if (!player) return false;

  const playerLocation = world.getLocation(player.id);
  return playerLocation === treasuryId;
}

/**
 * Create the victory daemon that watches for Treasury entry
 */
export function createVictoryDaemon(
  treasuryId: EntityId
): Daemon {
  let victoryTriggered = false;

  return {
    id: 'dungeo-victory',
    name: 'Victory Check',
    priority: 100, // Run last, after other game logic

    condition: (context: SchedulerContext): boolean => {
      // Only run if victory hasn't been triggered yet
      if (victoryTriggered) return false;

      // Check if game is in endgame
      const endgameStarted = context.world.getStateValue('game.endgameStarted') as boolean;
      if (!endgameStarted) return false;

      // Check if player is in Treasury
      return isInTreasury(context.world, treasuryId);
    },

    run: (context: SchedulerContext): ISemanticEvent[] => {
      const { world } = context;

      // Victory!
      victoryTriggered = true;

      // Award 35 points
      const currentScore = (world.getStateValue(ENDGAME_SCORE_KEY) as number) ?? 65;
      const finalScore = currentScore + 35;
      world.setStateValue(ENDGAME_SCORE_KEY, finalScore);

      // Mark game as won and ended
      world.setStateValue(GAME_VICTORY_KEY, true);
      world.setStateValue(GAME_ENDED_KEY, true);

      // Get main game score for total
      const mainScore = (world.getStateValue('scoring.score') as number) ?? 616;
      const totalScore = mainScore + finalScore;

      return [
        {
          id: generateEventId(),
          type: 'game.message',
          entities: {},
          data: {
            messageId: VictoryMessages.ENTER_TREASURY
          },
          timestamp: Date.now(),
          narrate: true
        },
        {
          id: generateEventId(),
          type: 'game.message',
          entities: {},
          data: {
            messageId: VictoryMessages.VICTORY_TEXT
          },
          timestamp: Date.now(),
          narrate: true
        },
        {
          id: generateEventId(),
          type: 'game.message',
          entities: {},
          data: {
            messageId: VictoryMessages.FINAL_SCORE,
            params: {
              endgameScore: finalScore,
              mainScore,
              totalScore
            }
          },
          timestamp: Date.now(),
          narrate: true
        },
        {
          id: generateEventId(),
          type: 'game.message',
          entities: {},
          data: {
            messageId: VictoryMessages.CONGRATULATIONS
          },
          timestamp: Date.now(),
          narrate: true
        },
        {
          id: generateEventId(),
          type: 'game.victory',
          entities: {},
          data: {
            totalScore,
            endgameScore: finalScore,
            mainScore
          },
          timestamp: Date.now(),
          narrate: false
        }
      ];
    }
  };
}

/**
 * Register the victory handler with the scheduler
 */
export function registerVictoryHandler(
  scheduler: ISchedulerService,
  treasuryId: EntityId
): void {
  const daemon = createVictoryDaemon(treasuryId);
  scheduler.registerDaemon(daemon);
}
