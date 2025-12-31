/**
 * Steep Crawlway - Steep passage near Mirror Room
 *
 * S: Mirror Room (Coal Mine state)
 * SW: Cold Passage
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createSteepCrawlway(world: WorldModel): IFEntity {
  const room = world.createEntity('Steep Crawlway', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'Steep Crawlway',
    aliases: ['steep crawlway', 'crawlway', 'steep passage'],
    description: 'You are in a steep, narrow crawlway. The passage slopes steeply here, making movement difficult.',
    properName: true,
    article: 'the'
  }));
  return room;
}
