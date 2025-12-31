/**
 * Chasm (North-South Passage area)
 * "A chasm runs southwest to northeast. You are on the south edge;
 * the path exits to the south and to the east."
 *
 * This is different from the Bank of Zork chasm.
 *
 * Connections per map-connections.md:
 * - S: North-South Passage
 * - E: (another passage - to be determined)
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createChasm(world: WorldModel): IFEntity {
  const room = world.createEntity('Chasm', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Chasm',
    aliases: ['chasm', 'the chasm'],
    description: 'A chasm runs southwest to northeast. You are on the south edge; the path exits to the south and to the east.',
    properName: true,
    article: 'the'
  }));

  return room;
}
