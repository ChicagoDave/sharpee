/**
 * Balloon Handler
 *
 * Handles balloon puzzle mechanics:
 * 1. Receptacle PUT handler - tracks burning objects in receptacle
 * 2. Burn fuse integration - decrements burn time, deflates when exhausted
 * 3. Balloon operational state management
 */

import { WorldModel, IWorldModel, IdentityTrait, OpenableTrait, ContainerTrait, VehicleTrait, IParsedCommand } from '@sharpee/world-model';
import { InflatableTrait, BurnableTrait, BalloonStateTrait, BalloonPosition, isLedgePosition, isMidairPosition } from '../traits';
import { ISemanticEvent } from '@sharpee/core';
import { ISchedulerService, Daemon, Fuse, SchedulerContext } from '@sharpee/plugin-scheduler';
import { DungeoSchedulerMessages } from '../scheduler/scheduler-messages';

// State keys
const BALLOON_BURNING_OBJECT_KEY = 'dungeo.balloon.burningObject';
const BALLOON_INFLATED_KEY = 'dungeo.balloon.inflated';

// Message IDs for balloon events
export const BalloonHandlerMessages = {
  PUT_IN_RECEPTACLE: 'dungeo.balloon.put_in_receptacle',
  RECEPTACLE_EMPTY: 'dungeo.balloon.receptacle_empty',
  NOT_BURNING: 'dungeo.balloon.not_burning',
  OBJECT_BURNED_OUT: 'dungeo.balloon.object_burned_out'
};

// Fuse configuration
const BURN_FUSE_ID = 'dungeo.balloon.burn';
const BURN_CHECK_INTERVAL = 1; // Check every turn

/**
 * Get the balloon state trait from the balloon entity
 */
function getBalloonState(world: IWorldModel, balloonEntityId: string): BalloonStateTrait | null {
  const balloon = world.getEntity(balloonEntityId);
  if (!balloon) return null;

  return balloon.get(BalloonStateTrait) || null;
}

/**
 * If the entity at `locationId` is the balloon (carries BalloonStateTrait),
 * return it. World-derived — no cached ids, so it stays correct across
 * reboots (ADR-248: no module-level mutable state).
 */
function balloonAt(world: WorldModel | IWorldModel, locationId: string | undefined): { id: string; entity: any } | null {
  if (!locationId) return null;
  const entity = world.getEntity(locationId);
  if (!entity || !entity.get(BalloonStateTrait)) return null;
  return { id: entity.id, entity };
}

/**
 * Check if the cloth bag should be inflated
 */
function updateClothBagState(world: IWorldModel, balloonEntityId: string, isInflated: boolean): void {
  // Find cloth bag in balloon
  const contents = world.getContents(balloonEntityId);
  const clothBag = contents.find(e => {
    const identity = e.get(IdentityTrait);
    return identity?.name === 'cloth bag';
  });

  if (clothBag) {
    const inflatableTrait = clothBag.get(InflatableTrait);
    if (inflatableTrait) {
      inflatableTrait.isInflated = isInflated;
      // Description sourced from InflatableTrait fields (ISSUE-070)
      const identity = clothBag.get(IdentityTrait);
      if (identity) {
        const desc = isInflated ? inflatableTrait.inflatedDescription : inflatableTrait.deflatedDescription;
        if (desc) {
          identity.description = desc;
        }
      }
    }
  }
}

// Note: registerBalloonPutHandler removed - replaced by ReceptaclePuttingInterceptor (ADR-118)

/**
 * Create the burn fuse daemon
 *
 * This daemon decrements burn time on objects every turn.
 * When an object burns out, it handles balloon deflation.
 * Balloon/receptacle ids live in the closure (ADR-248); they are optional —
 * without them the daemon still burns objects down, it just skips the
 * balloon-deflation branch.
 */
function createBurnDaemon(balloonEntityId?: string, receptacleEntityId?: string): Daemon {
  return {
    id: BURN_FUSE_ID,
    name: 'Balloon Burn Timer',
    priority: 10, // Higher priority than movement daemon

    // Always run to check burning objects
    condition: (_ctx: SchedulerContext): boolean => {
      return true;
    },

    run: (ctx: SchedulerContext): ISemanticEvent[] => {
      const events: ISemanticEvent[] = [];
      const world = ctx.world;

      // Get all entities and find burning ones
      const allEntities = world.getAllEntities();

      for (const entity of allEntities) {
        const burnable = entity.get(BurnableTrait);
        if (!burnable?.isBurning) continue;

        const burnTurnsRemaining = burnable.burnTurnsRemaining;
        if (typeof burnTurnsRemaining !== 'number' || burnTurnsRemaining <= 0) continue;

        // Decrement burn time
        const newBurnTime = burnTurnsRemaining - 1;
        burnable.burnTurnsRemaining = newBurnTime;

        if (newBurnTime <= 0) {
          // Object has burned out
          burnable.isBurning = false;
          burnable.burnTurnsRemaining = 0;
          burnable.burnedOut = true;

          // Check if this was in the receptacle
          const location = world.getLocation(entity.id);
          if (receptacleEntityId && balloonEntityId && location === receptacleEntityId) {
            // Update balloon state
            const balloonState = getBalloonState(world, balloonEntityId);
            if (balloonState && balloonState.burningObject === entity.id) {
              balloonState.burningObject = null;
              world.setStateValue(BALLOON_BURNING_OBJECT_KEY, null);
              world.setStateValue(BALLOON_INFLATED_KEY, false);
              updateClothBagState(world, balloonEntityId, false);

              // Emit deflation message
              events.push({
                id: `burn-fuse-${ctx.turn}`,
                type: 'daemon.message',
                timestamp: Date.now(),
                entities: { target: entity.id },
                data: {
                  messageId: DungeoSchedulerMessages.BALLOON_DEFLATING,
                  daemonId: BURN_FUSE_ID,
                  burnedOutItem: entity.id
                }
              });
            }
          }

          // Emit burned out message for any burning object
          const identity = entity.get(IdentityTrait);
          events.push({
            id: `burned-out-${entity.id}-${ctx.turn}`,
            type: 'daemon.message',
            timestamp: Date.now(),
            entities: { target: entity.id },
            data: {
              messageId: BalloonHandlerMessages.OBJECT_BURNED_OUT,
              itemName: identity?.name || 'object',
              entityId: entity.id
            }
          });
        }
      }

      return events;
    }
  };
}

/**
 * Register the burn daemon. Balloon/receptacle ids are optional; without
 * them only the generic burn-down behavior runs.
 */
export function registerBurnDaemon(
  scheduler: ISchedulerService,
  balloonId?: string,
  receptacleId?: string
): void {
  scheduler.registerDaemon(createBurnDaemon(balloonId, receptacleId));
}

/**
 * Check if the balloon is currently inflated
 */
export function isBalloonInflated(world: IWorldModel): boolean {
  return (world.getStateValue(BALLOON_INFLATED_KEY) as boolean) || false;
}

/**
 * Get the ID of the burning object in the receptacle
 */
export function getBurningObjectId(world: IWorldModel): string | null {
  return (world.getStateValue(BALLOON_BURNING_OBJECT_KEY) as string) || null;
}

// Custom balloon exit action ID
export const BALLOON_EXIT_ACTION_ID = 'dungeo.action.balloon-exit';

// Balloon exit messages
export const BalloonExitMessages = {
  EXIT_SUCCESS: 'dungeo.balloon.exit_success',
  EXIT_BLOCKED_MIDAIR: 'dungeo.balloon.exit_blocked_midair',
  EXIT_TO_LEDGE: 'dungeo.balloon.exit_to_ledge'
};

/**
 * Create a command transformer for balloon exit mechanics
 *
 * This transformer intercepts EXIT commands when the player is in the balloon
 * and redirects them based on the balloon's position:
 * - At ground (vlbot): normal exit to Volcano Bottom
 * - At ledge (ledg2/3/4): exit to the corresponding ledge room
 * - In mid-air (vair1/2/3/4): block exit
 */
export function createBalloonExitTransformer() {
  return (parsed: IParsedCommand, world: WorldModel): IParsedCommand => {
    // Only intercept EXITING action
    if (parsed.action !== 'if.action.exiting') {
      return parsed;
    }

    // Check if player is in the balloon (world-derived: the location
    // entity carries BalloonStateTrait)
    const player = world.getPlayer();
    if (!player) return parsed;

    const playerLocation = world.getLocation(player.id);
    const balloonLoc = balloonAt(world, playerLocation);
    if (!balloonLoc) return parsed;

    const vehicleTrait = balloonLoc.entity.get(VehicleTrait);
    if (!vehicleTrait) return parsed;

    const position = vehicleTrait.currentPosition as BalloonPosition;

    // At mid-air (not near a ledge) - block exit
    if (isMidairPosition(position)) {
      return {
        ...parsed,
        action: BALLOON_EXIT_ACTION_ID,
        structure: parsed.structure
      };
    }

    // At ground level or ledge - redirect to balloon exit action (shows room name)
    return {
      ...parsed,
      action: BALLOON_EXIT_ACTION_ID,
      structure: parsed.structure
    };
  };
}

/**
 * Balloon exit action - handles exit at ledges and blocks exit in mid-air
 */
import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';

export const balloonExitAction: Action = {
  id: BALLOON_EXIT_ACTION_ID,
  group: 'movement',

  validate(context: ActionContext): ValidationResult {
    const player = context.player;
    const playerLocation = context.world.getLocation(player.id);

    const balloonLoc = balloonAt(context.world, playerLocation);
    if (!balloonLoc) {
      return { valid: false, error: 'not_in_balloon' };
    }

    const vehicleTrait = balloonLoc.entity.get(VehicleTrait);
    if (!vehicleTrait) {
      return { valid: false, error: 'balloon_state_not_found' };
    }

    const position = vehicleTrait.currentPosition as BalloonPosition;

    // Block exit in mid-air UNLESS at a dockable position (near a ledge)
    // vair2 is near Narrow Ledge, vair4 is near Wide Ledge
    const DOCKABLE_MIDAIR: Record<string, boolean> = { 'vair2': true, 'vair4': true };
    if (isMidairPosition(position) && !DOCKABLE_MIDAIR[position]) {
      return {
        valid: false,
        error: BalloonExitMessages.EXIT_BLOCKED_MIDAIR
      };
    }

    // Store position and balloon id for execute phase
    context.sharedData.balloonPosition = position;
    context.sharedData.balloonId = balloonLoc.id;

    return { valid: true };
  },

  execute(context: ActionContext): void {
    const position = context.sharedData.balloonPosition as string;
    const balloon = context.world.getEntity(context.sharedData.balloonId as string);

    if (!balloon) return;

    // Get the vehicle trait for position rooms
    const vehicleTrait = balloon.get(VehicleTrait);
    if (!vehicleTrait?.positionRooms) return;

    // Get the destination room for this position
    const destinationRoom = vehicleTrait.positionRooms[position];
    if (!destinationRoom) return;

    // Move player to the destination room
    context.world.moveEntity(context.player.id, destinationRoom);

    // Store for reporting
    context.sharedData.exitedToRoom = destinationRoom;
    context.sharedData.exitSuccess = true;
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    if (result.error === BalloonExitMessages.EXIT_BLOCKED_MIDAIR) {
      return [context.event('dungeo.event.balloon_exit_blocked', {
        messageId: BalloonExitMessages.EXIT_BLOCKED_MIDAIR
      })];
    }

    return [context.event('dungeo.event.balloon_exit_blocked', {
      messageId: `${BALLOON_EXIT_ACTION_ID}.${result.error || 'action_failed'}`
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    if (!context.sharedData.exitSuccess) {
      return [];
    }

    const events: ISemanticEvent[] = [];

    // Emit exited event
    events.push(context.event('if.event.exited', {
      fromLocation: context.sharedData.balloonId,
      toLocation: context.sharedData.exitedToRoom,
      preposition: 'out of'
    }));

    // Success message — include room name for the ledge
    const destRoom = context.world.getEntity(context.sharedData.exitedToRoom);
    const roomName = destRoom?.get(IdentityTrait)?.name || 'the ledge';
    events.push(context.event('dungeo.event.balloon_exited', {
      messageId: BalloonExitMessages.EXIT_TO_LEDGE,
      params: { roomName }
    }));

    return events;
  }
};
