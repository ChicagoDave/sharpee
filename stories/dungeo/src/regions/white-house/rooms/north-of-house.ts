/**
 * North of House
 * "You are facing the north side of a white house. There is no door here, and all the
 * windows are boarded up. To the north a narrow path winds through the trees."
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createNorthOfHouse(world: WorldModel): IFEntity {
  const room = world.createEntity('North of House', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: false,
    isOutdoors: true
  }));

  room.add(new IdentityTrait({
    name: 'North of House',
    aliases: ['north of house', 'north side'],
    description: 'You are facing the north side of a white house. There is no door here, and all the windows are boarded up. To the north a narrow path winds through the trees.',
    properName: true,
    article: ''
  }));

  return room;
}
