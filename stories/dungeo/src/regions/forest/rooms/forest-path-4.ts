/**
 * Forest Path 4 - Edge of forest near maze
 * "You are on a twisting path through a dense forest. The path splits here."
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createForestPath4(world: WorldModel): IFEntity {
  const room = world.createEntity('Twisting Path', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: false,
    isOutdoors: true
  }));

  room.add(new IdentityTrait({
    name: 'Twisting Path',
    aliases: ['twisting path', 'path', 'forest path'],
    description: 'You are on a twisting path through a dense forest. The path splits here.',
    properName: true,
    article: ''
  }));

  return room;
}
