/**
 * Tiny Room - Small chamber west of Torch Room
 *
 * Contains a locked door that requires the iron key to open.
 * The key can be obtained via the mat/screwdriver puzzle.
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createTinyRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Tiny Room', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Tiny Room',
    aliases: ['tiny room', 'small room'],
    description: 'This is a tiny room. A small door leads north, and a passage leads east.',
    properName: true,
    article: 'the'
  }));

  return room;
}
