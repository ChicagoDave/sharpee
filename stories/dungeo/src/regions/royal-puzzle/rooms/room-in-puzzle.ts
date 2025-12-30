/**
 * Room in a Puzzle
 *
 * The virtual room representing the player's position inside the
 * 8x8 Royal Puzzle grid. This single room has dynamic exits that
 * are computed based on the puzzle state.
 *
 * The puzzle state is stored on a separate controller entity.
 * Movement and push actions are handled by event handlers.
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createRoomInPuzzle(world: WorldModel): IFEntity {
  const room = world.createEntity('Room in a Puzzle', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {}, // Exits are computed dynamically by the puzzle handler
    isDark: false, // The puzzle is always lit
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Room in a Puzzle',
    aliases: ['room in puzzle', 'puzzle room', 'sandstone room'],
    description: 'You are in a maze of sandstone walls.',
    properName: true,
    article: 'the'
  }));

  return room;
}
