/**
 * North-South Passage
 * "This is a high north-south passage, which forks to the northeast."
 *
 * Connections per map-connections.md:
 * - N: Chasm
 * - NE: Loud Room
 * - S: Round Room
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createNorthSouthPassage(world: WorldModel): IFEntity {
  const room = world.createEntity('North-South Passage', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'North-South Passage',
    aliases: ['north-south passage', 'n-s passage', 'ns passage', 'north south passage'],
    description: 'This is a high north-south passage, which forks to the northeast.',
    properName: true,
    article: 'the'
  }));

  return room;
}
