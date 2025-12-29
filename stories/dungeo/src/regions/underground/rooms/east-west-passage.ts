/**
 * East-West Passage
 * "You are in a passage which continues to the east and west."
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createEastWestPassage(world: WorldModel): IFEntity {
  const room = world.createEntity('East-West Passage', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'East-West Passage',
    aliases: ['passage', 'e/w passage', 'ew passage'],
    description: 'You are in a passage which continues to the east and west.',
    properName: true,
    article: 'the'
  }));

  return room;
}
