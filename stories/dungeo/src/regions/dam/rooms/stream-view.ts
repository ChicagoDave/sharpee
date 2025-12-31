/**
 * Stream View - Passage connecting Reservoir South to Glacier Room
 *
 * Contains braided wire for the balloon puzzle.
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createStreamView(world: WorldModel): IFEntity {
  const room = world.createEntity('Stream View', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Stream View',
    aliases: ['stream view'],
    description: 'You are standing in a small chamber carved from the rock. A narrow passage leads north, and a wider passage leads east.',
    properName: true,
    article: 'the'
  }));

  return room;
}
