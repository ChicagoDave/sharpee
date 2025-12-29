/**
 * Vault - The main bank vault
 *
 * Accessible only via walking through walls from Safety Depository.
 * Contains the zorkmid bills treasure.
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createVault(world: WorldModel): IFEntity {
  const room = world.createEntity('Vault', EntityType.ROOM);
  // NO normal exits - only accessible via walk-through-walls
  room.add(new RoomTrait({ exits: {}, isDark: false, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'Vault',
    aliases: ['vault', 'bank vault'],
    description: 'This is the Vault of the Bank of Zork, in which there are no doors.',
    properName: true,
    article: 'the'
  }));
  return room;
}
