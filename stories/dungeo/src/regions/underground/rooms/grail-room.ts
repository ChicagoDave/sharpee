/**
 * Grail Room
 * "You are standing in a small circular room with a pedestal.
 * A set of stairs leads up, and passages leave to the east and west."
 *
 * Contains the Holy Grail treasure.
 *
 * Connections per map-connections.md:
 * - W: Round Room
 * - U: Temple
 * - E: Narrow Crawlway
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createGrailRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Grail Room', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Grail Room',
    aliases: ['grail room', 'circular room with pedestal'],
    description: 'You are standing in a small circular room with a pedestal. A set of stairs leads up, and passages leave to the east and west.',
    properName: true,
    article: 'the'
  }));

  return room;
}
