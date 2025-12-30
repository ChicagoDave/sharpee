/**
 * Temple Small Cave
 *
 * A small cave east of the Ancient Chasm, leading to Rocky Shore.
 * Per map-connections.md: NW→Ancient Chasm, S→Rocky Shore
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createTempleSmallCave(world: WorldModel): IFEntity {
  const room = world.createEntity('Small Cave', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Small Cave',
    aliases: ['small cave', 'cave'],
    description: 'You are in a small cave. A passage leads northwest, and you can hear the sound of rushing water to the south.',
    properName: true,
    article: 'a'
  }));

  return room;
}
