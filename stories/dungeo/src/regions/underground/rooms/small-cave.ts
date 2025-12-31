/**
 * Small Cave - Cave above Atlantis Room
 *
 * Connects to Mirror Room (Coal Mine state) to the south.
 * Down leads to Atlantis Room.
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createSmallCave(world: WorldModel): IFEntity {
  const room = world.createEntity('Small Cave', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'Small Cave',
    aliases: ['small cave', 'cave'],
    description: 'You are in a small cave with rough stone walls. A passage leads south, and there is a way down.',
    properName: true,
    article: 'the'
  }));
  return room;
}
