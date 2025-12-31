/**
 * Up a Tree
 * "You are about 10 feet above the ground nestled among some large
 * branches. The nearest branch above you is above your reach.
 * Beside you on the branch is a small bird's nest."
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createUpATree(world: WorldModel): IFEntity {
  const room = world.createEntity('Up a Tree', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: false,
    isOutdoors: true
  }));

  room.add(new IdentityTrait({
    name: 'Up a Tree',
    aliases: ['tree', 'in tree', 'up tree'],
    description: 'You are about 10 feet above the ground nestled among some large branches. The nearest branch above you is above your reach. Beside you on the branch is a small bird\'s nest.',
    properName: true,
    article: ''
  }));

  return room;
}
