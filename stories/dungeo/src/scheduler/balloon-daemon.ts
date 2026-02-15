/**
 * Balloon Daemon - ADR-071 Hot Air Balloon Movement
 *
 * The balloon daemon controls the hot air balloon's vertical movement through
 * the volcano shaft. It fires every 3 turns when enabled.
 *
 * FORTRAN behavior (from timefnc.for CEVBAL):
 * - Daemon fires every 3 turns (CTICK=3)
 * - When tethered (BTIEF != 0): daemon is disabled
 * - When burning object in receptacle: balloon rises
 * - When no fire or receptacle closed: balloon descends
 * - Crash at VAIR4 (top) destroys balloon and kills player
 *
 * Positions:
 * - vlbot (126): Volcano Bottom - ground level
 * - vair1-4 (127-130): Mid-air positions
 * - ledg2-4 (131-133): Ledge positions (dockable)
 */

import { ISemanticEvent } from '@sharpee/core';
import { WorldModel, IdentityTrait, OpenableTrait, ContainerTrait, VehicleTrait, moveVehicle } from '@sharpee/world-model';
import { ISchedulerService, Daemon, SchedulerContext } from '@sharpee/plugin-scheduler';
import { DungeoSchedulerMessages } from './scheduler-messages';
import {
  BurnableTrait,
  BalloonStateTrait,
  BalloonPosition,
  nextPositionUp,
  nextPositionDown,
  isMidairPosition,
  isLedgePosition
} from '../traits';

// Daemon ID
const BALLOON_DAEMON_ID = 'dungeo.balloon.movement';

// Configuration
const DAEMON_INTERVAL = 3;  // Fire every 3 turns

// Internal state
let lastFireTurn = 0;
let balloonEntityId: string | null = null;
let receptacleEntityId: string | null = null;

/**
 * Check if the receptacle has a burning object inside
 */
function hasHeatSource(world: WorldModel): boolean {
  if (!receptacleEntityId) return false;

  const receptacle = world.getEntity(receptacleEntityId);
  if (!receptacle) return false;

  // Check if receptacle is open
  const openable = receptacle.get(OpenableTrait);
  if (!openable?.isOpen) return false;

  // Check for burning objects inside via BurnableTrait
  const contents = world.getContents(receptacleEntityId);
  return contents.some(item => item.get(BurnableTrait)?.isBurning === true);
}

/**
 * Get the balloon entity and its state trait
 */
function getBalloonState(world: WorldModel): { entity: any; state: BalloonStateTrait } | null {
  if (!balloonEntityId) return null;

  const balloon = world.getEntity(balloonEntityId);
  if (!balloon) return null;

  const state = balloon.get(BalloonStateTrait);
  if (!state) return null;

  return { entity: balloon, state };
}

/**
 * Get the balloon's current position from VehicleTrait (authoritative)
 */
function getCurrentPosition(world: WorldModel): BalloonPosition | null {
  if (!balloonEntityId) return null;

  const balloon = world.getEntity(balloonEntityId);
  if (!balloon) return null;

  const vehicle = balloon.get(VehicleTrait);
  return (vehicle?.currentPosition as BalloonPosition) || null;
}

/**
 * Check if player is in the balloon
 */
function isPlayerInBalloon(world: WorldModel): boolean {
  if (!balloonEntityId) return false;

  const player = world.getPlayer();
  if (!player) return false;

  const playerLocation = world.getLocation(player.id);
  return playerLocation === balloonEntityId;
}

/**
 * Get message for position
 */
function getPositionMessage(position: BalloonPosition, isRising: boolean): string {
  if (position === 'vair4') {
    return DungeoSchedulerMessages.BALLOON_CRASH;
  }

  if (position === 'vlbot') {
    return DungeoSchedulerMessages.BALLOON_LANDED;
  }

  if (isLedgePosition(position)) {
    return DungeoSchedulerMessages.BALLOON_AT_LEDGE;
  }

  return isRising
    ? DungeoSchedulerMessages.BALLOON_RISING
    : DungeoSchedulerMessages.BALLOON_FALLING;
}

/**
 * Handle balloon crash - kills player and destroys balloon
 *
 * Per MDL/FORTRAN: balloon hits ceiling, bag tears, plunges to ground.
 * Player dies if inside. Balloon is destroyed (moved to limbo).
 */
function handleCrash(world: WorldModel, ctx: SchedulerContext): ISemanticEvent[] {
  const events: ISemanticEvent[] = [];

  const playerInBalloon = isPlayerInBalloon(world);

  // Emit crash message
  events.push({
    id: `balloon-crash-${ctx.turn}`,
    type: 'if.event.player.died',
    timestamp: Date.now(),
    entities: { target: balloonEntityId || '' },
    data: {
      messageId: DungeoSchedulerMessages.BALLOON_CRASH,
      daemonId: BALLOON_DAEMON_ID,
      cause: 'balloon_crash',
      balloonId: balloonEntityId
    }
  });

  // Kill player if inside balloon
  if (playerInBalloon) {
    world.setStateValue('dungeo.player.dead', true);
    world.setStateValue('dungeo.player.death_cause', 'balloon_crash');
  }

  // Disable the balloon daemon — balloon is destroyed
  if (balloonEntityId) {
    const balloon = world.getEntity(balloonEntityId);
    if (balloon) {
      const state = balloon.get(BalloonStateTrait);
      if (state) {
        state.daemonEnabled = false;
      }
    }
  }

  return events;
}

/**
 * Create the balloon movement daemon
 */
function createBalloonDaemon(): Daemon {
  return {
    id: BALLOON_DAEMON_ID,
    name: 'Balloon Movement',
    priority: 5,  // Medium priority

    // Only run when balloon exists and daemon is enabled
    condition: (ctx: SchedulerContext): boolean => {
      const balloon = getBalloonState(ctx.world);
      if (!balloon) return false;

      // Check if daemon is enabled
      if (!balloon.state.daemonEnabled) return false;

      // Check interval (every 3 turns)
      if (ctx.turn - lastFireTurn < DAEMON_INTERVAL) return false;

      return true;
    },

    run: (ctx: SchedulerContext): ISemanticEvent[] => {
      const events: ISemanticEvent[] = [];

      const balloon = getBalloonState(ctx.world);
      if (!balloon) return events;

      const { state } = balloon;
      const currentPos = getCurrentPosition(ctx.world);
      if (!currentPos) return events;

      const hasHeat = hasHeatSource(ctx.world);
      const playerInBalloon = isPlayerInBalloon(ctx.world);

      // Determine movement direction
      let newPosition: BalloonPosition | null = null;

      if (hasHeat) {
        newPosition = nextPositionUp(currentPos);
      } else {
        newPosition = nextPositionDown(currentPos);
      }

      // Check for crash: rising past VAIR4 (above volcano rim)
      if (newPosition === null && hasHeat && currentPos === 'vair4') {
        lastFireTurn = ctx.turn;
        return handleCrash(ctx.world, ctx);
      }

      // If no movement possible (at bottom with no heat, or at top), skip
      // Don't update lastFireTurn so the daemon fires immediately when conditions change
      if (newPosition === null) {
        return events;
      }

      // Balloon actually moves — update the fire timer
      lastFireTurn = ctx.turn;

      // Physically move balloon entity to the new room
      const vehicle = balloon.entity.get(VehicleTrait);
      const destRoomId = vehicle?.positionRooms?.[newPosition];
      if (destRoomId) {
        moveVehicle(ctx.world, balloonEntityId!, destRoomId);
      }

      // Emit movement message if player is in balloon
      if (playerInBalloon) {
        const messageId = getPositionMessage(newPosition, hasHeat);

        events.push({
          id: `balloon-move-${ctx.turn}`,
          type: 'daemon.message',
          timestamp: Date.now(),
          entities: { target: balloonEntityId || '' },
          data: {
            messageId,
            daemonId: BALLOON_DAEMON_ID,
            oldPosition: currentPos,
            newPosition,
            isRising: hasHeat,
            balloonId: balloonEntityId,
            params: {
              from: currentPos,
              to: newPosition
            }
          }
        });

        // If we've arrived at or near a dockable ledge, mention the hook
        // vair2 is near Narrow Ledge, vair4 is near Wide Ledge
        if (isLedgePosition(newPosition) || newPosition === 'vair2' || newPosition === 'vair4') {
          events.push({
            id: `balloon-ledge-${ctx.turn}`,
            type: 'daemon.message',
            timestamp: Date.now(),
            entities: {},
            data: {
              messageId: DungeoSchedulerMessages.BALLOON_HOOK_VISIBLE,
              daemonId: BALLOON_DAEMON_ID,
              balloonId: balloonEntityId
            }
          });
        }
      }

      return events;
    }
  };
}

/**
 * Register the balloon daemon
 *
 * Call this from story initialization with the balloon and receptacle IDs.
 */
export function registerBalloonDaemon(
  scheduler: ISchedulerService,
  world: WorldModel,
  balloonId: string,
  receptacleId: string
): void {
  balloonEntityId = balloonId;
  receptacleEntityId = receptacleId;

  scheduler.registerDaemon(createBalloonDaemon());
}

/**
 * Check if the balloon daemon is active
 */
export function isBalloonDaemonActive(scheduler: ISchedulerService): boolean {
  return scheduler.hasDaemon(BALLOON_DAEMON_ID);
}

/**
 * Get balloon position (from VehicleTrait — authoritative)
 */
export function getBalloonPosition(world: WorldModel): BalloonPosition | null {
  return getCurrentPosition(world);
}

/**
 * Reset daemon timer (called after tying/untying)
 */
export function resetBalloonDaemonTimer(): void {
  lastFireTurn = 0;
}
