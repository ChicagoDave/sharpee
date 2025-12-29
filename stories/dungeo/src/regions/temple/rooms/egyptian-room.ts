/**
 * Egyptian Room - Tomb with coffin
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createEgyptianRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Egyptian Room', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Egyptian Room',
    aliases: ['egyptian room', 'tomb'],
    description: 'This room is decorated in an ancient Egyptian style. The walls are covered with paintings of the afterlife. In the center of the room stands an ornate gold coffin. Passages lead north and east.',
    properName: true,
    article: 'the'
  }));

  return room;
}
