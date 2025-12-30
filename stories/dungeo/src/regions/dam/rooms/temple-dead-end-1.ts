/**
 * Temple Dead End 1
 *
 * A dead end passage west of the Ancient Chasm.
 * Per map-connections.md: E→Ancient Chasm
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createTempleDeadEnd1(world: WorldModel): IFEntity {
  const room = world.createEntity('Dead End', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Dead End',
    aliases: ['dead end'],
    description: 'You have come to a dead end in the passage.',
    properName: true,
    article: 'a'
  }));

  return room;
}
