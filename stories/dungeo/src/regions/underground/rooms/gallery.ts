/**
 * Gallery
 * "This is an art gallery. Most of the paintings have been stolen by
 * vandals with no taste in art. A doorway to the west leads through a
 * small chamber to the cellar."
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createGallery(world: WorldModel): IFEntity {
  const room = world.createEntity('Gallery', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Gallery',
    aliases: ['gallery', 'art gallery'],
    description: 'This is an art gallery. Most of the paintings have been stolen by vandals with no taste in art. A doorway to the west leads through a small chamber to the cellar.',
    properName: true,
    article: 'the'
  }));

  return room;
}
