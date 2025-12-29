/**
 * Maze 17
 * "You are in a maze of twisty little passages, all alike."
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createMaze17(world: WorldModel): IFEntity {
  const room = world.createEntity('Maze', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Maze',
    aliases: ['maze'],
    description: 'You are in a maze of twisty little passages, all alike.',
    properName: false,
    article: 'the'
  }));

  return room;
}
