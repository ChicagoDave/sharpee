/**
 * Pearl Room - A room containing a valuable pearl
 *
 * Named for the treasure found here.
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createPearlRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Pearl Room', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'Pearl Room',
    aliases: ['pearl room'],
    description: 'You are in a small grotto with walls that shimmer with a pearlescent sheen. The room has an otherworldly beauty to it.',
    properName: true,
    article: 'the'
  }));
  return room;
}
