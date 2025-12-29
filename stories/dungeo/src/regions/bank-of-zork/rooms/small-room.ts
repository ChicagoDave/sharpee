/**
 * Small Room - Accessed via walking through the shimmering curtain
 *
 * A bare room with no normal exits - can only leave by walking through walls.
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createSmallRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Small Room', EntityType.ROOM);
  // NO normal exits - only accessible via walk-through-walls
  room.add(new RoomTrait({ exits: {}, isDark: false, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'Small Room',
    aliases: ['small room', 'bare room'],
    description: 'This is a small bare room with no distinguishing features. There are no exits from this room.',
    properName: true,
    article: 'the'
  }));
  return room;
}
