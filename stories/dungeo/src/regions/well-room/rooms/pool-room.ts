/**
 * Pool Room - A room with an underground pool
 *
 * The pool is fed by an underground stream.
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createPoolRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Pool Room', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'Pool Room',
    aliases: ['pool room'],
    description: 'You are in a damp chamber containing a pool of clear water. The pool is fed by a small stream that emerges from a crack in the north wall. The water looks clean but cold.',
    properName: true,
    article: 'the'
  }));
  return room;
}
