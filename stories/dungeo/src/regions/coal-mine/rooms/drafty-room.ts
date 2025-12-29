/**
 * Drafty Room - Bottom of the basket elevator
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createDraftyRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Drafty Room', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Drafty Room',
    aliases: ['drafty room'],
    description: 'This is a small drafty room at the bottom of a deep shaft. There is a constant chill breeze blowing through. A rusty iron basket hangs from a chain above. Passages lead south and east.',
    properName: true,
    article: 'the'
  }));

  return room;
}
