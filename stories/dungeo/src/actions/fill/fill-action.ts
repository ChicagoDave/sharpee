/**
 * Fill Action - Fill containers from water sources
 *
 * Primary use: Fill bottle from bucket to make it descend (counterweight mechanism)
 * Pattern: "fill bottle", "fill bottle from bucket"
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { IdentityTrait, IFEntity, VehicleTrait, OpenableTrait } from '@sharpee/world-model';
import { moveVehicle, isActorInVehicle, getActorVehicle } from '@sharpee/world-model';
import { FILL_ACTION_ID, FillMessages } from './types';
import { BucketTrait } from '../../traits';

/**
 * Find bottle in player's inventory
 */
function findBottle(context: ActionContext): IFEntity | undefined {
  const { world, player } = context;
  const inventory = world.getContents(player.id);

  for (const item of inventory) {
    const identity = item.get(IdentityTrait);
    if (identity?.name?.toLowerCase().includes('bottle')) {
      return item;
    }
  }

  return undefined;
}

/**
 * Check if bottle already has water
 */
function bottleHasWater(context: ActionContext, bottle: IFEntity): boolean {
  const contents = context.world.getContents(bottle.id);
  for (const item of contents) {
    const identity = item.get(IdentityTrait);
    if (identity?.name?.toLowerCase().includes('water')) {
      return true;
    }
  }
  return false;
}

/**
 * Find bucket with water in current location or containing player
 */
function findBucketWithWater(context: ActionContext): IFEntity | undefined {
  const { world, player } = context;

  // Check if player is in bucket
  const vehicle = getActorVehicle(world, player.id);
  if (vehicle) {
    const identity = vehicle.get(IdentityTrait);
    if (identity?.name?.toLowerCase().includes('bucket')) {
      const bucketTrait = vehicle.get(BucketTrait);
      if (bucketTrait?.hasWater) {
        return vehicle;
      }
    }
  }

  // Check current room for bucket with water
  const playerLocation = world.getLocation(player.id);
  if (!playerLocation) return undefined;

  // If player is in a vehicle, get the room the vehicle is in
  const roomId = vehicle ? world.getLocation(vehicle.id) : playerLocation;
  if (!roomId) return undefined;

  const roomContents = world.getContents(roomId);
  for (const item of roomContents) {
    const identity = item.get(IdentityTrait);
    if (identity?.name?.toLowerCase().includes('bucket')) {
      const bucketTrait = item.get(BucketTrait);
      if (bucketTrait?.hasWater) {
        return item;
      }
    }
  }

  return undefined;
}

/**
 * Find water entity in bucket
 */
function findWaterInBucket(context: ActionContext, bucket: IFEntity): IFEntity | undefined {
  const contents = context.world.getContents(bucket.id);
  for (const item of contents) {
    const identity = item.get(IdentityTrait);
    if (identity?.name?.toLowerCase().includes('water')) {
      return item;
    }
  }
  return undefined;
}

export const fillAction: Action = {
  id: FILL_ACTION_ID,
  group: 'manipulation',

  validate(context: ActionContext): ValidationResult {
    const bottle = findBottle(context);

    if (!bottle) {
      return {
        valid: false,
        error: FillMessages.NO_BOTTLE
      };
    }

    if (bottleHasWater(context, bottle)) {
      return {
        valid: false,
        error: FillMessages.BOTTLE_FULL
      };
    }

    const bucket = findBucketWithWater(context);

    context.sharedData.bottle = bottle;
    context.sharedData.bucket = bucket;

    return { valid: true };
  },

  execute(context: ActionContext): void {
    const { world, player, sharedData } = context;

    const bottle = sharedData.bottle as IFEntity;
    const bucket = sharedData.bucket as IFEntity | undefined;

    // If filling from bucket at well
    if (bucket) {
      const vehicleTrait = bucket.get(VehicleTrait);
      const water = findWaterInBucket(context, bucket);

      if (vehicleTrait && vehicleTrait.vehicleType === 'counterweight' && water) {
        // Open bottle temporarily to move water in
        const openable = bottle.get(OpenableTrait);
        const wasOpen = openable?.isOpen ?? true;
        if (openable) openable.isOpen = true;

        // Move water from bucket to bottle
        world.moveEntity(water.id, bottle.id);

        // Restore bottle state
        if (openable) openable.isOpen = wasOpen;

        const bucketTrait = bucket.get(BucketTrait);
        if (bucketTrait) {
          bucketTrait.hasWater = false;
        }
        sharedData.filledFromBucket = true;

        // If bucket is at top and water was removed, it descends
        if (vehicleTrait.currentPosition === 'top' && vehicleTrait.positionRooms) {
          const bottomRoomId = vehicleTrait.positionRooms['bottom'];

          if (bottomRoomId) {
            // Move bucket to bottom
            moveVehicle(world, bucket.id, bottomRoomId);
            vehicleTrait.currentPosition = 'bottom';
            sharedData.bucketDescended = true;

            // If player was in bucket, emit room description event
            if (isActorInVehicle(world, player.id)) {
              sharedData.playerDescended = true;
            }
          }
        } else if (vehicleTrait.currentPosition === 'bottom') {
          // Bucket already at bottom
          sharedData.bucketAlreadyAtBottom = true;
        }

        return;
      }
    }

    // No valid water source
    sharedData.noSource = true;
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('action.blocked', {
      actionId: FILL_ACTION_ID,
      messageId: result.error || FillMessages.NO_BOTTLE,
      reason: result.error
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const { sharedData, world, player } = context;
    const events: ISemanticEvent[] = [];

    if (sharedData.bucketDescended && sharedData.playerDescended) {
      events.push(context.event('action.success', {
        actionId: FILL_ACTION_ID,
        messageId: FillMessages.BUCKET_DESCENDS
      }));

      // Emit look event to describe new location
      const vehicle = getActorVehicle(world, player.id);
      const newRoomId = vehicle ? world.getLocation(vehicle.id) : undefined;
      if (newRoomId) {
        const room = world.getEntity(newRoomId);
        const identity = room?.get(IdentityTrait);
        events.push(context.event('room.described', {
          roomId: newRoomId,
          roomName: identity?.name || 'Well Bottom'
        }));
      }
    } else if (sharedData.bucketDescended) {
      events.push(context.event('action.success', {
        actionId: FILL_ACTION_ID,
        messageId: FillMessages.BUCKET_DESCENDS
      }));
    } else if (sharedData.bucketAlreadyAtBottom && sharedData.filledFromBucket) {
      events.push(context.event('action.success', {
        actionId: FILL_ACTION_ID,
        messageId: FillMessages.BUCKET_AT_BOTTOM
      }));
    } else if (sharedData.filledFromBucket) {
      events.push(context.event('action.success', {
        actionId: FILL_ACTION_ID,
        messageId: FillMessages.FROM_BUCKET
      }));
    } else if (sharedData.noSource) {
      events.push(context.event('action.success', {
        actionId: FILL_ACTION_ID,
        messageId: FillMessages.NO_SOURCE
      }));
    } else {
      events.push(context.event('action.success', {
        actionId: FILL_ACTION_ID,
        messageId: FillMessages.NOTHING_HAPPENS
      }));
    }

    return events;
  }
};
