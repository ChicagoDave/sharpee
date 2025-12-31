/**
 * Winding Passage
 * "This is a winding passage. It seems that there is only an exit on the east end
 * although the whirring from the round room can be heard faintly to the north."
 *
 * Connections per map-connections.md:
 * - E: Mirror Room
 * - N: Narrow Crawlway (per play output, actually leads to Round Room area)
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createWindingPassage(world: WorldModel): IFEntity {
  const room = world.createEntity('Winding Passage', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Winding Passage',
    aliases: ['winding passage'],
    description: 'This is a winding passage. It seems that there is only an exit on the east end although the whirring from the round room can be heard faintly to the north.',
    properName: true,
    article: 'the'
  }));

  return room;
}
