/**
 * Rocky Crawl
 *
 * A narrow rocky passage connecting Deep Ravine to the Dome Room area.
 * Per map-connections.md: W→Deep Ravine, E→Dome Room, NW→Egyptian Room
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createRockyCrawl(world: WorldModel): IFEntity {
  const room = world.createEntity('Rocky Crawl', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Rocky Crawl',
    aliases: ['rocky crawl', 'crawl', 'crawlway'],
    description: 'This is a narrow east-west crawlway. The walls are rough and uneven, and you must proceed carefully.',
    properName: true,
    article: 'the'
  }));

  return room;
}
