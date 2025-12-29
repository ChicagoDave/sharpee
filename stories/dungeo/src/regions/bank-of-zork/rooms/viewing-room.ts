/**
 * Viewing Room - A room with curtains for private viewing
 *
 * Customers would come here to examine their valuables in private.
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createViewingRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Viewing Room', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: false, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'Viewing Room',
    aliases: ['viewing room', 'viewing'],
    description: 'You are in a small viewing room where bank customers could examine their valuables in private. A heavy velvet curtain hangs on the south wall. The exit is to the north.',
    properName: true,
    article: 'the'
  }));
  return room;
}
