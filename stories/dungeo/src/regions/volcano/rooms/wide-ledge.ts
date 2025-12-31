/**
 * Wide Ledge - Upper volcanic ledge
 *
 * Volcano Ledge (upper) per canonical map
 * Connects to Dusty Room (E) and Volcano shaft (W)
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createWideLedge(world: WorldModel): IFEntity {
  const room = world.createEntity('Wide Ledge', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'Wide Ledge',
    aliases: ['wide ledge', 'ledge'],
    description: 'You are on a wide ledge high on the volcanic wall. The stone here is more stable than the narrow ledge below. A dusty passage leads east.',
    properName: true,
    article: 'the'
  }));
  return room;
}
