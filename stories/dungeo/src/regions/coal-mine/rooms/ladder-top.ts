/**
 * Ladder Top - Top of a wooden ladder
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createLadderTop(world: WorldModel): IFEntity {
  const room = world.createEntity('Ladder Top', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Ladder Top',
    aliases: ['ladder top', 'top of ladder'],
    description: 'You are at the top of a rickety wooden ladder that descends into darkness. A passage leads north.',
    properName: true,
    article: 'the'
  }));

  return room;
}
