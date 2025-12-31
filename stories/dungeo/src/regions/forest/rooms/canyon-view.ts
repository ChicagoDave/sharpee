/**
 * Canyon View
 * "You are at the top of the Great Canyon, on its west wall. From here
 * there is a marvelous view of the canyon and parts of the Frigid River
 * upstream. Across the canyon, the walls of the White Cliffs join the
 * mighty ramparts of the Flathead Mountains to the east. Following the
 * Canyon, you can see a small path at the bottom of the canyon. There
 * is a path here which goes west into the forest."
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createCanyonView(world: WorldModel): IFEntity {
  const room = world.createEntity('Canyon View', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: false,
    isOutdoors: true
  }));

  room.add(new IdentityTrait({
    name: 'Canyon View',
    aliases: ['canyon view', 'top of canyon'],
    description: 'You are at the top of the Great Canyon, on its west wall. From here there is a marvelous view of the canyon and parts of the Frigid River upstream. Across the canyon, the walls of the White Cliffs join the mighty ramparts of the Flathead Mountains to the east. Following the Canyon, you can see a small path at the bottom of the canyon. There is a path here which goes west into the forest.',
    properName: true,
    article: ''
  }));

  return room;
}
