/**
 * Stone Room - Contains the button for the laser puzzle
 *
 * The button only works when the laser in Small Room is broken.
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createStoneRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Stone Room', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: false,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Stone Room',
    aliases: ['stone room'],
    description: 'This is a small stone room with passages leading north and south. Set into one wall is a stone button.',
    properName: false,
    article: 'the'
  }));

  return room;
}
