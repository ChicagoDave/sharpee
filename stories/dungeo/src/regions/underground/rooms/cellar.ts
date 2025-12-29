/**
 * Cellar
 * "You are in a dark and damp cellar with a narrow passageway leading
 * north, and a crawlway to the south. On the west is the bottom of a
 * steep metal ramp which is unclimbable."
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createCellar(world: WorldModel): IFEntity {
  const room = world.createEntity('Cellar', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,  // Dark room - needs lantern
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Cellar',
    aliases: ['cellar', 'basement'],
    description: 'You are in a dark and damp cellar with a narrow passageway leading north, and a crawlway to the south. On the west is the bottom of a steep metal ramp which is unclimbable.',
    properName: true,
    article: 'the'
  }));

  return room;
}
