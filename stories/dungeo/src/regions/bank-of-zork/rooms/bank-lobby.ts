/**
 * Bank Lobby - Main hall of the Bank of Zork
 *
 * The central hub of the bank with teller windows
 * on either side.
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createBankLobby(world: WorldModel): IFEntity {
  const room = world.createEntity('Bank Lobby', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: false, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'Bank Lobby',
    aliases: ['bank lobby', 'lobby', 'main hall'],
    description: 'You are in the main lobby of the Bank of Zork. Teller windows line the east and west walls, though they have long been abandoned. Dust covers the once-polished marble floor. A velvet rope blocks access to the south, where a sign reads "Employees Only". The entrance is to the north.',
    properName: true,
    article: 'the'
  }));
  return room;
}
