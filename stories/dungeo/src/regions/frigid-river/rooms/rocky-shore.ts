/**
 * Rocky Shore - A rocky section of shoreline
 *
 * Below the falls, accessible by boat.
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createRockyShore(world: WorldModel): IFEntity {
  const room = world.createEntity('Rocky Shore', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: false, isOutdoors: true }));
  room.add(new IdentityTrait({
    name: 'Rocky Shore',
    aliases: ['rocky shore', 'rocks', 'rocky beach'],
    description: 'You are on a rocky shore at the base of Aragain Falls. The spray from the falls keeps everything perpetually wet. The thundering water makes it hard to think. A cave entrance is visible in the cliff face.',
    properName: true,
    article: 'the'
  }));
  return room;
}
