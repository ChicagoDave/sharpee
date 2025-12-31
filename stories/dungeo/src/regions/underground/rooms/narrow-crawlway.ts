/**
 * Narrow Crawlway
 * "This is a narrow crawlway. The crawlway leads from north to south.
 * However the south passage divides to the south and southwest."
 *
 * Connections per map-connections.md:
 * - SW: Mirror Room
 * - N: Grail Room
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createNarrowCrawlway(world: WorldModel): IFEntity {
  const room = world.createEntity('Narrow Crawlway', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Narrow Crawlway',
    aliases: ['narrow crawlway', 'crawlway'],
    description: 'This is a narrow crawlway. The crawlway leads from north to south. However the south passage divides to the south and southwest.',
    properName: true,
    article: 'the'
  }));

  return room;
}
