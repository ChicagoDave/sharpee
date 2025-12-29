/**
 * South of House
 * "You are facing the south side of a white house. There is no door here, and all the
 * windows are boarded."
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createSouthOfHouse(world: WorldModel): IFEntity {
  const room = world.createEntity('South of House', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: false,
    isOutdoors: true
  }));

  room.add(new IdentityTrait({
    name: 'South of House',
    aliases: ['south of house', 'south side'],
    description: 'You are facing the south side of a white house. There is no door here, and all the windows are boarded.',
    properName: true,
    article: ''
  }));

  return room;
}
