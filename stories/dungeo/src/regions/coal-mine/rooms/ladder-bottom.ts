/**
 * Ladder Bottom - Bottom of the wooden ladder
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createLadderBottom(world: WorldModel): IFEntity {
  const room = world.createEntity('Ladder Bottom', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Ladder Bottom',
    aliases: ['ladder bottom', 'bottom of ladder'],
    description: 'You are at the bottom of a rickety wooden ladder. A passage leads south into an area with a strange smell. You can climb up the ladder.',
    properName: true,
    article: 'the'
  }));

  return room;
}
