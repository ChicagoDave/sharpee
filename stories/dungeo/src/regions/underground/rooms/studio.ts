/**
 * Studio
 * "This appears to have been an artist's studio. The walls are covered
 * with crude drawings of grotesque creatures. A stairway leads up, and
 * a dark chimney leads down."
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createStudio(world: WorldModel): IFEntity {
  const room = world.createEntity('Studio', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Studio',
    aliases: ['studio', 'artist studio', 'artists studio'],
    description: 'This appears to have been an artist\'s studio. The walls are covered with crude drawings of grotesque creatures. A stairway leads up, and a dark chimney leads down.',
    properName: true,
    article: 'the'
  }));

  return room;
}
