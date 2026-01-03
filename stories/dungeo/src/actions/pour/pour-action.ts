/**
 * Pour Action - Pour liquids into containers
 *
 * Primary use: Pour water into bucket to make it rise (counterweight mechanism)
 * Pattern: "pour water", "pour water in bucket", "pour water into bucket"
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { IdentityTrait, IFEntity, VehicleTrait } from '@sharpee/world-model';
import { moveVehicle, isActorInVehicle, getActorVehicle } from '@sharpee/world-model';
import { POUR_ACTION_ID, PourMessages } from './types';

/**
 * Find water in player's inventory (directly or in bottle)
 */
function findWater(context: ActionContext): { water: IFEntity | undefined; container: IFEntity | undefined } {
  const { world, player } = context;
  const inventory = world.getContents(player.id);

  // Check direct inventory
  for (const item of inventory) {
    const identity = item.get(IdentityTrait);
    if (identity?.name?.toLowerCase().includes('water')) {
      return { water: item, container: undefined };
    }

    // Check inside containers (like bottle)
    const contents = world.getContents(item.id);
    for (const inner of contents) {
      const innerIdentity = inner.get(IdentityTrait);
      if (innerIdentity?.name?.toLowerCase().includes('water')) {
        return { water: inner, container: item };
      }
    }
  }

  return { water: undefined, container: undefined };
}

/**
 * Find bucket in current location or containing player
 */
function findBucket(context: ActionContext): IFEntity | undefined {
  const { world, player } = context;

  // Check if player is in bucket
  const vehicle = getActorVehicle(world, player.id);
  if (vehicle) {
    const identity = vehicle.get(IdentityTrait);
    if (identity?.name?.toLowerCase().includes('bucket')) {
      return vehicle;
    }
  }

  // Check current room for bucket
  const playerLocation = world.getLocation(player.id);
  if (!playerLocation) return undefined;

  // If player is in a vehicle, get the room the vehicle is in
  const roomId = vehicle ? world.getLocation(vehicle.id) : playerLocation;
  if (!roomId) return undefined;

  const roomContents = world.getContents(roomId);
  for (const item of roomContents) {
    const identity = item.get(IdentityTrait);
    if (identity?.name?.toLowerCase().includes('bucket')) {
      return item;
    }
  }

  return undefined;
}

export const pourAction: Action = {
  id: POUR_ACTION_ID,
  group: 'manipulation',

  validate(context: ActionContext): ValidationResult {
    const { water, container } = findWater(context);

    if (!water) {
      return {
        valid: false,
        error: PourMessages.NO_WATER
      };
    }

    const bucket = findBucket(context);

    context.sharedData.water = water;
    context.sharedData.waterContainer = container;
    context.sharedData.bucket = bucket;

    return { valid: true };
  },

  execute(context: ActionContext): void {
    const { world, player, sharedData } = context;

    const water = sharedData.water as IFEntity;
    const waterContainer = sharedData.waterContainer as IFEntity | undefined;
    const bucket = sharedData.bucket as IFEntity | undefined;

    // If pouring into bucket at well
    if (bucket) {
      const vehicleTrait = bucket.get(VehicleTrait);

      if (vehicleTrait && vehicleTrait.vehicleType === 'counterweight') {
        // Move water into bucket
        world.moveEntity(water.id, bucket.id);
        (bucket as any).hasWater = true;
        sharedData.pouredIntoBucket = true;

        // If bucket is at bottom and water was poured in, it rises
        if (vehicleTrait.currentPosition === 'bottom' && vehicleTrait.positionRooms) {
          const topRoomId = vehicleTrait.positionRooms['top'];

          if (topRoomId) {
            // Move bucket to top
            moveVehicle(world, bucket.id, topRoomId);
            vehicleTrait.currentPosition = 'top';
            sharedData.bucketRose = true;

            // If player was in bucket, emit room description event
            if (isActorInVehicle(world, player.id)) {
              sharedData.playerRose = true;
            }
          }
        } else if (vehicleTrait.currentPosition === 'top') {
          // Bucket already at top
          sharedData.bucketAlreadyAtTop = true;
        }

        return;
      }
    }

    // Pour water on ground (water vanishes)
    if (water) {
      // Remove water from world
      world.moveEntity(water.id, 'limbo');
      sharedData.pouredOnGround = true;
    }
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('action.blocked', {
      actionId: POUR_ACTION_ID,
      messageId: result.error || PourMessages.NO_WATER,
      reason: result.error
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const { sharedData, world, player } = context;
    const events: ISemanticEvent[] = [];

    if (sharedData.bucketRose && sharedData.playerRose) {
      events.push(context.event('game.message', {
        messageId: PourMessages.BUCKET_RISES
      }));

      // Emit look event to describe new location
      const vehicle = getActorVehicle(world, player.id);
      const newRoomId = vehicle ? world.getLocation(vehicle.id) : undefined;
      if (newRoomId) {
        const room = world.getEntity(newRoomId);
        const identity = room?.get(IdentityTrait);
        events.push(context.event('room.described', {
          roomId: newRoomId,
          roomName: identity?.name || 'Top of Well'
        }));
      }
    } else if (sharedData.bucketRose) {
      events.push(context.event('game.message', {
        messageId: PourMessages.BUCKET_RISES
      }));
    } else if (sharedData.bucketAlreadyAtTop && sharedData.pouredIntoBucket) {
      events.push(context.event('game.message', {
        messageId: PourMessages.BUCKET_AT_TOP
      }));
    } else if (sharedData.pouredIntoBucket) {
      events.push(context.event('game.message', {
        messageId: PourMessages.INTO_BUCKET
      }));
    } else if (sharedData.pouredOnGround) {
      events.push(context.event('game.message', {
        messageId: PourMessages.SUCCESS
      }));
    } else {
      events.push(context.event('game.message', {
        messageId: PourMessages.NOTHING_HAPPENS
      }));
    }

    return events;
  }
};
