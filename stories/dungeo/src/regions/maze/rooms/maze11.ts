/**
 * Maze 11
 * "You are in a maze of twisty little passages, all alike."
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createMaze11(world: WorldModel): IFEntity {
  const room = world.createEntity('Maze', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Maze',
    aliases: ['maze', 'maze 11', 'maze11'],
    description: 'You are in a maze of twisty little passages, all alike.',
    properName: false,
    article: 'the'
  }));

  return room;
}
