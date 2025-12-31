/**
 * Narrow Corridor - North-south corridor after the wooden door
 *
 * Dungeon message #708: Narrow north-south corridor with door.
 * Player gets 20 points when first entering this corridor.
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createNarrowCorridor(world: WorldModel): IFEntity {
  const room = world.createEntity('Narrow Corridor', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: false,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Narrow Corridor',
    aliases: ['narrow corridor', 'corridor'],
    // Dungeon message #708
    description: 'This is a narrow north-south corridor. At the south end is a door and at the north end is an east-west corridor.',
    properName: false,
    article: 'the'
  }));

  // Mark this room for 20-point award on first entry
  (room as any).awardsPointsOnEntry = 20;

  return room;
}
