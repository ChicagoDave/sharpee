/**
 * Flood Control Dam #3 - Top of the dam, key location
 * @see ./dam.md for full documentation
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createDam(world: WorldModel): IFEntity {
  const room = world.createEntity('Dam', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: false, // Outdoors, on top of dam
    isOutdoors: true
  }));

  room.add(new IdentityTrait({
    name: 'Dam',
    aliases: ['dam', 'flood control dam', 'dam top'],
    description: 'You are standing on the top of Flood Control Dam #3, which was quite a tourist attraction in times far distant. There are paths to the north, south, and east, and a steep pathway leads down.',
    properName: false,
    article: ''
  }));

  // Dam state - controls whether water is flowing or stopped
  (room as any).damOpen = false; // false = closed, water held back

  return room;
}
