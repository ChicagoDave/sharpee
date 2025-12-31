/**
 * Behind House
 * "You are behind the white house. A path leads into the forest to the east. In one
 * corner of the house there is a small window which is slightly ajar."
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createBehindHouse(world: WorldModel): IFEntity {
  const room = world.createEntity('Behind House', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: false,
    isOutdoors: true
  }));

  room.add(new IdentityTrait({
    name: 'Behind House',
    aliases: ['behind house', 'back of house', 'east of house'],
    description: 'You are behind the white house. A path leads into the forest to the east. In one corner of the house there is a small window which is slightly ajar.',
    properName: true,
    article: ''
  }));

  return room;
}
