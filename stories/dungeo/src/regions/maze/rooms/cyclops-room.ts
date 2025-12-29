/**
 * Cyclops Room
 * "This room has an exit on the northwest, and a staircase leading up."
 *
 * The cyclops guards this room. Players must say "Odysseus" or "Ulysses"
 * to frighten it away. NPC behavior to be added later (ADR-070).
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createCyclopsRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Cyclops Room', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Cyclops Room',
    aliases: ['cyclops room'],
    description: 'This room has an exit on the northwest, and a staircase leading up.',
    properName: true,
    article: 'the'
  }));

  return room;
}
