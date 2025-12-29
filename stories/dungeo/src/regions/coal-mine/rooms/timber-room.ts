/**
 * Timber Room - Mining support beams
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createTimberRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Timber Room', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Timber Room',
    aliases: ['timber room'],
    description: 'This room is supported by massive wooden beams that creak ominously. The timber looks old but sturdy. Passages lead north, west, and south.',
    properName: true,
    article: 'the'
  }));

  return room;
}
