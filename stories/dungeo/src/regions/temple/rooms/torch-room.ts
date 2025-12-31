/**
 * Torch Room - Contains the ivory torch
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createTorchRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Torch Room', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Torch Room',
    aliases: ['torch room'],
    description: 'This small chamber appears to have been used for ceremonial lighting. Sconces line the walls, though most are empty. Passages lead west and south.',
    properName: true,
    article: 'the'
  }));

  return room;
}
