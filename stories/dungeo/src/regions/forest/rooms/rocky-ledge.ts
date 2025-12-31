/**
 * Rocky Ledge
 * "You are on a ledge about halfway up the wall of the river canyon.
 * You can see from here that the path continues from the bottom of
 * the canyon up to the cliff above. There is a small path going down."
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createRockyLedge(world: WorldModel): IFEntity {
  const room = world.createEntity('Rocky Ledge', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: false,
    isOutdoors: true
  }));

  room.add(new IdentityTrait({
    name: 'Rocky Ledge',
    aliases: ['rocky ledge', 'ledge'],
    description: 'You are on a ledge about halfway up the wall of the river canyon. You can see from here that the path continues from the bottom of the canyon up to the cliff above. There is a small path going down.',
    properName: true,
    article: ''
  }));

  return room;
}
