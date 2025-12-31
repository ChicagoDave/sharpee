/**
 * Shaft Room - Top of the basket elevator
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createShaftRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Shaft Room', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Shaft Room',
    aliases: ['shaft room'],
    description: 'This is a small room near the top of a deep shaft. A rusty iron basket hangs from a chain here, suspended over the darkness below. An opening leads west.',
    properName: true,
    article: 'the'
  }));

  return room;
}
