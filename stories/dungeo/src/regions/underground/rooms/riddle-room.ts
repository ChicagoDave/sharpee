/**
 * Riddle Room
 * "This is a room which is bare on all sides. There is an exit down.
 * To the east is a great door made of stone."
 *
 * The riddle: "What is tall as a house, round as a cup,
 * and all the king's horses can't draw it up?"
 * Answer: "a well"
 *
 * Connections per map-connections.md:
 * - D: Engravings Cave
 * - E: (through stone door when riddle solved)
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createRiddleRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Riddle Room', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Riddle Room',
    aliases: ['riddle room'],
    description: `This is a room which is bare on all sides. There is an exit down. To the east is a great door made of stone. Above the stone, the following words are written: 'No man shall enter this room without solving this riddle:

What is tall as a house,
round as a cup,
and all the king's horses can't draw it up?'

(Reply via 'ANSWER "answer"')`,
    properName: true,
    article: 'the'
  }));

  // Riddle solved state
  (room as any).riddleSolved = false;

  return room;
}
