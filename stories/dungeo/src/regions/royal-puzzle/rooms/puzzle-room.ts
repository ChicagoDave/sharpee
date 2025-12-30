/**
 * Puzzle Room (Royal Puzzle Entrance)
 *
 * The entry chamber above the Royal Puzzle. A hole in the floor leads
 * down into the sliding block puzzle.
 *
 * Connections:
 * - U: Square Room
 * - D: Room in a Puzzle (the sliding block puzzle)
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createPuzzleRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Puzzle Room', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Puzzle Room',
    aliases: ['puzzle room', 'royal puzzle entrance', 'puzzle entrance'],
    description: 'This is a small room with a hole in the floor. Through the hole, you can see a sandstone room below.',
    properName: true,
    article: 'the'
  }));

  return room;
}
