/**
 * Reservoir North - North end of the Reservoir
 *
 * Connects to Atlantis Room to the north (via underwater passage when drained).
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createReservoirNorth(world: WorldModel): IFEntity {
  const room = world.createEntity('Reservoir North', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Reservoir North',
    aliases: ['reservoir north', 'north reservoir'],
    description: 'You are at the north end of a large reservoir. A passage leads north into darkness, and the reservoir extends to the south.',
    properName: true,
    article: 'the'
  }));

  return room;
}
