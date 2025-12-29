/**
 * Loud Room - Echo puzzle room connecting Round Room to Dam area
 * @see ./loud-room.md for full documentation
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createLoudRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Loud Room', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Loud Room',
    aliases: ['loud room', 'echo room'],
    description: 'This is a large room with a ceiling which cannot be detected from the ground. There is a narrow passage from east to west and a stone stairway leading upward. The room has an unusual acoustic quality.',
    properName: true,
    article: 'the'
  }));

  // Puzzle state - has the echo puzzle been solved/triggered?
  (room as any).echoSolved = false;

  return room;
}
