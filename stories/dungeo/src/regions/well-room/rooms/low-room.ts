/**
 * Low Room
 *
 * Contains the Robot NPC that can push buttons when commanded.
 * Connects Pool Room to the Machine Room (well area).
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createLowRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Low Room', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Low Room',
    aliases: ['low room'],
    description: 'You are in a low room with a ceiling barely five feet high. A strange mechanical device sits in the corner - a metal robot with a hinged panel on its chest. Passages lead west and northwest.',
    properName: true,
    article: 'the'
  }));

  return room;
}
