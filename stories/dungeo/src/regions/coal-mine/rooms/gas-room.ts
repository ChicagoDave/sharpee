/**
 * Gas Room - Dangerous area with flammable gas
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createGasRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Gas Room', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Gas Room',
    aliases: ['gas room', 'smelly room'],
    description: 'This room has a strong, unpleasant smell. The air feels heavy and slightly nauseating. It would be very dangerous to bring an open flame here. Passages lead north and east.',
    properName: true,
    article: 'the'
  }));

  // Mark this room as having flammable gas
  (room as any).hasGas = true;

  return room;
}
