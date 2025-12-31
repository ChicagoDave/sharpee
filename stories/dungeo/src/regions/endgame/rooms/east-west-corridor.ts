/**
 * East-West Corridor - Main corridor near the parapet
 *
 * Dungeon message #711: Large east-west corridor with parapet to north.
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createEastWestCorridor(world: WorldModel): IFEntity {
  const room = world.createEntity('East-West Corridor', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: false,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'East-West Corridor',
    aliases: ['east-west corridor', 'e-w corridor', 'corridor'],
    // Dungeon message #711
    description: 'This is a large east-west corridor which opens out to a northern parapet at its center. You can see flames and smoke as you peer towards the parapet. The corridor turns south at its east and west ends, and due south is a massive wooden door. In the door is a small window barred with iron.',
    properName: false,
    article: 'the'
  }));

  return room;
}
