/**
 * Forest Path 1 - North of the house
 * "This is a path winding through a dimly lit forest. The path heads
 * north-south here. One particularly large tree with some low branches
 * stands at the side of the path."
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createForestPath1(world: WorldModel): IFEntity {
  const room = world.createEntity('Forest Path', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: false,
    isOutdoors: true
  }));

  room.add(new IdentityTrait({
    name: 'Forest Path',
    aliases: ['forest path', 'forest path 1', 'path', 'forest'],
    description: 'This is a path winding through a dimly lit forest. The path heads north-south here. One particularly large tree with some low branches stands at the side of the path.',
    properName: true,
    article: ''
  }));

  return room;
}
