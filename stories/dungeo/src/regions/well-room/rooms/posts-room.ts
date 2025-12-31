/**
 * Posts Room - A room with wooden posts
 *
 * The posts appear to support the ceiling.
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createPostsRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Posts Room', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'Posts Room',
    aliases: ['posts room', 'post room'],
    description: 'You are in a large chamber supported by numerous wooden posts. The posts are ancient and worn, but still sturdy enough to hold up the ceiling. The floor is packed earth.',
    properName: true,
    article: 'the'
  }));
  return room;
}
