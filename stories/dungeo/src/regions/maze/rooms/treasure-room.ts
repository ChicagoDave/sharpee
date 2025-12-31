/**
 * Treasure Room
 * "This is a large room, whose north wall is solid marble. A doorway
 * leads south, and a narrow chimney leads up."
 *
 * This is the Thief's lair. The thief stores stolen treasures here.
 * NPC behavior to be added later (ADR-070).
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createTreasureRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Treasure Room', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Treasure Room',
    aliases: ['treasure room', 'thief lair', 'thiefs lair'],
    description: 'This is a large room, whose north wall is solid marble. A doorway leads south, and a narrow chimney leads up.',
    properName: true,
    article: 'the'
  }));

  return room;
}
