/**
 * Attic
 * "This is the attic. The only exit is a stairway leading down. A large
 * coil of rope is lying in the corner. On a table is a nasty-looking knife."
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createAttic(world: WorldModel): IFEntity {
  const room = world.createEntity('Attic', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: false,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Attic',
    aliases: ['attic', 'loft'],
    description: 'This is the attic. The only exit is a stairway leading down. A large coil of rope is lying in the corner. On a table is a nasty-looking knife.',
    properName: true,
    article: 'the'
  }));

  return room;
}
