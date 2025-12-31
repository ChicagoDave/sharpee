/**
 * Slide Room - Top of the slide that leads down to Cellar
 *
 * D: Slide-1 (one-way slide begins)
 * E: Cold Passage
 * N: Mine Entrance
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createSlideRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Slide Room', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'Slide Room',
    aliases: ['slide room', 'room'],
    description: 'You are in a room with a steep slide leading down into darkness. The slide appears to be one-way - once you go down, there may be no coming back up. Passages lead north and east.',
    properName: true,
    article: 'the'
  }));
  return room;
}
