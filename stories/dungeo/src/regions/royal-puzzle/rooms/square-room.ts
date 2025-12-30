/**
 * Square Room
 *
 * A small square room east of the Treasure Room, with stairs leading
 * down to the Royal Puzzle entrance.
 *
 * Connections:
 * - W: Treasure Room
 * - D: Puzzle Room (Royal Puzzle entrance)
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createSquareRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Square Room', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Square Room',
    aliases: ['square room', 'small square room'],
    description: 'This is a small square room, with passages leading west and down.',
    properName: true,
    article: 'the'
  }));

  return room;
}
