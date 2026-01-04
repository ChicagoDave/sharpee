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
import { WorldModel, IdentityTrait, OpenableTrait, ContainerTrait, VehicleTrait } from '@sharpee/world-model';
import { ISchedulerService, Daemon, SchedulerContext } from '@sharpee/engine';
import { DungeoSchedulerMessages } from './scheduler-messages';
import {
  BalloonState,
  BalloonPosition,
  nextPositionUp,
  nextPositionDown,
  isMidairPosition,
  isLedgePosition
} from '../regions/volcano/objects/balloon-objects';

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

  // Check for burning objects inside
  const contents = world.getContents(receptacleEntityId);
  return contents.some(item => (item as any).isBurning === true);
}

/**
 * Get the balloon entity and its state
 */
function getBalloonState(world: WorldModel): { entity: any; state: BalloonState } | null {
  if (!balloonEntityId) return null;

  const balloon = world.getEntity(balloonEntityId);
  if (!balloon) return null;

  const state = (balloon as any).balloonState as BalloonState | undefined;
  if (!state) return null;

  return { entity: balloon, state };
}

/**
 * Sync VehicleTrait.currentPosition with balloon state
 */
function syncVehicleTraitPosition(world: WorldModel, position: BalloonPosition): void {
  if (!balloonEntityId) return;

  const balloon = world.getEntity(balloonEntityId);
  if (!balloon) return;

  const vehicleTrait = balloon.get(VehicleTrait);
  if (vehicleTrait) {
    vehicleTrait.currentPosition = position;
  }
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
 */
function handleCrash(world: WorldModel, ctx: SchedulerContext): ISemanticEvent[] {
  const events: ISemanticEvent[] = [];

  // Emit crash message
  events.push({
    id: `balloon-crash-${ctx.turn}`,
    type: 'game.death',
    timestamp: Date.now(),
    entities: { target: balloonEntityId || '' },
    data: {
      messageId: DungeoSchedulerMessages.BALLOON_CRASH,
      daemonId: BALLOON_DAEMON_ID,
      cause: 'balloon_crash',
      balloonId: balloonEntityId
    }
  });

  // TODO: Replace balloon with "dead balloon" scenery
  // TODO: Move player to appropriate death location

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
      lastFireTurn = ctx.turn;
      const events: ISemanticEvent[] = [];

      const balloon = getBalloonState(ctx.world);
      if (!balloon) return events;

      const { state } = balloon;
      const hasHeat = hasHeatSource(ctx.world);
      const playerInBalloon = isPlayerInBalloon(ctx.world);

      // Determine movement direction
      let newPosition: BalloonPosition | null = null;

      if (hasHeat) {
        // Rising - has heat source
        newPosition = nextPositionUp(state.position);
      } else {
        // Falling - no heat source
        newPosition = nextPositionDown(state.position);
      }

      // If at bottom with no heat, don't move
      if (newPosition === null) {
        return events;
      }

      // Check for crash at VAIR4
      if (newPosition === 'vair4') {
        state.position = newPosition;
        syncVehicleTraitPosition(ctx.world, newPosition);
        return handleCrash(ctx.world, ctx);
      }

      // Update position
      const oldPosition = state.position;
      state.position = newPosition;
      syncVehicleTraitPosition(ctx.world, newPosition);

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
            oldPosition,
            newPosition,
            isRising: hasHeat,
            balloonId: balloonEntityId,
            params: {
              from: oldPosition,
              to: newPosition
            }
          }
        });

        // If we've arrived at a ledge, mention the hook
        if (isLedgePosition(newPosition)) {
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
 * Get balloon position
 */
export function getBalloonPosition(world: WorldModel): BalloonPosition | null {
  const balloon = getBalloonState(world);
  return balloon?.state.position || null;
}

/**
 * Reset daemon timer (called after tying/untying)
 */
export function resetBalloonDaemonTimer(): void {
  lastFireTurn = 0;
}
