/**
 * Dungeon Entrance - Where the Dungeon Master asks trivia questions
 *
 * Dungeon message #709: North-south hallway with large wooden door.
 * The Dungeon Master appears at the door and asks 3 trivia questions.
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createDungeonEntrance(world: WorldModel): IFEntity {
  const room = world.createEntity('Dungeon Entrance', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: false,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Dungeon Entrance',
    aliases: ['dungeon entrance', 'entrance'],
    // Dungeon message #709 + #710
    description: 'This is a north-south hallway which ends in a large wooden door. The wooden door has a barred panel in it at about head height.',
    properName: false,
    article: 'the'
  }));

  // Trivia state
  world.setStateValue('trivia.questionsAnswered', 0);
  world.setStateValue('trivia.wrongAttempts', 0);
  world.setStateValue('trivia.currentQuestion', -1); // -1 means not started

  return room;
}
