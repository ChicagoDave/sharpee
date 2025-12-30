/**
 * Ancient Chasm
 *
 * A vast underground chasm east of the Loud Room.
 * Per map-connections.md: S→Loud Room, W→Dead End-1, N→Dead End-2, E→Small Cave
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createAncientChasm(world: WorldModel): IFEntity {
  const room = world.createEntity('Ancient Chasm', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Ancient Chasm',
    aliases: ['ancient chasm', 'chasm'],
    description: 'You are in an ancient chasm. The walls show signs of having been worked by hand long ago. Passages lead in several directions.',
    properName: true,
    article: 'the'
  }));

  return room;
}
