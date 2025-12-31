/**
 * Glacier Room - Contains ice that can be melted with torch
 *
 * Throwing the torch at the glacier melts it, revealing a passage.
 * Connected to Egyptian Room (down) and Ruby Room (west).
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createGlacierRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Glacier Room', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Glacier Room',
    aliases: ['glacier room', 'icy room'],
    description: 'You are in an icy cavern. A massive glacier fills the northern part of the room, blocking any passage in that direction. Passages lead south, west, and down.',
    properName: true,
    article: 'the'
  }));

  return room;
}
