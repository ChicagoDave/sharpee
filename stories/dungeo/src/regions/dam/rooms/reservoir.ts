/**
 * Reservoir - Contains trunk of jewels when drained
 * @see ./reservoir.md for full documentation
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createReservoir(world: WorldModel): IFEntity {
  const room = world.createEntity('Reservoir', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: false,
    isOutdoors: true
  }));

  room.add(new IdentityTrait({
    name: 'Reservoir',
    aliases: ['reservoir', 'lake'],
    description: 'You are on what used to be a large reservoir, now drained. The muddy bottom is exposed, and you can see various objects that were once submerged.',
    properName: true,
    article: 'the'
  }));

  // Note: Access depends on dam state - when full, requires boat
  // Description should change based on dam state (TODO)

  return room;
}
