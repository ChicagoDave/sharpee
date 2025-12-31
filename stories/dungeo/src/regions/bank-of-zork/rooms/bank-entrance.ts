/**
 * Bank Entrance - Entry to the Bank of Zork
 *
 * The ornate entrance to the famous Bank of Zork,
 * one of the GUE's premier financial institutions.
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createBankEntrance(world: WorldModel): IFEntity {
  const room = world.createEntity('Bank Entrance', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: false, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'Bank Entrance',
    aliases: ['bank entrance', 'entrance'],
    description: 'You are in the grand entrance hall of the Bank of Zork. Marble columns rise to a vaulted ceiling decorated with gold leaf. A brass plaque on the wall reads "BANK OF ZORK - Securing Your Treasures Since 668 GUE". The main lobby lies to the south.',
    properName: true,
    article: 'the'
  }));
  return room;
}
