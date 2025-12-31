/**
 * Library - Contains purple book with flathead stamp
 *
 * Connects to Narrow Ledge (W)
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createLibrary(world: WorldModel): IFEntity {
  const room = world.createEntity('Library', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'Library',
    aliases: ['library'],
    description: 'This room was clearly once a library, though most of the books have long since rotted away. A few stone shelves line the walls. A passage leads west to a ledge.',
    properName: true,
    article: 'the'
  }));
  return room;
}
