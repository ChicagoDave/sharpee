/**
 * Forest Path 2 - Another section of forest
 * "This is a dimly lit forest, with large trees all around."
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createForestPath2(world: WorldModel): IFEntity {
  const room = world.createEntity('Forest', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: false,
    isOutdoors: true
  }));

  room.add(new IdentityTrait({
    name: 'Forest',
    aliases: ['forest', 'woods', 'trees'],
    description: 'This is a dimly lit forest, with large trees all around.',
    properName: true,
    article: 'the'
  }));

  return room;
}
