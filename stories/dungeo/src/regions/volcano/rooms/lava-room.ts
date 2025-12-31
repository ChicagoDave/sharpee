/**
 * Lava Room - Volcanic chamber between Ruby Room and Volcano Bottom
 *
 * A dangerous area with flowing lava. Connects the Egyptian/Ruby area
 * to the main Volcano area.
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createLavaRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Lava Room', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: false,  // Lit by lava
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Lava Room',
    aliases: ['lava room'],
    description: 'You are in a small chamber. The floor is covered with pools of molten lava, casting an eerie orange glow throughout the room. Passages lead east and south.',
    properName: true,
    article: 'the'
  }));

  return room;
}
