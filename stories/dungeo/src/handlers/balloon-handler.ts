/**
 * Balloon Handler
 *
 * Handles balloon puzzle mechanics:
 * 1. Receptacle PUT handler - tracks burning objects in receptacle
 * 2. Burn fuse integration - decrements burn time, deflates when exhausted
 * 3. Balloon operational state management
 */

import { WorldModel, IWorldModel, IdentityTrait, OpenableTrait, ContainerTrait, VehicleTrait, IParsedCommand } from '@sharpee/world-model';
import { ISemanticEvent } from '@sharpee/core';
import { ISchedulerService, Daemon, Fuse, SchedulerContext, GameEngine } from '@sharpee/engine';
import { DungeoSchedulerMessages } from '../scheduler/scheduler-messages';
import { BalloonState, isLedgePosition, isMidairPosition } from '../regions/volcano/objects/balloon-objects';

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

// Cached entity IDs
let balloonEntityId: string | null = null;
let receptacleEntityId: string | null = null;

/**
 * Get the balloon state from the balloon entity
 */
function getBalloonState(world: IWorldModel): BalloonState | null {
  if (!balloonEntityId) return null;

  const balloon = world.getEntity(balloonEntityId);
  if (!balloon) return null;

  return (balloon as any).balloonState as BalloonState | undefined || null;
}

/**
 * Check if the cloth bag should be inflated
 */
function updateClothBagState(world: IWorldModel, isInflated: boolean): void {
  if (!balloonEntityId) return;

  // Find cloth bag in balloon
  const contents = world.getContents(balloonEntityId);
  const clothBag = contents.find(e => {
    const identity = e.get(IdentityTrait);
    return identity?.name === 'cloth bag';
  });

  if (clothBag) {
    (clothBag as any).isInflated = isInflated;
    const identity = clothBag.get(IdentityTrait);
    if (identity) {
      if (isInflated) {
        identity.description = 'The silk bag billows overhead, filled with hot air.';
      } else {
        identity.description = 'The cloth bag is draped over the basket.';
      }
    }
  }
}

/**
 * Register the balloon PUT handler
 *
 * Listens for if.event.put_in events and handles balloon mechanics:
 * - Tracks burning objects placed in receptacle
 * - Updates balloon operational state
 * - Manages cloth bag inflation
 *
 * Uses EventProcessor.registerHandler for proper event dispatch (ADR-085).
 */
export function registerBalloonPutHandler(
  engine: GameEngine,
  world: WorldModel,
  balloonId: string,
  receptacleId: string
): void {
  balloonEntityId = balloonId;
  receptacleEntityId = receptacleId;

  const eventProcessor = engine.getEventProcessor();

  // Handle putting items in the receptacle
  eventProcessor.registerHandler('if.event.put_in', (event: ISemanticEvent): ISemanticEvent[] => {
    const data = event.data as Record<string, any> | undefined;
    if (!data) return [];

    // Check if target is the receptacle
    const targetId = data.targetId as string | undefined;
    if (targetId !== receptacleEntityId) return [];

    // Get the item being placed
    const itemId = data.itemId as string | undefined;
    if (!itemId) return [];

    const item = world.getEntity(itemId);
    if (!item) return [];

    // Check if item is burning
    const isBurning = (item as any).isBurning === true;

    // Get balloon state
    const balloonState = getBalloonState(world);
    if (!balloonState) return [];

    if (isBurning) {
      // Track the burning object
      balloonState.burningObject = itemId;
      world.setStateValue(BALLOON_BURNING_OBJECT_KEY, itemId);
      world.setStateValue(BALLOON_INFLATED_KEY, true);

      // Update cloth bag to inflated
      updateClothBagState(world, true);

      // Set flag for messaging
      world.setStateValue('dungeo.balloon.just_inflated', true);
    }

    return [];
  });

  // Handle taking items from receptacle
  eventProcessor.registerHandler('if.event.taken', (event: ISemanticEvent): ISemanticEvent[] => {
    const data = event.data as Record<string, any> | undefined;
    if (!data) return [];

    const itemId = data.entityId as string | undefined;
    if (!itemId) return [];

    // Check if this was the burning object in the receptacle
    const balloonState = getBalloonState(world);
    if (!balloonState) return [];

    if (balloonState.burningObject === itemId) {
      // Clear the burning object
      balloonState.burningObject = null;
      world.setStateValue(BALLOON_BURNING_OBJECT_KEY, null);

      // Check if balloon should deflate
      const receptacle = world.getEntity(receptacleEntityId!);
      if (receptacle) {
        const contents = world.getContents(receptacleEntityId!);
        const stillHasBurning = contents.some(e => (e as any).isBurning === true);

        if (!stillHasBurning) {
          world.setStateValue(BALLOON_INFLATED_KEY, false);
          updateClothBagState(world, false);
          world.setStateValue('dungeo.balloon.just_deflated', true);
        }
      }
    }

    return [];
  });
}

/**
 * Create the burn fuse daemon
 *
 * This daemon decrements burn time on objects every turn.
 * When an object burns out, it handles balloon deflation.
 */
function createBurnDaemon(): Daemon {
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
        const isBurning = (entity as any).isBurning === true;
        if (!isBurning) continue;

        const burnTurnsRemaining = (entity as any).burnTurnsRemaining;
        if (typeof burnTurnsRemaining !== 'number') continue;

        // Decrement burn time
        const newBurnTime = burnTurnsRemaining - 1;
        (entity as any).burnTurnsRemaining = newBurnTime;

        if (newBurnTime <= 0) {
          // Object has burned out
          (entity as any).isBurning = false;
          (entity as any).burnTurnsRemaining = 0;
          (entity as any).isBurnedOut = true;

          // Check if this was in the receptacle
          const location = world.getLocation(entity.id);
          if (location === receptacleEntityId) {
            // Update balloon state
            const balloonState = getBalloonState(world);
            if (balloonState && balloonState.burningObject === entity.id) {
              balloonState.burningObject = null;
              world.setStateValue(BALLOON_BURNING_OBJECT_KEY, null);
              world.setStateValue(BALLOON_INFLATED_KEY, false);
              updateClothBagState(world, false);

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
 * Register the burn daemon
 */
export function registerBurnDaemon(scheduler: ISchedulerService): void {
  scheduler.registerDaemon(createBurnDaemon());
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
    if (parsed.action !== 'exiting') {
      return parsed;
    }

    if (!balloonEntityId) return parsed;

    // Check if player is in the balloon
    const player = world.getPlayer();
    if (!player) return parsed;

    const playerLocation = world.getLocation(player.id);
    if (playerLocation !== balloonEntityId) return parsed;

    // Player is in balloon - check position
    const balloon = world.getEntity(balloonEntityId);
    if (!balloon) return parsed;

    const balloonState = (balloon as any).balloonState as BalloonState | undefined;
    if (!balloonState) return parsed;

    const position = balloonState.position;

    // At ground level - allow normal exit
    if (position === 'vlbot') {
      return parsed;
    }

    // At mid-air - block exit
    if (isMidairPosition(position)) {
      return {
        ...parsed,
        action: BALLOON_EXIT_ACTION_ID,
        structure: parsed.structure
      };
    }

    // At ledge - redirect to balloon exit action
    if (isLedgePosition(position)) {
      return {
        ...parsed,
        action: BALLOON_EXIT_ACTION_ID,
        structure: parsed.structure
      };
    }

    return parsed;
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

    if (!balloonEntityId || playerLocation !== balloonEntityId) {
      return { valid: false, error: 'not_in_balloon' };
    }

    const balloon = context.world.getEntity(balloonEntityId);
    if (!balloon) {
      return { valid: false, error: 'balloon_not_found' };
    }

    const balloonState = (balloon as any).balloonState as BalloonState | undefined;
    if (!balloonState) {
      return { valid: false, error: 'balloon_state_not_found' };
    }

    const position = balloonState.position;

    // Block exit in mid-air
    if (isMidairPosition(position)) {
      return {
        valid: false,
        error: BalloonExitMessages.EXIT_BLOCKED_MIDAIR
      };
    }

    // Store position for execute phase
    context.sharedData.balloonPosition = position;
    context.sharedData.balloonId = balloonEntityId;

    return { valid: true };
  },

  execute(context: ActionContext): void {
    const position = context.sharedData.balloonPosition as string;
    const balloon = context.world.getEntity(balloonEntityId!);

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
      return [context.event('action.blocked', {
        actionId: BALLOON_EXIT_ACTION_ID,
        messageId: BalloonExitMessages.EXIT_BLOCKED_MIDAIR,
        reason: 'You are too high in the air to exit safely!'
      })];
    }

    return [context.event('action.blocked', {
      actionId: BALLOON_EXIT_ACTION_ID,
      messageId: result.error || 'action_failed'
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

    // Success message
    events.push(context.event('action.success', {
      actionId: BALLOON_EXIT_ACTION_ID,
      messageId: BalloonExitMessages.EXIT_TO_LEDGE,
      params: {}
    }));

    return events;
  }
};
