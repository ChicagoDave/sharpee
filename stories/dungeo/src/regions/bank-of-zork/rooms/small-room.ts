/**
 * Small Room - Behind the curtain in the viewing room
 *
 * A hidden alcove behind the velvet curtain.
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createSmallRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Small Room', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: false, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'Small Room',
    aliases: ['small room', 'alcove', 'behind curtain'],
    description: 'You are in a small alcove behind the velvet curtain. This appears to have been a secret storage area. The curtain leads back north to the viewing room.',
    properName: true,
    article: 'the'
  }));
  return room;
}
