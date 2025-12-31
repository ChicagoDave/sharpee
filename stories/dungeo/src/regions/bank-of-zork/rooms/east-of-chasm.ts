/**
 * East of Chasm - Entry point to Bank of Zork area
 *
 * The eastern approach to the great chasm that separates
 * this part of the dungeon from the Bank of Zork.
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createEastOfChasm(world: WorldModel): IFEntity {
  const room = world.createEntity('East of Chasm', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'East of Chasm',
    aliases: ['east of chasm', 'chasm east'],
    description: 'You are on the east edge of a great chasm. A wooden bridge once spanned the gap, but it has long since collapsed. Far below, you can hear the faint sound of rushing water. A narrow ledge runs along the north wall of the chasm.',
    properName: true,
    article: 'the'
  }));
  return room;
}
