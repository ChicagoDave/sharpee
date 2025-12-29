/**
 * Forest Path 3 - Dense forest
 * "The forest thins out, and the path becomes clearer."
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createForestPath3(world: WorldModel): IFEntity {
  const room = world.createEntity('Forest Path', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: false,
    isOutdoors: true
  }));

  room.add(new IdentityTrait({
    name: 'Forest Path',
    aliases: ['forest path', 'path'],
    description: 'The forest thins out, and the path becomes clearer.',
    properName: true,
    article: ''
  }));

  return room;
}
