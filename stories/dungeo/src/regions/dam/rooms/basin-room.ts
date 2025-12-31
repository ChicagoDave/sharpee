/**
 * Basin Room - ADR-078 Thief's Canvas Puzzle
 *
 * A dark chamber containing an ancient stone basin.
 * Connected via narrow crack E from Temple Dead End 2.
 * Part of the ghost ritual to obtain Thief's Canvas.
 *
 * Basin states:
 * - 'normal': Default state
 * - 'disarmed': Incense is burning, trap is disarmed
 * - 'blessed': Water has been blessed via PRAY action
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createBasinRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Basin Room', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Basin Room',
    aliases: ['basin room', 'basin'],
    description: 'This is clearly a room of spiritual darkness. An aura of suffering pervades the chamber, centered on a carved stone basin surrounded by gargoyles and serpents. A narrow crack leads west.',
    properName: true,
    article: 'the'
  }));

  // Basin state for the ritual puzzle
  (room as any).basinState = 'normal';

  return room;
}
