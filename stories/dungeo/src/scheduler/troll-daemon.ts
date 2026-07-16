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
 * Note: The knockout transition (OUT!) is handled by the MeleeInterceptor's
 * UNCONSCIOUS path + handleVillainKnockout() (ISSUE-068 Phase 3)
 */

import { ISemanticEvent } from '@sharpee/core';
import { WorldModel, CombatantTrait, HealthTrait, HealthBehavior, IdentityTrait, RoomBehavior, Direction } from '@sharpee/world-model';
import { ISchedulerService, Daemon, SchedulerContext } from '@sharpee/plugin-scheduler';
import { DungeoSchedulerMessages } from './scheduler-messages';

// Daemon ID
const TROLL_RECOVERY_DAEMON = 'dungeo.troll.recovery';

// Descriptions from MDL source (dung.355)
const TROLLDESC = 'A nasty-looking troll stands here, wielding a bloody axe. He blocks the northern passage.';

// Entity IDs - set during registration
let trollId: string | null = null;
let trollRoomId: string | null = null;

// MDL growing-probability recovery accumulator (VILLAIN-PROBS element; melee.mud:67-76).
// Grows +10 each unconscious turn; reset to 0 on revival.
let recoveryAcc = 0;

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

      const health = troll.get(HealthTrait);
      if (!health) return false;

      // Run while the troll is alive but unconscious (health <= threshold) — ADR-226.
      return HealthBehavior.isAlive(health) && !HealthBehavior.isConscious(health);
    },

    run: (ctx: SchedulerContext): ISemanticEvent[] => {
      if (!trollId) return [];

      const troll = ctx.world.getEntity(trollId);
      if (!troll) return [];

      const health = troll.get(HealthTrait);
      if (!health) return [];

      const events: ISemanticEvent[] = [];

      // MDL canon recovery (melee.mud:67-76 + PROB util.mud:195, restored 2026-07-15):
      // growing-probability revival. Each unconscious turn the accumulator grows by 10
      // (turn 1 cannot revive); revive when a seeded roll (1..100) <= accumulator. The
      // port hardcodes LUCKY=T, so the good-luck branch prob = acc% is canon here.
      if (recoveryAcc > 0 && ctx.random.int(1, 100) <= recoveryAcc) {
        recoveryAcc = 0;

        // Revive WEAK: heal just above the unconsciousness threshold (health 3 for the
        // troll, max 10) so it wakes barely conscious — one hit from death — matching
        // MDL's "wakes at the strength it was beaten to". Consciousness derives from
        // health (ADR-226), so there is no flag to flip.
        health.health = Math.max(health.health, Math.floor(health.maxHealth * health.unconsciousThreshold) + 1);

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
        // which checks HealthBehavior.isAlive && !isConscious (derived from health)
        // It will automatically show the axe once the troll is conscious again

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
      } else {
        // Not yet revived — grow the revival probability for next turn (MDL +10/turn).
        recoveryAcc += 10;
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

  const health = troll.get(HealthTrait);
  if (!health) return null;

  return {
    id: trollId,
    isAlive: HealthBehavior.isAlive(health),
    isConscious: HealthBehavior.isConscious(health),
    recoveryTurns: recoveryAcc // now the MDL growing-probability accumulator
  };
}
