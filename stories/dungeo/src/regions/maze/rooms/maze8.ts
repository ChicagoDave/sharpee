/**
 * Maze 8
 * "You are in a maze of twisty little passages, all alike."
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createMaze8(world: WorldModel): IFEntity {
  const room = world.createEntity('Maze', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Maze',
    aliases: ['maze', 'maze 8', 'maze8'],
    description: 'You are in a maze of twisty little passages, all alike.',
    properName: false,
    article: 'the'
  }));

  return room;
}
