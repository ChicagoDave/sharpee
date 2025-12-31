/**
 * Slide Ledge - Small ledge off the slide
 *
 * U: Slide-2 (can climb back up?)
 * S: Sooty Room
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createSlideLedge(world: WorldModel): IFEntity {
  const room = world.createEntity('Slide Ledge', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'Slide Ledge',
    aliases: ['slide ledge', 'ledge'],
    description: 'You are on a small ledge beside a steep slide. The ledge is barely wide enough to stand on. A passage leads south.',
    properName: true,
    article: 'the'
  }));
  return room;
}
