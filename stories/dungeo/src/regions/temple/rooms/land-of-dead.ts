/**
 * Land of the Dead - Final area of Hades
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createLandOfDead(world: WorldModel): IFEntity {
  const room = world.createEntity('Land of the Dead', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Land of the Dead',
    aliases: ['land of dead', 'land of the dead', 'hades'],
    description: 'You have entered the Land of the Dead. The air is cold and still. Ghostly shapes drift silently in the darkness. This is not a place for the living. A faint glow emanates from the north.',
    properName: true,
    article: 'the'
  }));

  return room;
}
