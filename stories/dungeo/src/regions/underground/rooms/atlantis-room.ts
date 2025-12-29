/**
 * Atlantis Room
 * Accessible from Cave when mirror has been rubbed an odd number of times.
 *
 * Connections per map-connections.md:
 * - SE: Reservoir North
 * - U: Cave
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createAtlantisRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Atlantis Room', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Atlantis Room',
    aliases: ['atlantis room', 'atlantis'],
    description: 'This is a large room with a floor of sand. In the center of the room is a large seashell. The walls are covered with strange writings.',
    properName: true,
    article: 'the'
  }));

  return room;
}
