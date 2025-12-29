/**
 * Coal Mine - Where coal is found
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createCoalMine(world: WorldModel): IFEntity {
  const room = world.createEntity('Coal Mine', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Coal Mine',
    aliases: ['coal mine', 'mine'],
    description: 'This is a dead-end in an old coal mine. The walls are covered with veins of coal. Some loose chunks have fallen to the floor. A passage leads east.',
    properName: true,
    article: 'the'
  }));

  return room;
}
