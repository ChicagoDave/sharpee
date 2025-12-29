/**
 * Living Room
 * "You are in the living room. There is a doorway to the east, a wooden
 * door with strange gothic lettering to the west, which appears to be
 * nailed shut, a trophy case, and a large oriental rug in the center of
 * the room."
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createLivingRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Living Room', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: false,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Living Room',
    aliases: ['living room', 'front room', 'lounge'],
    description: 'You are in the living room. There is a doorway to the east, a wooden door with strange gothic lettering to the west, which appears to be nailed shut, a trophy case, and a large oriental rug in the center of the room.',
    properName: true,
    article: 'the'
  }));

  return room;
}
