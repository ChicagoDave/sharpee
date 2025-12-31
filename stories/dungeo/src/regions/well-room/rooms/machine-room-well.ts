/**
 * Machine Room (Well Area)
 *
 * This is different from the coal-mine Machine Room.
 * Contains a triangular button that stops the Round Room carousel.
 * The button can only be pushed by the Robot (player is too big).
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createMachineRoomWell(world: WorldModel): IFEntity {
  const room = world.createEntity('Machine Room', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Machine Room',
    aliases: ['machine room'],
    description: 'This is a room containing a large amount of machinery. Against one wall is a large triangular button that is too small for a human finger to push. Exits lead southeast and east.',
    properName: true,
    article: 'the'
  }));

  return room;
}
