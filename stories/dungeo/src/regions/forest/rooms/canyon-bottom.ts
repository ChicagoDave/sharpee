/**
 * Canyon Bottom
 * "You are beneath the walls of the river canyon which may be
 * climbed here. The canyon runs north-south along the river. You
 * can see the massive walls of the White Cliffs rising to the east."
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createCanyonBottom(world: WorldModel): IFEntity {
  const room = world.createEntity('Canyon Bottom', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: false,
    isOutdoors: true
  }));

  room.add(new IdentityTrait({
    name: 'Canyon Bottom',
    aliases: ['canyon bottom', 'bottom of canyon'],
    description: 'You are beneath the walls of the river canyon which may be climbed here. The canyon runs north-south along the river. You can see the massive walls of the White Cliffs rising to the east.',
    properName: true,
    article: ''
  }));

  return room;
}
