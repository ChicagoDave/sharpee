/**
 * Mirror Room
 * "You are in a large square room with tall ceilings. On the south wall
 * is an enormous mirror which fills the entire wall. There are exits
 * on the other three sides of the room."
 *
 * The mirror can be rubbed - even/odd rubs change where the Cave leads.
 *
 * Connections per map-connections.md:
 * - N: Narrow Crawlway
 * - W: Winding Passage
 * - E: Cave
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createMirrorRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Mirror Room', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Mirror Room',
    aliases: ['mirror room', 'room with mirror'],
    description: 'You are in a large square room with tall ceilings. On the south wall is an enormous mirror which fills the entire wall. There are exits on the other three sides of the room.',
    properName: true,
    article: 'the'
  }));

  return room;
}
