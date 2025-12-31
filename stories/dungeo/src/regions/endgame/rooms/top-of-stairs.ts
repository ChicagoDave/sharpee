/**
 * Top of Stairs - Endgame arrival point
 *
 * This is where players arrive after INCANT or the Crypt trigger.
 * Dungeon message #606: "This is a room with an exit on the west side,
 * and a staircase leading up."
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createTopOfStairs(world: WorldModel): IFEntity {
  const room = world.createEntity('Top of Stairs', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: false, // Endgame has ambient light
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Top of Stairs',
    aliases: ['top of stairs', 'stairs'],
    // Dungeon message #606
    description: 'This is a room with an exit on the west side, and a staircase leading up.',
    properName: false,
    article: 'the'
  }));

  // Register this room ID for INCANT teleport
  world.setStateValue('endgame.topOfStairsId', room.id);

  return room;
}
