/**
 * Cage Poison Gas Daemon - ADR-071
 *
 * When the player triggers the cage trap (taking sphere with robot present),
 * poisonous gas starts filling the room. The player has 10 turns to tell
 * the robot to raise the cage before dying.
 *
 * From MDL source (act3.mud:242):
 *   <SETG SPHERE-CLOCK <CLOCK-INT ,SPHIN 10>>
 * Poison message (dung.mud:609):
 *   "Time passes...and you die from some obscure poisoning."
 */

import { ISemanticEvent } from '@sharpee/core';
import { WorldModel } from '@sharpee/world-model';
import { killPlayer } from '@sharpee/stdlib';
import { ISchedulerService, SchedulerContext, Daemon } from '@sharpee/plugin-scheduler';
import {
  CAGE_TRAPPED_KEY,
  CAGE_TURNS_KEY,
  CageMessages
} from '../interceptors/sphere-taking-interceptor';

export const CAGE_POISON_DAEMON_ID = 'dungeo.cage.poison';
const MAX_CAGE_TURNS = 10;

/**
 * Register the cage poison gas daemon.
 *
 * Runs every turn while player is trapped. After 10 turns, kills the player.
 */
export function registerCagePoisonDaemon(
  scheduler: ISchedulerService,
  world: WorldModel,
  dingyClosetId: string
): void {
  const daemon: Daemon = {
    id: CAGE_POISON_DAEMON_ID,
    name: 'Cage Poison Gas',
    priority: 20, // High priority - death trap

    condition: (_context: SchedulerContext): boolean => {
      return (world.getStateValue(CAGE_TRAPPED_KEY) as boolean) === true;
    },

    run: (context: SchedulerContext): ISemanticEvent[] => {
      const events: ISemanticEvent[] = [];
      const turnsTrapped = (world.getStateValue(CAGE_TURNS_KEY) as number) || 0;
      const newTurns = turnsTrapped + 1;
      world.setStateValue(CAGE_TURNS_KEY, newTurns);

      // At certain turns, warn about gas getting thicker
      if (newTurns === 3 || newTurns === 6 || newTurns === 9) {
        events.push({
          id: `cage-gas-warning-${context.turn}`,
          type: 'game.message',
          timestamp: Date.now(),
          entities: {},
          data: {
            messageId: CageMessages.GAS_WARNING,
            daemonId: CAGE_POISON_DAEMON_ID,
            turnsRemaining: MAX_CAGE_TURNS - newTurns
          }
        });
      }

      // Death at 10 turns
      if (newTurns >= MAX_CAGE_TURNS) {
        // Clear trapped state
        world.setStateValue(CAGE_TRAPPED_KEY, false);
        world.setStateValue(CAGE_TURNS_KEY, 0);

        // Poison gas room message
        events.push({
          id: `cage-poison-room-${context.turn}`,
          type: 'game.message',
          timestamp: Date.now(),
          entities: {},
          data: {
            messageId: CageMessages.POISON_GAS_ROOM
          }
        });

        // Death message
        events.push({
          id: `cage-poison-death-${context.turn}`,
          type: 'game.message',
          timestamp: Date.now(),
          entities: {},
          data: {
            messageId: CageMessages.POISON_DEATH
          }
        });

        // Canonical terminal death (ADR-224). Narration is the game.message
        // above, so the death event needs no messageId (avoids a duplicate render).
        const player = context.world.getPlayer();
        if (player) {
          const deathEvent = killPlayer(context.world, player, {
            cause: 'cage_poison',
            terminal: true,
          });
          if (deathEvent) events.push(deathEvent);
        }
      }

      return events;
    }
  };

  scheduler.registerDaemon(daemon);
}
