/**
 * Troll Recovery Daemon - ADR-071 Phase 2
 *
 * Handles troll recovery after being knocked out:
 * - Counts down recoveryTurns each turn
 * - When recovered: Wake up, change description, re-block exits
 * - Emits message if player is present when troll wakes
 *
 * From MDL source (act1.254):
 * - IN!: Show axe, message if player present, restore description, clear flag (exits blocked)
 *
 * Note: The knockout transition (OUT!) is handled by the troll's entity event handler
 * for 'if.event.knocked_out' in underground.ts
 */

import { ISemanticEvent } from '@sharpee/core';
import { WorldModel, CombatantTrait, IdentityTrait, RoomBehavior, Direction } from '@sharpee/world-model';
import { ISchedulerService, Daemon, SchedulerContext } from '@sharpee/plugin-scheduler';
import { DungeoSchedulerMessages } from './scheduler-messages';

// Daemon ID
const TROLL_RECOVERY_DAEMON = 'dungeo.troll.recovery';

// Descriptions from MDL source (dung.355)
const TROLLDESC = 'A nasty-looking troll stands here, wielding a bloody axe. He blocks the northern passage.';

// Entity IDs - set during registration
let trollId: string | null = null;
let trollRoomId: string | null = null;

/**
 * Find the troll entity in the world
 */
function findTroll(world: WorldModel): string | null {
  // Scan for entity with name containing 'troll' and CombatantTrait
  const entities = world.getAllEntities();
  for (const entity of entities) {
    const identity = entity.get(IdentityTrait);
    if (identity?.name?.toLowerCase().includes('troll')) {
      const combatant = entity.get(CombatantTrait);
      if (combatant) {
        return entity.id;
      }
    }
  }
  return null;
}

/**
 * Create the troll recovery daemon
 */
function createTrollRecoveryDaemon(): Daemon {
  return {
    id: TROLL_RECOVERY_DAEMON,
    name: 'Troll Recovery',
    priority: 10, // Higher priority - important state change

    // Only run when troll exists and is unconscious
    condition: (ctx: SchedulerContext): boolean => {
      if (!trollId) {
        trollId = findTroll(ctx.world);
      }
      if (!trollId) return false;

      const troll = ctx.world.getEntity(trollId);
      if (!troll) return false;

      const combatant = troll.get(CombatantTrait);
      if (!combatant) return false;

      // Only run when troll is alive but unconscious with recovery turns
      return combatant.isAlive && !combatant.isConscious && combatant.recoveryTurns !== undefined;
    },

    run: (ctx: SchedulerContext): ISemanticEvent[] => {
      if (!trollId) return [];

      const troll = ctx.world.getEntity(trollId);
      if (!troll) return [];

      const combatant = troll.get(CombatantTrait);
      if (!combatant || combatant.recoveryTurns === undefined) return [];

      const events: ISemanticEvent[] = [];

      // Count down recovery
      combatant.recoveryTurns--;

      if (combatant.recoveryTurns <= 0) {
        // Troll wakes up! (IN! transition)
        combatant.wakeUp();

        // Restore description to TROLLDESC
        const identity = troll.get(IdentityTrait);
        if (identity) {
          identity.description = TROLLDESC;
        }

        // Re-block north exit
        if (trollRoomId) {
          const room = ctx.world.getEntity(trollRoomId);
          if (room) {
            RoomBehavior.blockExit(room, Direction.NORTH, 'The troll blocks your way.');
          }
        }

        // Note: Axe visibility is handled by TrollAxeVisibilityBehavior
        // which checks combatant.isAlive && !combatant.isConscious
        // It will automatically show the axe when isConscious becomes true

        // Only emit wake-up message if player is in the troll room
        if (trollRoomId && ctx.playerLocation === trollRoomId) {
          events.push({
            id: `troll-wakeup-${ctx.turn}`,
            type: 'game.message',
            timestamp: Date.now(),
            entities: { target: trollId },
            data: {
              messageId: DungeoSchedulerMessages.TROLL_WAKES_UP,
              daemonId: TROLL_RECOVERY_DAEMON
            },
            narrate: true
          });
        }
      }

      return events;
    }
  };
}

/**
 * Register the troll recovery daemon
 *
 * Call this from story.onEngineReady() with the troll room ID.
 */
export function registerTrollRecoveryDaemon(
  scheduler: ISchedulerService,
  roomId: string
): void {
  trollRoomId = roomId;
  trollId = null; // Will be found on first run

  scheduler.registerDaemon(createTrollRecoveryDaemon());
}

/**
 * Check if the troll recovery daemon is active
 */
export function isTrollRecoveryActive(scheduler: ISchedulerService): boolean {
  return scheduler.hasDaemon(TROLL_RECOVERY_DAEMON);
}

/**
 * Get current troll state for debugging
 */
export function getTrollState(world: WorldModel): {
  id: string | null;
  isAlive: boolean;
  isConscious: boolean;
  recoveryTurns: number | undefined;
} | null {
  if (!trollId) {
    trollId = findTroll(world);
  }
  if (!trollId) return null;

  const troll = world.getEntity(trollId);
  if (!troll) return null;

  const combatant = troll.get(CombatantTrait);
  if (!combatant) return null;

  return {
    id: trollId,
    isAlive: combatant.isAlive,
    isConscious: combatant.isConscious,
    recoveryTurns: combatant.recoveryTurns
  };
}
