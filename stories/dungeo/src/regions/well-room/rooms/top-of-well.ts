/**
 * Top of Well - Upper chamber of the well
 *
 * Contains the bucket mechanism. Bucket can descend to Well Bottom
 * when water is removed (fill bottle from bucket).
 * Leads east to Tea Room.
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createTopOfWell(world: WorldModel): IFEntity {
  const room = world.createEntity('Top of Well', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'Top of Well',
    aliases: ['top of well', 'well top'],
    description: 'You are at the top of a deep well. A wooden bucket is attached to a rope wound around a windlass. A passage leads east.',
    properName: true,
    article: 'the'
  }));
  return room;
}
