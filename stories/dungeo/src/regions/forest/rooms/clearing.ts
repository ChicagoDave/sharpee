/**
 * Clearing
 * "You are in a clearing, with a forest surrounding you on all sides.
 * A path leads south. On the ground is a pile of leaves."
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createClearing(world: WorldModel): IFEntity {
  const room = world.createEntity('Clearing', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: false,
    isOutdoors: true
  }));

  room.add(new IdentityTrait({
    name: 'Clearing',
    aliases: ['clearing', 'forest clearing'],
    description: 'You are in a clearing, with a forest surrounding you on all sides. A path leads south. On the ground is a pile of leaves.',
    properName: true,
    article: 'the'
  }));

  return room;
}
