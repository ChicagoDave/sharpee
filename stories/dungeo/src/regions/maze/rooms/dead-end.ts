/**
 * Dead End
 * "You have come to a dead end in the maze."
 *
 * Contains the skeleton of a previous adventurer, along with
 * a bag of coins and a skeleton key.
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createDeadEnd(world: WorldModel): IFEntity {
  const room = world.createEntity('Dead End', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Dead End',
    aliases: ['dead end'],
    description: 'You have come to a dead end in the maze.',
    properName: true,
    article: 'the'
  }));

  return room;
}
