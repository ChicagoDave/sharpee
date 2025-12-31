/**
 * Slide-3 - Bottom section of the slide
 *
 * U: Slide-2 (blocked - too steep to climb)
 * D: Cellar (one-way exit)
 * E: Slide Ledge
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createSlide3(world: WorldModel): IFEntity {
  const room = world.createEntity('Slide', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'Slide',
    aliases: ['slide', 'chute'],
    description: 'You are at the bottom of a long slide. There is a small ledge to the east where you might be able to stop. Otherwise, you will continue sliding down into the depths below.',
    properName: true,
    article: 'the'
  }));
  return room;
}
