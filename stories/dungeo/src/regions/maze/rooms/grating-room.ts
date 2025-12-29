/**
 * Grating Room
 * "You are in a small room near the surface. A metal grating in the
 * ceiling leads upward."
 *
 * Entry point to the maze from the Clearing above.
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createGratingRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Grating Room', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Grating Room',
    aliases: ['grating room', 'small room', 'room near surface'],
    description: 'You are in a small room near the surface. A metal grating in the ceiling leads upward.',
    properName: true,
    article: 'the'
  }));

  return room;
}
