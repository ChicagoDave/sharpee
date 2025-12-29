/**
 * Narrow Corridor - Connects altar to Hades
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createNarrowCorridor(world: WorldModel): IFEntity {
  const room = world.createEntity('Narrow Corridor', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Narrow Corridor',
    aliases: ['narrow corridor', 'corridor'],
    description: 'This is a narrow, winding corridor. The walls are damp and the air grows colder as you proceed. Steps lead up to the north, and the passage continues south into an eerie darkness.',
    properName: true,
    article: 'the'
  }));

  return room;
}
