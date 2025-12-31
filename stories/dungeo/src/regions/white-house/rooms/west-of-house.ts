/**
 * West of House - The starting location
 * "You are standing in an open field west of a white house, with a boarded front door."
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createWestOfHouse(world: WorldModel): IFEntity {
  const room = world.createEntity('West of House', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: false,
    isOutdoors: true
  }));

  room.add(new IdentityTrait({
    name: 'West of House',
    aliases: ['west of house', 'field', 'open field'],
    description: 'You are standing in an open field west of a white house, with a boarded front door.',
    properName: true,
    article: ''
  }));

  return room;
}
