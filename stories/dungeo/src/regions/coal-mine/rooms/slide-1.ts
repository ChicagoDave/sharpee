/**
 * Slide-1 - First section of the slide
 *
 * U: Slide Room (blocked - too steep to climb)
 * D: Slide-2
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createSlide1(world: WorldModel): IFEntity {
  const room = world.createEntity('Slide', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'Slide',
    aliases: ['slide', 'chute'],
    description: 'You are on a steep slide, sliding downward. The walls are too smooth to grab onto. You continue to slide down...',
    properName: true,
    article: 'the'
  }));
  return room;
}
