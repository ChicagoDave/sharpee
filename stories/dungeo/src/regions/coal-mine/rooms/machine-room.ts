/**
 * Machine Room - Contains the coal-powered machine
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createMachineRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Machine Room', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Machine Room',
    aliases: ['machine room'],
    description: 'This is a large room full of old mining equipment. In the center stands a massive coal-powered machine with a prominent slot. The walls are blackened with soot. A passage leads west.',
    properName: true,
    article: 'the'
  }));

  return room;
}
