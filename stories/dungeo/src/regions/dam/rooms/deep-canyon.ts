/**
 * Deep Canyon - Transitional room between Loud Room and Dam area
 * @see ./deep-canyon.md for full documentation
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createDeepCanyon(world: WorldModel): IFEntity {
  const room = world.createEntity('Deep Canyon', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Deep Canyon',
    aliases: ['deep canyon', 'canyon'],
    description: 'You are on the south edge of a deep canyon. Passages lead off to the east and to the northwest. You can hear the sound of rushing water from below.',
    properName: true,
    article: 'the'
  }));

  return room;
}
