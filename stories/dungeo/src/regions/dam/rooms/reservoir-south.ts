/**
 * Reservoir South - Southern shore of the reservoir
 * @see ./reservoir-south.md for full documentation
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createReservoirSouth(world: WorldModel): IFEntity {
  const room = world.createEntity('Reservoir South', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: false,
    isOutdoors: true
  }));

  room.add(new IdentityTrait({
    name: 'Reservoir South',
    aliases: ['reservoir south', 'south shore', 'southern shore'],
    description: 'You are on the southern shore of a large reservoir. The water extends north as far as you can see. A path leads south.',
    properName: true,
    article: ''
  }));

  return room;
}
