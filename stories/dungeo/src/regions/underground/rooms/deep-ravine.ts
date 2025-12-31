/**
 * Deep Ravine
 *
 * A deep chasm in the underground. Connects E/W Passage to Rocky Crawl and Chasm.
 * Per map-connections.md: S→E/W Passage, W→Rocky Crawl, E→Chasm
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createDeepRavine(world: WorldModel): IFEntity {
  const room = world.createEntity('Deep Ravine', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Deep Ravine',
    aliases: ['deep ravine', 'ravine'],
    description: 'You are on the south edge of a deep ravine. Heavy wooden beams have been placed across the ravine to form a precarious bridge.',
    properName: true,
    article: 'the'
  }));

  return room;
}
