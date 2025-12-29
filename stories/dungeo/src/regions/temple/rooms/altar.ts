/**
 * Altar - Ceremonial altar room
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createAltar(world: WorldModel): IFEntity {
  const room = world.createEntity('Altar', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Altar',
    aliases: ['altar', 'altar room'],
    description: 'This is a small chamber dominated by a massive stone altar. The altar is inscribed with ancient runes that seem to glow faintly. A passage leads west, and stone steps lead down into darkness.',
    properName: true,
    article: 'the'
  }));

  return room;
}
