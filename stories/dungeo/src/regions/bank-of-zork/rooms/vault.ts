/**
 * Vault - The main bank vault
 *
 * The innermost sanctum of the Bank of Zork,
 * where the most valuable deposits were kept.
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createVault(world: WorldModel): IFEntity {
  const room = world.createEntity('Vault', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: false, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'Vault',
    aliases: ['vault', 'bank vault', 'main vault'],
    description: 'You are inside the main vault of the Bank of Zork. The walls are lined with reinforced steel, and the air is stale from centuries of being sealed. Despite the security, most of the shelves stand empty, their contents presumably removed long ago. A few items remain scattered about.',
    properName: true,
    article: 'the'
  }));
  return room;
}
