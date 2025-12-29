/**
 * Dam Base - Below the dam, river access point
 * @see ./dam-base.md for full documentation
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createDamBase(world: WorldModel): IFEntity {
  const room = world.createEntity('Dam Base', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: false,
    isOutdoors: true
  }));

  room.add(new IdentityTrait({
    name: 'Dam Base',
    aliases: ['dam base', 'base of dam', 'below dam'],
    description: 'You are at the base of Flood Control Dam #3, which looms above you. The river flows by here.',
    properName: true,
    article: 'the'
  }));

  return room;
}
