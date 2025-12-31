/**
 * Small Room - Contains the laser beam puzzle
 *
 * Dungeon message #703-704: A narrow red beam of light crosses the room.
 * Drop the sword here to break the beam and enable the button in Stone Room.
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createSmallRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Small Room', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: false,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Small Room',
    aliases: ['small room', 'beam room', 'laser room'],
    // Dungeon message #703 - description updated dynamically based on beam state
    description: 'This is a small room, with narrow passages exiting to the north and south. A narrow red beam of light crosses the room at the north end, inches above the floor.',
    properName: false,
    article: 'the'
  }));

  // Track laser beam state
  world.setStateValue('endgame.laserBeamActive', true);

  return room;
}
