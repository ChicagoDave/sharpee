/**
 * Damp Cave
 * "This is a cave. Passages exit to the south and to the east,
 * but the cave narrows to a crack to the west. The earth is particularly damp here."
 *
 * Connections per play-output:
 * - S: Loud Room
 * - E: (to be determined)
 * - W: (crack - possibly leads somewhere)
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createDampCave(world: WorldModel): IFEntity {
  const room = world.createEntity('Damp Cave', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Damp Cave',
    aliases: ['damp cave'],
    description: 'This is a cave. Passages exit to the south and to the east, but the cave narrows to a crack to the west. The earth is particularly damp here.',
    properName: true,
    article: 'the'
  }));

  return room;
}
