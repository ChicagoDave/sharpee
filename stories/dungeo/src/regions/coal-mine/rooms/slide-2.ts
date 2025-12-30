/**
 * Slide-2 - Second section of the slide
 *
 * U: Slide-1 (blocked - too steep to climb)
 * D: Slide-3
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createSlide2(world: WorldModel): IFEntity {
  const room = world.createEntity('Slide', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'Slide',
    aliases: ['slide', 'chute'],
    description: 'You continue sliding down the steep chute. There is no way to stop or go back up.',
    properName: true,
    article: 'the'
  }));
  return room;
}
