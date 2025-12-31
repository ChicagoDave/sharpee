/**
 * Dreary Room - Contains the blue crystal sphere treasure
 *
 * Accessed from Tiny Room through a small door.
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createDrearyRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Dreary Room', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Dreary Room',
    aliases: ['dreary room'],
    description: 'This is a small, dreary room. A passage leads south.',
    properName: true,
    article: 'the'
  }));

  return room;
}
