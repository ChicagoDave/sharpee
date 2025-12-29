/**
 * Narrow Passage
 * "This is a narrow passage. The walls are damp and the air is stale."
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createNarrowPassage(world: WorldModel): IFEntity {
  const room = world.createEntity('Narrow Passage', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Narrow Passage',
    aliases: ['narrow passage', 'passage', 'tunnel'],
    description: 'This is a narrow passage. The walls are damp and the air is stale.',
    properName: true,
    article: 'the'
  }));

  return room;
}
