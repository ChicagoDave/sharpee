/**
 * Round Room (Carousel Room)
 * "This is a circular stone room with passages in all directions.
 * Several of them have unfortunately been blocked by cave-ins."
 *
 * NOTE: The Round Room has a spinning mechanism. When `isFixed` is false,
 * exiting the room randomizes which passage you end up in. The robot
 * pushing a button can toggle this state.
 *
 * In original Zork, the room starts spinning (isFixed=false) but the
 * robot puzzle isn't implemented yet, so we default to isFixed=true
 * for now. When the robot puzzle is added, this should be changed
 * back to isFixed=false.
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createRoundRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Round Room', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Round Room',
    aliases: ['round room', 'circular room'],
    description: 'This is a circular stone room with passages in all directions. Several of them have unfortunately been blocked by cave-ins.',
    properName: true,
    article: 'the'
  }));

  // Round Room spinning state - when false, exits are randomized (custom story state)
  // Default to true until robot puzzle is implemented
  (room as any).isFixed = true;

  return room;
}
