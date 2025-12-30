/**
 * Dingy Closet
 *
 * Contains the white crystal sphere treasure, hidden under a cage.
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createDingyCloset(world: WorldModel): IFEntity {
  const room = world.createEntity('Dingy Closet', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Dingy Closet',
    aliases: ['dingy closet', 'closet'],
    description: 'This is a small, cramped closet. There is a strange metal cage in the corner with something glowing beneath it. Exits lead west and south.',
    properName: true,
    article: 'the'
  }));

  return room;
}
