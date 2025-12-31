/**
 * Temple - Main temple entrance
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createTemple(world: WorldModel): IFEntity {
  const room = world.createEntity('Temple', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Temple',
    aliases: ['temple', 'ancient temple'],
    description: 'This is the interior of an ancient temple. The walls are covered with hieroglyphics depicting strange rituals. Passages lead south and east, and a dark corridor leads north.',
    properName: true,
    article: 'the'
  }));

  return room;
}
